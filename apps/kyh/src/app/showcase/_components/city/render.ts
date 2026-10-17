// Turns sketches into three.js objects. A sketch's faces become one unlit
// mesh colored per vertex, pushed back a hair so ink drawn on their edges
// wins the depth test; ink becomes fat screen-space lines, one batch per
// color and weight. A built sketch repaints itself in place: in greys, or in
// its true colors while hovered, by day or by night.
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
} from "three";
import type { Material } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { Scheme, Tint, Token } from "./palette";
import type { Screen, Sign, Sketch, Vec3, Weight } from "./sketch";
import { SHADE, shade } from "./palette";
import { createShadowDots } from "./shadow-dots";

/** Ink widths in CSS pixels at zoom 1. */
const WEIGHTS: Record<Weight, number> = { bold: 2.1, fine: 1.35, hair: 0.8 };

export interface Materials {
  /** Every face in town: the colors live on the vertices. */
  faces: MeshBasicMaterial;
  /** Ink is grey; `colorful` is for marks that are part of a hover, like the lot outline. */
  line: (token: Token, weight: Weight, colorful?: boolean) => LineMaterial;
  setScheme: (scheme: Scheme) => void;
  setZoom: (zoom: number) => void;
  /** The canvas's device pixels per CSS pixel, which the shadow dots are sized in. */
  setPixelRatio: (ratio: number) => void;
  /** A material made for the town elsewhere (a sign, a screen), adapted like the rest. */
  adopt: <M extends Material>(material: M) => M;
  dispose: () => void;
}

/** Materials for the town; `adapt` sees every one made, to change how it draws (grow.ts raises the town). */
export const createMaterials = (
  initial: Scheme,
  adapt?: (material: Material) => void,
): Materials => {
  let scheme = initial;
  let inkScale = 1;
  const adopt = <M extends Material>(material: M) => {
    adapt?.(material);
    return material;
  };
  const faces = adopt(
    new MeshBasicMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      side: DoubleSide,
      vertexColors: true,
    }),
  );
  const dots = createShadowDots(scheme.light);
  const raised = faces.onBeforeCompile.bind(faces);
  faces.onBeforeCompile = (shader, renderer) => {
    raised(shader, renderer);
    dots.patch(shader);
  };
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
    const material = adopt(
      new LineMaterial({
        alphaToCoverage: true,
        color: shade(token, scheme, colorful),
        linewidth: WEIGHTS[weight] * inkScale,
      }),
    );
    lines.set(key, { colorful, material, token, weight });
    return material;
  };
  return {
    adopt,
    dispose: () => {
      faces.dispose();
      for (const { material } of lines.values()) {
        material.dispose();
      }
    },
    faces,
    line,
    setPixelRatio: dots.setPixelRatio,
    setScheme: (next) => {
      scheme = next;
      dots.setLight(next.light);
      for (const { colorful, material, token } of lines.values()) {
        material.color.set(shade(token, scheme, colorful));
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

/** A picture the animations redraw: the TV on Autoplay's roof, a ticker. */
export interface LiveScreen {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
}

const SCREEN_HEIGHT_PX = 64;

const screenMesh = (screen: Screen, materials: Materials) => {
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
    quad(screen.origin, screen.across, screen.up),
    materials.adopt(new MeshBasicMaterial({ map: texture, side: DoubleSide })),
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
  paint: (scheme: Scheme, colorful: boolean) => void;
  dispose: () => void;
}

interface Workshop {
  materials: Materials;
  built: Built;
  painters: Painter[];
  signs: { material: MeshBasicMaterial; token: Token }[];
}

const faceMesh = (sketch: Sketch, workshop: Workshop) => {
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
  const shadow = new Float32Array(vertices);
  for (const { token, start: first, count } of runs) {
    shadow.fill(SHADE.has(token) ? 1 : 0, first, first + count);
  }
  const colors = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", colors);
  geometry.setAttribute("shadow", new Float32BufferAttribute(shadow, 1));
  workshop.painters.push({ colors, runs });
  return new Mesh(geometry, workshop.materials.faces);
};

const buildInto = (sketch: Sketch, workshop: Workshop, target: Group) => {
  const faces = faceMesh(sketch, workshop);
  if (faces) {
    target.add(faces);
  }
  for (const batch of sketch.lines.values()) {
    if (batch.positions.length > 0) {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(batch.positions);
      const lines = new LineSegments2(geometry, workshop.materials.line(batch.token, batch.weight));
      lines.renderOrder = 1;
      target.add(lines);
    }
  }
  for (const sign of sketch.signs) {
    const material = workshop.materials.adopt(
      new MeshBasicMaterial({
        depthWrite: false,
        map: signTexture(sign),
        side: DoubleSide,
        transparent: true,
      }),
    );
    const mesh = new Mesh(quad(sign.origin, sign.across, sign.up), material);
    mesh.renderOrder = 2;
    workshop.signs.push({ material, token: sign.token });
    target.add(mesh);
  }
  for (const screen of sketch.screens) {
    const live = screenMesh(screen, workshop.materials);
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
    buildInto(piece.sketch, workshop, group);
    target.add(group);
  }
};

/** `tint` turns its colors, when shown, toward its project's own. */
export const build = (sketch: Sketch, materials: Materials, tint?: Tint): Built => {
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
    paint: (scheme, colorful) => {
      for (const { colors, runs } of painters) {
        for (const { token, start, count } of runs) {
          color.set(shade(token, scheme, colorful, tint));
          for (let vertex = start; vertex < start + count; vertex += 1) {
            colors.setXYZ(vertex, color.r, color.g, color.b);
          }
        }
        colors.needsUpdate = true;
      }
      for (const { material, token } of signs) {
        material.color.set(shade(token, scheme, colorful, tint));
      }
    },
    parts: new Map(),
    screens: new Map(),
  };
  buildInto(sketch, { built, materials, painters, signs }, group);
  return built;
};
