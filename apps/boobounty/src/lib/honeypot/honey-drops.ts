import type { Group } from "three";
import { CylinderGeometry, LatheGeometry, Mesh, Vector2 } from "three";

import { HONEY_LEVEL, honeyMaterial, thinHoneyMaterial } from "./models";

const GRAVITY = 14;
const BEAD = 0.045;
const THREAD = 0.028;
const FEED = 0.03;
const MAX_VOLUME_RADIUS = 0.45;
const SQUASH_SECONDS = 0.12;
const CREEP_SECONDS = 6;
const MAX_PUDDLES = 160;
// A moving stream lays a new puddle this far from the last: a drizzled line.
const DRIZZLE_SPACING = 0.06;
const STEER_RATE = 12;

interface Puddle {
  mesh: Mesh;
  radius: number;
  age: number;
}

interface Stream {
  bead: Mesh;
  thread: Mesh;
  x: number;
  z: number;
  aim: { x: number; z: number; ground: number };
  ground: number;
  top: number;
  bottom: number;
  topSpeed: number;
  bottomSpeed: number;
  pouring: boolean;
  puddle: Puddle | "jar" | undefined;
}

export interface Pour {
  /** Moves the source; the stream follows and drizzles a line where it lands. */
  steer: (x: number, z: number, from: number, intoJar: boolean) => void;
  release: () => void;
  cancel: () => void;
}

const sphereVolume = (radius: number) => (4 / 3) * Math.PI * radius ** 3;
const volumeRadius = (volume: number) => Math.cbrt((3 * volume) / (4 * Math.PI));

// Viscous honey squashes on impact, then creeps outward ever more slowly.
const spreadOf = (radius: number, age: number) =>
  age < SQUASH_SECONDS
    ? radius * (1 + 0.7 * (age / SQUASH_SECONDS))
    : radius * (1.7 + 0.9 * (1 - 1 / Math.sqrt(1 + (age - SQUASH_SECONDS) / 1.2)));

// Flat on top, rounded at the edge, slightly out of round.
const puddleGeometry = () => {
  const profile = Array.from({ length: 12 }, (_, index) => {
    const r = 1 - index / 11;
    return new Vector2(r, (1 - r ** 8) ** 0.35);
  });
  const geometry = new LatheGeometry(profile, 64);
  const position = geometry.getAttribute("position");
  const lobes = [2, 3].map((count) => ({
    amount: 0.02 + Math.random() * 0.02,
    count,
    phase: Math.random() * Math.PI * 2,
  }));
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    const angle = Math.atan2(z, x);
    const stretch = lobes.reduce(
      (total, lobe) => total + lobe.amount * Math.sin(lobe.count * angle + lobe.phase),
      1,
    );
    position.setXYZ(index, x * stretch, position.getY(index), z * stretch);
  }
  return geometry;
};

// A drop pulls a tail up into the thread it fell from.
const teardrop = () =>
  new LatheGeometry(
    [
      [0, -1],
      [0.6, -0.8],
      [0.95, -0.35],
      [1, 0],
      [0.8, 0.6],
      [0.45, 1.2],
      [0.18, 1.9],
      [0.08, 2.6],
    ].map(([x = 0, y = 0]) => new Vector2(x, y)),
    32,
  );

/** Honey you pour: a thread from above that pools, merges and creeps where it lands. */
export const createHoneyDrops = (world: Group) => {
  const beadGeometry = teardrop();
  // Thinner at the bottom: the stream speeds up as it falls.
  const threadGeometry = new CylinderGeometry(1, 0.55, 1, 12, 1, true).translate(0, 0.5, 0);
  const material = honeyMaterial(0.9);
  const puddleMaterial = thinHoneyMaterial();
  let streams: Stream[] = [];
  let puddles: Puddle[] = [];

  const removePuddle = (puddle: Puddle) => {
    world.remove(puddle.mesh);
    puddle.mesh.geometry.dispose();
  };

  const land = (x: number, z: number, volume: number, merge: boolean): Puddle => {
    const target = merge
      ? puddles.find(
          (puddle) =>
            Math.hypot(puddle.mesh.position.x - x, puddle.mesh.position.z - z) <
            spreadOf(puddle.radius, puddle.age) * 0.9,
        )
      : undefined;
    if (target) {
      target.radius = Math.min(
        MAX_VOLUME_RADIUS,
        volumeRadius(sphereVolume(target.radius) + volume),
      );
      return target;
    }
    const mesh = new Mesh(puddleGeometry(), puddleMaterial);
    mesh.position.set(x, 0.001 + (puddles.length % MAX_PUDDLES) * 0.0004, z);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    world.add(mesh);
    const puddle = { age: 0, mesh, radius: volumeRadius(volume) };
    puddles.push(puddle);
    for (const old of puddles.slice(0, Math.max(0, puddles.length - MAX_PUDDLES))) {
      removePuddle(old);
    }
    puddles = puddles.slice(-MAX_PUDDLES);
    return puddle;
  };

  const removeStream = (stream: Stream) => {
    world.remove(stream.bead, stream.thread);
  };

  /** Starts pouring at (x, z) from height `from`. Release stops the flow at its source. */
  const pour = (x: number, z: number, from: number, intoJar: boolean): Pour => {
    const bead = new Mesh(beadGeometry, material);
    const thread = new Mesh(threadGeometry, material);
    bead.position.set(x, from, z);
    bead.scale.setScalar(BEAD);
    thread.position.set(x, from, z);
    thread.scale.set(THREAD, 0.0001, THREAD);
    world.add(bead, thread);
    const ground = intoJar ? HONEY_LEVEL : 0;
    const stream: Stream = {
      aim: { ground, x, z },
      bead,
      bottom: from,
      bottomSpeed: 0,
      ground,
      pouring: true,
      puddle: undefined,
      thread,
      top: from,
      topSpeed: 0,
      x,
      z,
    };
    streams.push(stream);
    return {
      cancel: () => {
        if (stream.puddle === undefined) {
          removeStream(stream);
          streams = streams.filter((other) => other !== stream);
        } else {
          stream.pouring = false;
        }
      },
      release: () => {
        stream.pouring = false;
      },
      steer: (toX, toZ, toFrom, toJar) => {
        if (stream.pouring) {
          stream.aim = { ground: toJar ? HONEY_LEVEL : 0, x: toX, z: toZ };
          stream.top = toFrom;
        }
      },
    };
  };

  const follow = (stream: Stream, seconds: number) => {
    const k = 1 - Math.exp(-STEER_RATE * seconds);
    stream.x += (stream.aim.x - stream.x) * k;
    stream.z += (stream.aim.z - stream.z) * k;
    if (stream.puddle === undefined) {
      stream.ground = stream.aim.ground;
      return;
    }
    if (stream.aim.ground !== stream.ground) {
      stream.ground = stream.aim.ground;
      stream.bottom = stream.ground;
      stream.puddle =
        stream.ground > 0 ? "jar" : land(stream.x, stream.z, sphereVolume(THREAD * 2), true);
      return;
    }
    const { puddle } = stream;
    if (
      puddle !== "jar" &&
      Math.hypot(puddle.mesh.position.x - stream.x, puddle.mesh.position.z - stream.z) >
        DRIZZLE_SPACING
    ) {
      stream.puddle = land(stream.x, stream.z, sphereVolume(THREAD * 1.6), false);
    }
  };

  const stepStream = (stream: Stream, seconds: number) => {
    if (stream.pouring) {
      follow(stream, seconds);
    }
    if (stream.puddle === undefined) {
      stream.bottomSpeed += GRAVITY * seconds;
      stream.bottom -= stream.bottomSpeed * seconds;
      if (stream.bottom <= stream.ground) {
        stream.bottom = stream.ground;
        world.remove(stream.bead);
        stream.puddle =
          stream.ground > 0 ? "jar" : land(stream.x, stream.z, sphereVolume(BEAD) * 2.5, true);
      }
    }
    if (!stream.pouring) {
      stream.topSpeed += GRAVITY * seconds;
      stream.top -= stream.topSpeed * seconds;
    }
    const length = Math.max(0, stream.top - stream.bottom);
    if (stream.puddle && stream.puddle !== "jar" && length > 0) {
      const { puddle } = stream;
      puddle.radius = Math.min(
        MAX_VOLUME_RADIUS,
        volumeRadius(sphereVolume(puddle.radius) + FEED * seconds),
      );
      puddle.age = Math.min(puddle.age, SQUASH_SECONDS + 0.6);
    }
    const stretch = 1 + Math.min(stream.bottomSpeed * 0.04, 0.6);
    stream.bead.position.set(stream.x, stream.bottom + BEAD, stream.z);
    stream.thread.position.x = stream.x;
    stream.thread.position.z = stream.z;
    stream.bead.scale.set(BEAD / Math.sqrt(stretch), BEAD * stretch, BEAD / Math.sqrt(stretch));
    stream.thread.position.y = stream.bottom + (stream.puddle === undefined ? BEAD * 2 : 0);
    stream.thread.scale.set(THREAD, Math.max(0.0001, length), THREAD);
    return stream.top > stream.ground;
  };

  const update = (seconds: number) => {
    streams = streams.filter((stream) => {
      const alive = stepStream(stream, seconds);
      if (!alive) {
        removeStream(stream);
      }
      return alive;
    });
    for (const puddle of puddles) {
      if (puddle.age < CREEP_SECONDS) {
        puddle.age += seconds;
        const spread = spreadOf(puddle.radius, puddle.age);
        puddle.mesh.scale.set(spread, (1.3 * puddle.radius ** 3) / spread ** 2, spread);
      }
    }
  };

  const active = () => streams.length > 0 || puddles.some((puddle) => puddle.age < CREEP_SECONDS);

  const dispose = () => {
    for (const puddle of puddles) {
      removePuddle(puddle);
    }
    for (const stream of streams) {
      removeStream(stream);
    }
    material.dispose();
    puddleMaterial.dispose();
    beadGeometry.dispose();
    threadGeometry.dispose();
  };

  return { active, dispose, pour, update };
};
