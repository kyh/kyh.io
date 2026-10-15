// Cars and people, drawn as instances: one mesh per part for the whole
// crowd, each outlined by a slightly larger copy drawn inside out in ink.
// Whatever is up in the air (carried, or falling) gets a soft shadow below.
import type { BufferGeometry } from "three";
import {
  BackSide,
  BoxGeometry,
  CircleGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import type { Theme, Token } from "./palette";
import { shade } from "./palette";

const CAR_TOKENS: Token[] = [
  "white",
  "accentRed",
  "accentBlue",
  "accentYellow",
  "roofGray",
  "accentTeal",
  "navy",
  "white",
  "accentGreen",
];
const COAT_TOKENS: Token[] = [
  "accentRed",
  "accentBlue",
  "navy",
  "accentGreen",
  "accentYellow",
  "accentPurple",
  "accentTeal",
  "roofTerracotta",
  "trunk",
  "accentPink",
];
const SKIN_TOKENS: Token[] = ["skin", "skin", "skinDark"];
/** How far an outline stands out from its shape, in cells. */
const INK = 0.012;
/** The most shadows drawn at once: one per thing in the air. */
const SHADOWS = 24;

/** Where and how one car or person is drawn this frame. */
export interface Placement {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Which way and how far (radians) its top leans, swinging from a hand. */
  leanX: number;
  leanZ: number;
  /** False while it's inside a building. */
  shown: boolean;
  /** How big it's drawn, 0 to 1: things come and go by growing and shrinking, never by fading. */
  size: number;
  /** Its shadow on the ground, sized for how high it is; size 0 for none. */
  shadowX: number;
  shadowY: number;
  shadowZ: number;
  shadowSize: number;
}

export const placement = (): Placement => ({
  heading: 0,
  leanX: 0,
  leanZ: 0,
  shadowSize: 0,
  shadowX: 0,
  shadowY: 0,
  shadowZ: 0,
  shown: true,
  size: 1,
  x: 0,
  y: 0,
  z: 0,
});

const boxPair = (w: number, h: number, d: number, y: number, x = 0) => {
  const fill = new BoxGeometry(w, h, d).translate(x, y, 0);
  const outline = new BoxGeometry(w + INK * 2, h + INK * 2, d + INK * 2).translate(x, y, 0);
  return [fill, outline] as const;
};

interface Layer {
  mesh: InstancedMesh;
  tokens: Token[] | null;
}

export const createActors = (
  counts: { cars: number; walkers: number; visitors: number },
  theme: Theme,
) => {
  const ink = new MeshBasicMaterial({ color: shade("ink", theme, false), side: BackSide });
  const tinted = new MeshBasicMaterial({ color: "#ffffff" });
  const cabin = new MeshBasicMaterial({ color: shade("glassDim", theme, false) });
  const shadowMaterial = new MeshBasicMaterial({
    color: "#000000",
    depthWrite: false,
    opacity: 0.16,
    transparent: true,
  });
  const layers: Layer[] = [];
  const geometries: BufferGeometry[] = [];
  const layer = (
    geometry: BufferGeometry,
    material: MeshBasicMaterial,
    count: number,
    tokens: Token[] | null,
  ) => {
    const mesh = new InstancedMesh(geometry, material, Math.max(1, count));
    mesh.count = count;
    mesh.frustumCulled = false;
    geometries.push(geometry);
    layers.push({ mesh, tokens });
    return mesh;
  };
  const [carBody, carBodyInk] = boxPair(0.38, 0.09, 0.19, 0.075);
  const [carTop, carTopInk] = boxPair(0.2, 0.07, 0.16, 0.15, -0.03);
  const carColors = Array.from(
    { length: counts.cars },
    (_, index) => CAR_TOKENS[index % CAR_TOKENS.length] ?? "white",
  );
  const carMeshes = [
    layer(carBodyInk, ink, counts.cars, null),
    layer(carBody, tinted, counts.cars, carColors),
    layer(carTopInk, ink, counts.cars, null),
    layer(carTop, cabin, counts.cars, null),
  ];
  const [body, bodyInk] = boxPair(0.075, 0.15, 0.055, 0.1);
  const head = new SphereGeometry(0.036, 8, 6).translate(0, 0.22, 0);
  const headInk = new SphereGeometry(0.036 + INK, 8, 6).translate(0, 0.22, 0);
  const person = (count: number, offset: number) => {
    const coats = Array.from(
      { length: count },
      (_, index) => COAT_TOKENS[((index + offset) * 7) % COAT_TOKENS.length] ?? "navy",
    );
    const skins = Array.from(
      { length: count },
      (_, index) => SKIN_TOKENS[(index + offset) % SKIN_TOKENS.length] ?? "skin",
    );
    // Each group gets its own geometry copies, so disposing one never frees another's.
    return [
      layer(bodyInk.clone(), ink, count, null),
      layer(body.clone(), tinted, count, coats),
      layer(headInk.clone(), ink, count, null),
      layer(head.clone(), tinted, count, skins),
    ];
  };
  const walkerMeshes = person(counts.walkers, 0);
  const visitorMeshes = person(counts.visitors, 3);
  for (const geometry of [body, bodyInk, head, headInk]) {
    geometry.dispose();
  }
  const shadowGeometry = new CircleGeometry(0.15, 16).rotateX(-Math.PI / 2);
  geometries.push(shadowGeometry);
  const shadows = new InstancedMesh(shadowGeometry, shadowMaterial, SHADOWS);
  shadows.count = 0;
  shadows.frustumCulled = false;
  shadows.renderOrder = 2;

  const paintLayers = (next: Theme) => {
    const color = new Color();
    for (const { mesh, tokens } of layers) {
      if (tokens) {
        for (const [index, token] of tokens.entries()) {
          mesh.setColorAt(index, color.set(shade(token, next, false)));
        }
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
    ink.color.set(shade("ink", next, false));
    cabin.color.set(shade("glassDim", next, false));
    shadowMaterial.opacity = next === "night" ? 0.3 : 0.16;
  };
  paintLayers(theme);

  const matrix = new Matrix4();
  const position = new Vector3();
  const yaw = new Quaternion();
  const lean = new Quaternion();
  const axis = new Vector3();
  const up = new Vector3(0, 1, 0);
  const none = new Vector3(0, 0, 0);
  const shadowAt = new Vector3();
  const shadowSize = new Vector3();
  const flat = new Quaternion();
  let shadowCount = 0;

  const sized = new Vector3();
  const place = (meshes: InstancedMesh[], placements: readonly Placement[]) => {
    for (const [index, spot] of placements.entries()) {
      position.set(spot.x, spot.y, spot.z);
      yaw.setFromAxisAngle(up, -spot.heading);
      const tilt = Math.hypot(spot.leanX, spot.leanZ);
      if (tilt > 1e-4) {
        // Lean the top toward (leanX, leanZ): turn about the level axis across it.
        lean.setFromAxisAngle(axis.set(spot.leanZ / tilt, 0, -spot.leanX / tilt), tilt);
        yaw.premultiply(lean);
      }
      const scale = spot.shown ? spot.size : 0;
      matrix.compose(position, yaw, scale > 0 ? sized.setScalar(scale) : none);
      for (const mesh of meshes) {
        mesh.setMatrixAt(index, matrix);
      }
      if (scale > 0 && spot.shadowSize > 0 && shadowCount < SHADOWS) {
        shadowAt.set(spot.shadowX, spot.shadowY + 0.006, spot.shadowZ);
        shadowSize.set(spot.shadowSize, 1, spot.shadowSize);
        matrix.compose(shadowAt, flat, shadowSize);
        shadows.setMatrixAt(shadowCount, matrix);
        shadowCount += 1;
      }
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    dispose: () => {
      for (const geometry of geometries) {
        geometry.dispose();
      }
      ink.dispose();
      tinted.dispose();
      cabin.dispose();
      shadowMaterial.dispose();
    },
    meshes: [...layers.map(({ mesh }) => mesh), shadows],
    setTheme: paintLayers,
    update: (
      cars: readonly Placement[],
      walkers: readonly Placement[],
      visitors: readonly Placement[],
    ) => {
      shadowCount = 0;
      place(carMeshes, cars);
      place(walkerMeshes, walkers);
      place(visitorMeshes, visitors);
      shadows.count = shadowCount;
      shadows.instanceMatrix.needsUpdate = true;
    },
  };
};
