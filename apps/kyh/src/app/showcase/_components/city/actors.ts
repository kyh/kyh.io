// Cars and people, drawn as instances: one mesh per part for the whole
// crowd, each outlined by a slightly larger copy drawn inside out in ink.
import type { BufferGeometry } from "three";
import {
  BackSide,
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import type { Theme, Token } from "./palette";
import type { Car, Pose, Walker } from "./traffic";
import { PALETTE } from "./palette";

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

const boxPair = (w: number, h: number, d: number, y: number, x = 0) => {
  const fill = new BoxGeometry(w, h, d).translate(x, y, 0);
  const outline = new BoxGeometry(w + INK * 2, h + INK * 2, d + INK * 2).translate(x, y, 0);
  return [fill, outline] as const;
};

interface Layer {
  mesh: InstancedMesh;
  tokens: Token[] | null;
}

export const createActors = (cars: readonly Car[], walkers: readonly Walker[], theme: Theme) => {
  const ink = new MeshBasicMaterial({ color: PALETTE.ink[theme], side: BackSide });
  const tinted = new MeshBasicMaterial({ color: "#ffffff" });
  const cabin = new MeshBasicMaterial({ color: PALETTE.glassDim[theme] });
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
  const carColors = cars.map((_, index) => CAR_TOKENS[index % CAR_TOKENS.length] ?? "white");
  const carMeshes = [
    layer(carBodyInk, ink, cars.length, null),
    layer(carBody, tinted, cars.length, carColors),
    layer(carTopInk, ink, cars.length, null),
    layer(carTop, cabin, cars.length, null),
  ];
  const [body, bodyInk] = boxPair(0.075, 0.15, 0.055, 0.1);
  const head = new SphereGeometry(0.036, 8, 6).translate(0, 0.22, 0);
  const headInk = new SphereGeometry(0.036 + INK, 8, 6).translate(0, 0.22, 0);
  const coats = walkers.map((_, index) => COAT_TOKENS[(index * 7) % COAT_TOKENS.length] ?? "navy");
  const skins = walkers.map((_, index) => SKIN_TOKENS[index % SKIN_TOKENS.length] ?? "skin");
  const walkerMeshes = [
    layer(bodyInk, ink, walkers.length, null),
    layer(body, tinted, walkers.length, coats),
    layer(headInk, ink, walkers.length, null),
    layer(head, tinted, walkers.length, skins),
  ];
  const paintLayers = (next: Theme) => {
    const color = new Color();
    for (const { mesh, tokens } of layers) {
      if (tokens) {
        for (const [index, token] of tokens.entries()) {
          mesh.setColorAt(index, color.set(PALETTE[token][next]));
        }
        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      }
    }
    ink.color.set(PALETTE.ink[next]);
    cabin.color.set(PALETTE.glassDim[next]);
  };
  paintLayers(theme);

  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const unit = new Vector3(1, 1, 1);
  const up = new Vector3(0, 1, 0);
  const place = (
    meshes: InstancedMesh[],
    poses: readonly Pose[],
    lift: (index: number) => number,
  ) => {
    for (const [index, pose] of poses.entries()) {
      position.set(pose.x, lift(index), pose.z);
      rotation.setFromAxisAngle(up, -pose.heading);
      matrix.compose(position, rotation, unit);
      for (const mesh of meshes) {
        mesh.setMatrixAt(index, matrix);
      }
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  const carPoses = cars.map((car) => car.pose);
  const walkerPoses = walkers.map((walker) => walker.pose);
  return {
    dispose: () => {
      for (const geometry of geometries) {
        geometry.dispose();
      }
      ink.dispose();
      tinted.dispose();
      cabin.dispose();
    },
    meshes: layers.map(({ mesh }) => mesh),
    setTheme: paintLayers,
    update: () => {
      place(carMeshes, carPoses, () => 0.012);
      place(
        walkerMeshes,
        walkerPoses,
        (index) => 0.04 + Math.abs(Math.sin(walkers[index]?.phase ?? 0)) * 0.014,
      );
    },
  };
};
