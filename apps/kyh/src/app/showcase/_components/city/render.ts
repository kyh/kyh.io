// Turns sketches into three.js objects. Faces become unlit meshes, one per
// color, pushed back a hair so ink drawn on their edges wins the depth test;
// ink becomes fat screen-space lines, one batch per color and weight. All
// materials are shared and keyed by token, so the theme swaps in place.
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
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import type { Theme, Token } from "./palette";
import type { Screen, Sign, Sketch, Vec3, Weight } from "./sketch";
import { PALETTE } from "./palette";

/** Ink widths in CSS pixels at zoom 1. */
const WEIGHTS: Record<Weight, number> = { bold: 2.1, fine: 1.35, hair: 0.8 };

export interface Materials {
  face: (token: Token) => MeshBasicMaterial;
  line: (token: Token, weight: Weight) => LineMaterial;
  sign: (token: Token) => MeshBasicMaterial;
  color: (token: Token) => Color;
  setTheme: (theme: Theme) => void;
  setZoom: (zoom: number) => void;
  dispose: () => void;
}

export const createMaterials = (initial: Theme): Materials => {
  let theme = initial;
  let inkScale = 1;
  const faces = new Map<Token, MeshBasicMaterial>();
  const lines = new Map<string, { material: LineMaterial; token: Token; weight: Weight }>();
  const signs = new Map<Token, MeshBasicMaterial>();
  const colorOf = (token: Token) => new Color(PALETTE[token][theme]);
  const face = (token: Token) => {
    const existing = faces.get(token);
    if (existing) {
      return existing;
    }
    const material = new MeshBasicMaterial({
      color: colorOf(token),
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      side: DoubleSide,
    });
    faces.set(token, material);
    return material;
  };
  const line = (token: Token, weight: Weight) => {
    const key = `${token}|${weight}`;
    const existing = lines.get(key);
    if (existing) {
      return existing.material;
    }
    const material = new LineMaterial({
      alphaToCoverage: true,
      color: colorOf(token),
      linewidth: WEIGHTS[weight] * inkScale,
    });
    lines.set(key, { material, token, weight });
    return material;
  };
  const sign = (token: Token) => {
    const existing = signs.get(token);
    if (existing) {
      return existing;
    }
    const material = new MeshBasicMaterial({
      color: colorOf(token),
      depthWrite: false,
      side: DoubleSide,
      transparent: true,
    });
    signs.set(token, material);
    return material;
  };
  return {
    color: colorOf,
    dispose: () => {
      for (const material of faces.values()) {
        material.dispose();
      }
      for (const { material } of lines.values()) {
        material.dispose();
      }
      for (const material of signs.values()) {
        material.dispose();
      }
    },
    face,
    line,
    setTheme: (next) => {
      theme = next;
      for (const [token, material] of faces) {
        material.color.set(PALETTE[token][theme]);
      }
      for (const { material, token } of lines.values()) {
        material.color.set(PALETTE[token][theme]);
      }
      for (const [token, material] of signs) {
        material.color.set(PALETTE[token][theme]);
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
    sign,
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

/** White glyphs on a clear canvas; the material tints them to the theme. */
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

const signMesh = (sign: Sign, materials: Materials) => {
  const { origin, across, up } = sign;
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
  const material = materials.sign(sign.token).clone();
  material.map = signTexture(sign);
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = 2;
  return mesh;
};

/** A picture the animations redraw: the TV on Autoplay's roof, a ticker. */
export interface LiveScreen {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  texture: CanvasTexture;
}

const SCREEN_HEIGHT_PX = 64;

const screenMesh = (screen: Screen) => {
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
    new MeshBasicMaterial({ map: texture, side: DoubleSide }),
  );
  mesh.renderOrder = 2;
  return { mesh, screen: { canvas, context, texture } };
};

export interface Built {
  group: Group;
  screens: Map<string, LiveScreen>;
  /** Named moving parts, found by the animations. */
  parts: Map<string, Group>;
  /** Per-sign materials, tinted along with the theme. */
  signs: { material: MeshBasicMaterial; token: Token }[];
  dispose: () => void;
}

const buildInto = (sketch: Sketch, materials: Materials, built: Built, target: Group) => {
  for (const [token, positions] of sketch.faces) {
    if (positions.length > 0) {
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
      target.add(new Mesh(geometry, materials.face(token)));
    }
  }
  for (const batch of sketch.lines.values()) {
    if (batch.positions.length > 0) {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(batch.positions);
      const lines = new LineSegments2(geometry, materials.line(batch.token, batch.weight));
      lines.renderOrder = 1;
      target.add(lines);
    }
  }
  for (const sign of sketch.signs) {
    const mesh = signMesh(sign, materials);
    if (mesh.material instanceof MeshBasicMaterial) {
      built.signs.push({ material: mesh.material, token: sign.token });
    }
    target.add(mesh);
  }
  for (const screen of sketch.screens) {
    const live = screenMesh(screen);
    if (live) {
      built.screens.set(screen.name, live.screen);
      target.add(live.mesh);
    }
  }
  for (const piece of sketch.parts) {
    const group = new Group();
    group.position.set(...piece.origin);
    group.name = piece.name;
    built.parts.set(piece.name, group);
    buildInto(piece.sketch, materials, built, group);
    target.add(group);
  }
};

export const build = (sketch: Sketch, materials: Materials): Built => {
  const group = new Group();
  const built: Built = {
    dispose: () => {
      group.traverse((object) => {
        if (object instanceof Mesh || object instanceof LineSegments2) {
          object.geometry.dispose();
        }
      });
      for (const { material } of built.signs) {
        material.map?.dispose();
        material.dispose();
      }
      for (const { texture } of built.screens.values()) {
        texture.dispose();
      }
    },
    group,
    parts: new Map(),
    screens: new Map(),
    signs: [],
  };
  buildInto(sketch, materials, built, group);
  return built;
};
