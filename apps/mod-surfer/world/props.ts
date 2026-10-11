// What comes down the tracks: trains, barriers and coins, one object per
// simulated Thing, recycled through pools as things come and go. Shapes
// follow Subway Surfers: fat rounded carriages with chevron bumpers and
// glowing lamps, striped barriers, big star coins.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type { Kind, Thing } from "../hooks/game";
import { RAMP_LENGTH, TRAIN_LENGTH } from "../hooks/game";
import { chevrons } from "./textures";
import { toon } from "./toon";

export const UNIT = 3.4;
export const LANE_WIDTH = 2.7;
const TRAIN = { height: 3.3, length: TRAIN_LENGTH * UNIT - 0.4, width: 2.4 };
// Where a runner on a roof stands.
export const ROOF_Y = TRAIN.height + 0.25;

const shadowed = <T extends THREE.Object3D>(object: T) => {
  object.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return object;
};

const glass = new THREE.MeshStandardMaterial({
  color: 0x24_33_4a,
  metalness: 0.3,
  roughness: 0.15,
});
const frame = toon(0xf2_f0_ea);
const steel = new THREE.MeshStandardMaterial({ color: 0x5b_60_6b, metalness: 0.6, roughness: 0.5 });
const lamp = new THREE.MeshStandardMaterial({
  color: 0xff_f6_d8,
  emissive: 0xff_e7_a0,
  emissiveIntensity: 3,
});
const roof = toon(0xd9_dc_e2);
const bumper = toon(0xff_ff_ff, { map: chevrons() });
const part = (
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
};

const plate = new THREE.MeshStandardMaterial({
  color: 0x9a_a3_b0,
  metalness: 0.5,
  roughness: 0.45,
});

// A wedge from the track up to the roof, in front of the carriage (+z).
const makeRamp = () => {
  const run = RAMP_LENGTH * UNIT;
  const side = new THREE.Shape();
  side.moveTo(0, 0);
  side.lineTo(run, 0);
  side.lineTo(0, ROOF_Y);
  side.lineTo(0, 0);
  const width = TRAIN.width - 0.2;
  const wedge = new THREE.ExtrudeGeometry(side, { bevelEnabled: false, depth: width })
    .rotateY(-Math.PI / 2)
    .translate(width / 2, 0, 0);
  return part(wedge, plate, 0, 0, 0);
};

// A carriage whose front face sits on the origin, its body running off along -z.
const makeTrain = (color: number, hasRamp: boolean) => {
  const paint = toon(color);
  const stripe = toon(new THREE.Color(color).offsetHSL(0, 0.1, -0.22));
  const train = new THREE.Group();
  const { height, length, width } = TRAIN;
  const mid = -length / 2;
  const body = height - 0.55;
  train.add(
    part(new RoundedBoxGeometry(width, body, length, 6, 0.5), paint, 0, 0.55 + body / 2, mid),
  );
  train.add(
    part(
      new RoundedBoxGeometry(width - 0.5, 0.4, length - 0.6, 4, 0.18),
      roof,
      0,
      height + 0.05,
      mid,
    ),
  );
  train.add(part(new THREE.BoxGeometry(width + 0.02, 0.32, length - 0.9), stripe, 0, 1.25, mid));

  const WINDOW = 1.3;
  const windows = Math.floor((length - 2) / (WINDOW + 0.5));
  for (const side of [-1, 1]) {
    for (let i = 0; i < windows; i += 1) {
      const z = -1.4 - i * (WINDOW + 0.5) - WINDOW / 2;
      train.add(
        part(new THREE.BoxGeometry(0.06, 1, WINDOW + 0.18), frame, (side * width) / 2, 2.25, z),
      );
      train.add(
        part(new THREE.BoxGeometry(0.08, 0.82, WINDOW), glass, (side * width) / 2, 2.25, z),
      );
    }
  }

  train.add(part(new RoundedBoxGeometry(width - 0.45, 1.1, 0.12, 3, 0.05), frame, 0, 2.3, 0.02));
  train.add(part(new RoundedBoxGeometry(width - 0.65, 0.92, 0.14, 3, 0.05), glass, 0, 2.3, 0.04));
  for (const x of [-0.72, 0.72]) {
    train.add(
      part(
        new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24).rotateX(Math.PI / 2),
        lamp,
        x,
        1.25,
        0.06,
      ),
    );
  }
  train.add(part(new THREE.BoxGeometry(width - 0.2, 0.5, 0.1), bumper, 0, 0.62, 0.05));

  for (const z of [-1.6, -length + 1.6]) {
    train.add(part(new THREE.BoxGeometry(width - 0.5, 0.5, 2), steel, 0, 0.3, z));
  }
  if (hasRamp) {
    train.add(makeRamp());
  }
  return shadowed(train);
};

const barrierBoard = toon(0xff_ff_ff, { map: chevrons() });
const barrierLeg = toon(0xf2_f0_ea);
const warning = new THREE.MeshStandardMaterial({
  color: 0xff_c8_2e,
  emissive: 0xff_a8_00,
  emissiveIntensity: 2,
});
const makeBarrier = () => {
  const barrier = new THREE.Group();
  barrier.add(part(new RoundedBoxGeometry(2.3, 0.6, 0.16, 3, 0.06), barrierBoard, 0, 1.05, 0));
  for (const x of [-0.95, 0.95]) {
    barrier.add(part(new THREE.BoxGeometry(0.12, 1.05, 0.12), barrierLeg, x, 0.52, 0));
    barrier.add(part(new THREE.BoxGeometry(0.14, 0.08, 0.8), barrierLeg, x, 0.04, 0));
    barrier.add(part(new THREE.SphereGeometry(0.13, 16, 12), warning, x, 1.5, 0));
  }
  return shadowed(barrier);
};

const gold = new THREE.MeshStandardMaterial({
  color: 0xff_c4_1f,
  emissive: 0xa8_6a_00,
  emissiveIntensity: 0.7,
  metalness: 0.75,
  roughness: 0.25,
});
const embossed = new THREE.MeshStandardMaterial({
  color: 0xff_e0_6a,
  emissive: 0xc0_88_00,
  emissiveIntensity: 0.8,
  metalness: 0.6,
  roughness: 0.3,
});

const star = (outer: number, inner: number) => {
  const outline = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      outline.moveTo(x, y);
    } else {
      outline.lineTo(x, y);
    }
  }
  return new THREE.ExtrudeGeometry(outline, { bevelEnabled: false, depth: 0.16 }).translate(
    0,
    0,
    -0.08,
  );
};

const coinDisc = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40).rotateX(Math.PI / 2);
const coinStar = star(0.3, 0.13);
const makeCoin = () => {
  const coin = new THREE.Group();
  coin.add(part(coinDisc, gold, 0, 0, 0));
  coin.add(part(coinStar, embossed, 0, 0, 0));
  return shadowed(coin);
};

// Trains differ by paint and ramp, so a pooled one is reused only as the same.
const looksOf = (thing: Thing) =>
  thing.kind === "train" ? `${thing.color}:${thing.hasRamp}` : thing.kind;

export const createProps = (scene: THREE.Scene) => {
  const live = new Map<Thing, THREE.Object3D>();
  const pools: Record<Kind, THREE.Object3D[]> = { barrier: [], coin: [], train: [] };
  const trainLooks = new WeakMap<THREE.Object3D, string>();

  const take = (thing: Thing) => {
    const pool = pools[thing.kind];
    const looks = looksOf(thing);
    const index = thing.kind === "train" ? pool.findIndex((o) => trainLooks.get(o) === looks) : 0;
    const [reused] = index >= 0 ? pool.splice(index, 1) : [];
    if (reused) {
      return reused;
    }
    if (thing.kind === "train") {
      const train = makeTrain(thing.color, thing.hasRamp);
      trainLooks.set(train, looks);
      return train;
    }
    return thing.kind === "barrier" ? makeBarrier() : makeCoin();
  };

  // `ahead` turns a thing's distance from the runner into world z.
  const update = (things: readonly Thing[], ahead: (d: number) => number, time: number) => {
    const present = new Set(things);
    for (const [thing, object] of live) {
      if (!present.has(thing)) {
        live.delete(thing);
        scene.remove(object);
        pools[thing.kind].push(object);
      }
    }
    for (const thing of things) {
      let object = live.get(thing);
      if (!object) {
        object = take(thing);
        live.set(thing, object);
        scene.add(object);
      }
      object.position.set((thing.lane - 1) * LANE_WIDTH, 0, ahead(thing.d));
      if (thing.kind === "coin") {
        object.position.y = (thing.isHigh ? ROOF_Y : 0) + 1.2 + Math.sin(time * 4 + thing.d) * 0.08;
        object.rotation.y = time * 3.5 + thing.d;
      }
    }
  };

  return { update };
};
