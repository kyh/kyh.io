// Turns sketches into three.js objects. A sketch's faces become one unlit
// mesh colored per vertex, pushed back a hair so ink drawn on their edges
// wins the depth test; ink becomes fat screen-space lines, one batch per
// color and weight. A built sketch repaints itself in place: in greys, or in
// its true colors while hovered, by day or by night. Everything drawn with
// these materials grows up out of the ground when the town first appears.
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import type { Material, WebGLProgramParametersWithUniforms } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { Theme, Token } from "./palette";
import type { Screen, Sign, Sketch, Vec3, Weight } from "./sketch";
import { FLOOR } from "./draw-kit";
import { shade } from "./palette";
import { RISE } from "./schedule";

/** Ink widths in CSS pixels at zoom 1. */
const WEIGHTS: Record<Weight, number> = { bold: 2.1, fine: 1.35, hair: 0.8 };

/** The slab a building stands on before it goes up, just over the curb. */
const FOOT = 0.05;

/** Where each thing being built starts going up, by its place in town (s). */
export type StartAt = (x: number, z: number) => number;

// Each building goes up from a slab on its lot, a storey at a time: the
// storey being built rises into place, and everything above waits. Its start
// rides on the geometry (`buildAt`), worked out by the town's schedule, so
// one merged mesh still goes up building by building. The ground and anything
// below it stay put; things that never go up (the sky) use materials without a schedule.
const BUILD_GLSL = `
uniform float growTime;
vec4 built(vec4 world, float at) {
  if (world.y <= ${FOOT}) {
    return world;
  }
  float floors = max(0.0, (growTime - at) * ${RISE.toFixed(1)}) / ${FLOOR};
  float level = (floor(floors) + smoothstep(0.45, 1.0, fract(floors))) * ${FLOOR};
  world.y = min(world.y, max(level, ${FOOT}));
  return world;
}
`;

const MESH_PROJECTION = "#include <project_vertex>";
const LINE_ENDS = [
  "vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );",
  "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
] as const;

/** Rewrite a material's vertex shader so its points go up as `growth` runs, each from its own start. */
const building = (shader: WebGLProgramParametersWithUniforms, growth: { value: number }) => {
  shader.uniforms.growTime = growth;
  let body = shader.vertexShader;
  if (body.includes(MESH_PROJECTION)) {
    body = `attribute float buildAt;\n${body.replace(
      MESH_PROJECTION,
      `vec4 mvPosition = viewMatrix * built(modelMatrix * vec4(transformed, 1.0), buildAt);
      gl_Position = projectionMatrix * mvPosition;`,
    )}`;
  } else {
    for (const end of LINE_ENDS) {
      const name = end.includes("instanceStart") ? "instanceStart" : "instanceEnd";
      body = body.replace(
        end,
        end.replace(
          `modelViewMatrix * vec4( ${name}, 1.0 )`,
          `viewMatrix * built( modelMatrix * vec4( ${name}, 1.0 ), instanceBuildAt )`,
        ),
      );
    }
    body = `attribute float instanceBuildAt;\n${body}`;
  }
  shader.vertexShader = BUILD_GLSL + body;
};

export interface Materials {
  /** Every face in town: the colors live on the vertices. */
  faces: MeshBasicMaterial;
  /** Ink is grey; `colorful` is for marks that are part of a hover, like the lot outline. */
  line: (token: Token, weight: Weight, colorful?: boolean) => LineMaterial;
  setTheme: (theme: Theme) => void;
  setZoom: (zoom: number) => void;
  /** Seconds into the town going up; its schedule's end or more once it's up. */
  setGrowth: (seconds: number) => void;
  /** Make a material go up with the rest of the town. */
  grows: <M extends Material>(material: M) => M;
  /** When each point drawn with these materials starts going up; null for things that never do. */
  startAt: StartAt | null;
  dispose: () => void;
}

/** Materials for the town; with `startAt`, all it draws goes up building by building as growth runs. */
export const createMaterials = (initial: Theme, startAt: StartAt | null = null): Materials => {
  let theme = initial;
  let inkScale = 1;
  const growth = { value: 0 };
  const grows = <M extends Material>(material: M) => {
    if (startAt) {
      material.onBeforeCompile = (shader) => building(shader, growth);
    }
    return material;
  };
  const faces = grows(
    new MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      side: DoubleSide,
      vertexColors: true,
    }),
  );
  const lines = new Map<
    string,
    { material: LineMaterial; token: Token; weight: Weight; colorful: boolean }
  >();
  const line = (token: Token, weight: Weight, colorful = false) => {
    const key = `${token}|${weight}|${colorful}`;
    const existing = lines.get(key);
    if (existing) {
      return existing.material;
    }
    // Ink stays grey even on a hovered building: the color is in the washes.
    const material = grows(
      new LineMaterial({
        alphaToCoverage: true,
        color: shade(token, theme, colorful),
        linewidth: WEIGHTS[weight] * inkScale,
      }),
    );
    lines.set(key, { colorful, material, token, weight });
    return material;
  };
  return {
    dispose: () => {
      faces.dispose();
      for (const { material } of lines.values()) {
        material.dispose();
      }
    },
    faces,
    grows,
    line,
    setGrowth: (seconds) => {
      growth.value = seconds;
    },
    setTheme: (next) => {
      theme = next;
      for (const { colorful, material, token } of lines.values()) {
        material.color.set(shade(token, theme, colorful));
      }
    },
    setZoom: (zoom) => {
      // Ink thickens as you lean in, but slower than the drawing grows, so a
      // zoomed-out town stays legible and a close-up stays delicate.
      inkScale = Math.min(2.4, Math.max(0.55, zoom ** 0.55));
      for (const { material, weight } of lines.values()) {
        material.linewidth = WEIGHTS[weight] * inkScale;
      }
    },
    startAt,
  };
};

const SIGN_HEIGHT_PX = 128;
const SIGN_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const fontAt = (size: number) => `700 ${size}px ${SIGN_FONT}`;

/** The largest type that fits these lines in the box. */
const fitLines = (
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  width: number,
  height: number,
) => {
  const tallest = (height * 0.74) / lines.length;
  context.font = fontAt(tallest);
  const widest = Math.max(...lines.map((text) => context.measureText(text).width));
  return widest > width * 0.9 ? (tallest * width * 0.9) / widest : tallest;
};

/** One line, or two if breaking at a space lets the name be set bigger. */
const layoutSign = (
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) => {
  let best = { lines: [text], size: fitLines(context, [text], width, height) };
  const words = text.split(" ");
  for (let split = 1; split < words.length; split += 1) {
    const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
    const size = fitLines(context, lines, width, height);
    if (size > best.size * 1.15) {
      best = { lines, size };
    }
  }
  return best;
};

/** White glyphs on a clear canvas; the material tints them. */
const signTexture = (sign: Sign) => {
  const width = Math.hypot(...sign.across);
  const height = Math.hypot(...sign.up);
  const canvas = document.createElement("canvas");
  canvas.height = SIGN_HEIGHT_PX;
  canvas.width = Math.max(32, Math.round((SIGN_HEIGHT_PX * width) / height));
  const context = canvas.getContext("2d");
  if (context) {
    const { lines, size } = layoutSign(context, sign.text, canvas.width, SIGN_HEIGHT_PX);
    context.font = fontAt(size);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const leading = size * 1.05;
    const top = SIGN_HEIGHT_PX * 0.53 - (leading * (lines.length - 1)) / 2;
    for (const [index, text] of lines.entries()) {
      context.fillText(text, canvas.width / 2, top + index * leading);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = LinearMipmapLinearFilter;
  return texture;
};

/** Every vertex of a run of triangles (or segments, `per` 2) gets the start of the thing it's part of, found at its middle. */
const startsOf = (positions: ArrayLike<number>, per: number, startAt: StartAt, offset: Vec3) => {
  const count = positions.length / 3 / per;
  const starts = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    let x = 0;
    let z = 0;
    for (let corner = 0; corner < per; corner += 1) {
      x += positions[(index * per + corner) * 3] ?? 0;
      z += positions[(index * per + corner) * 3 + 2] ?? 0;
    }
    starts[index] = startAt(x / per + offset[0], z / per + offset[2]);
  }
  return starts;
};

const quad = (origin: Vec3, across: Vec3, up: Vec3) => {
  const corner = (u: number, v: number) => [
    origin[0] + across[0] * u + up[0] * v,
    origin[1] + across[1] * u + up[1] * v,
    origin[2] + across[2] * u + up[2] * v,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      [...corner(0, 0), ...corner(1, 0), ...corner(1, 1), ...corner(0, 1)],
      3,
    ),
  );
  geometry.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return geometry;
};

/** A flat board goes up with whatever it's fixed to: its whole quad starts with the point at its middle. */
const boardOn = (
  geometry: BufferGeometry,
  { origin, across, up }: { origin: Vec3; across: Vec3; up: Vec3 },
  materials: Materials,
  offset: Vec3,
) => {
  if (materials.startAt) {
    const start = materials.startAt(
      origin[0] + (across[0] + up[0]) / 2 + offset[0],
      origin[2] + (across[2] + up[2]) / 2 + offset[2],
    );
    geometry.setAttribute("buildAt", new Float32BufferAttribute([start, start, start, start], 1));
  }
  return geometry;
};

/** A picture the animations redraw: the TV on Autoplay's roof, a ticker. */
export interface LiveScreen {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
}

const SCREEN_HEIGHT_PX = 64;

const screenMesh = (screen: Screen, materials: Materials, offset: Vec3) => {
  const canvas = document.createElement("canvas");
  const aspect = Math.hypot(...screen.across) / Math.hypot(...screen.up);
  canvas.height = SCREEN_HEIGHT_PX;
  canvas.width = Math.round(SCREEN_HEIGHT_PX * aspect);
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const mesh = new Mesh(
    boardOn(quad(screen.origin, screen.across, screen.up), screen, materials, offset),
    materials.grows(new MeshBasicMaterial({ map: texture, side: DoubleSide })),
  );
  mesh.renderOrder = 2;
  return { mesh, screen: { canvas, context, texture } };
};

/** Where a token's vertices sit in a face mesh, to repaint them. */
interface Run {
  token: Token;
  start: number;
  count: number;
}

interface Painter {
  colors: Float32BufferAttribute;
  runs: Run[];
}

export interface Built {
  group: Group;
  screens: Map<string, LiveScreen>;
  /** Named moving parts, found by the animations. */
  parts: Map<string, Group>;
  paint: (theme: Theme, colorful: boolean) => void;
  dispose: () => void;
}

interface Workshop {
  materials: Materials;
  built: Built;
  painters: Painter[];
  signs: { material: MeshBasicMaterial; token: Token }[];
}

const faceMesh = (sketch: Sketch, workshop: Workshop, offset: Vec3) => {
  let vertices = 0;
  for (const positions of sketch.faces.values()) {
    vertices += positions.length / 3;
  }
  if (vertices === 0) {
    return null;
  }
  const positions = new Float32Array(vertices * 3);
  const runs: Run[] = [];
  let start = 0;
  for (const [token, coordinates] of sketch.faces) {
    positions.set(coordinates, start * 3);
    runs.push({ count: coordinates.length / 3, start, token });
    start += coordinates.length / 3;
  }
  const colors = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", colors);
  const { startAt } = workshop.materials;
  if (startAt) {
    const perTriangle = startsOf(positions, 3, startAt, offset);
    geometry.setAttribute(
      "buildAt",
      new Float32BufferAttribute(
        Float32Array.from(
          { length: vertices },
          (_, vertex) => perTriangle[Math.floor(vertex / 3)] ?? 0,
        ),
        1,
      ),
    );
  }
  workshop.painters.push({ colors, runs });
  return new Mesh(geometry, workshop.materials.faces);
};

/** Builds a sketch into `target`, drawn `offset` from the town's origin (a moving part's own origin). */
const buildInto = (sketch: Sketch, workshop: Workshop, target: Group, offset: Vec3 = [0, 0, 0]) => {
  const faces = faceMesh(sketch, workshop, offset);
  if (faces) {
    target.add(faces);
  }
  for (const batch of sketch.lines.values()) {
    if (batch.positions.length > 0) {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(batch.positions);
      const { startAt } = workshop.materials;
      if (startAt) {
        geometry.setAttribute(
          "instanceBuildAt",
          new InstancedBufferAttribute(startsOf(batch.positions, 2, startAt, offset), 1),
        );
      }
      const lines = new LineSegments2(geometry, workshop.materials.line(batch.token, batch.weight));
      lines.renderOrder = 1;
      target.add(lines);
    }
  }
  for (const sign of sketch.signs) {
    const material = workshop.materials.grows(
      new MeshBasicMaterial({
        depthWrite: false,
        map: signTexture(sign),
        side: DoubleSide,
        transparent: true,
      }),
    );
    const mesh = new Mesh(
      boardOn(quad(sign.origin, sign.across, sign.up), sign, workshop.materials, offset),
      material,
    );
    mesh.renderOrder = 2;
    workshop.signs.push({ material, token: sign.token });
    target.add(mesh);
  }
  for (const screen of sketch.screens) {
    const live = screenMesh(screen, workshop.materials, offset);
    if (live) {
      workshop.built.screens.set(screen.name, live.screen);
      target.add(live.mesh);
    }
  }
  for (const piece of sketch.parts) {
    const group = new Group();
    group.position.set(...piece.origin);
    group.name = piece.name;
    workshop.built.parts.set(piece.name, group);
    buildInto(piece.sketch, workshop, group, [
      offset[0] + piece.origin[0],
      offset[1] + piece.origin[1],
      offset[2] + piece.origin[2],
    ]);
    target.add(group);
  }
};

export const build = (sketch: Sketch, materials: Materials): Built => {
  const group = new Group();
  const painters: Painter[] = [];
  const signs: Workshop["signs"] = [];
  const color = new Color();
  const built: Built = {
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof Mesh || object instanceof LineSegments2) {
          object.geometry.dispose();
        }
      });
      for (const { material } of signs) {
        material.map?.dispose();
        material.dispose();
      }
      for (const { texture } of built.screens.values()) {
        texture.dispose();
      }
    },
    group,
    paint: (theme, colorful) => {
      for (const { colors, runs } of painters) {
        for (const { token, start, count } of runs) {
          color.set(shade(token, theme, colorful));
          for (let vertex = start; vertex < start + count; vertex += 1) {
            colors.setXYZ(vertex, color.r, color.g, color.b);
          }
        }
        colors.needsUpdate = true;
      }
      for (const { material, token } of signs) {
        material.color.set(shade(token, theme, colorful));
      }
    },
    parts: new Map(),
    screens: new Map(),
  };
  buildInto(sketch, { built, materials, painters, signs }, group);
  return built;
};
