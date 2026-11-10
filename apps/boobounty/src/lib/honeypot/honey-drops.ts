import type { Group } from "three";
import {
  CatmullRomCurve3,
  CylinderGeometry,
  LatheGeometry,
  Mesh,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";

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
// Where the stream lands trails its source, as a falling rope does.
const TRAIL_RATE = 10;
// A thin stream falling onto a surface folds into a rope that winds into coils.
const COIL_TURNS = 3;
const COIL_RADIUS = 0.055;
const COIL_SEGMENTS = 90;
const COIL_RADIAL = 8;
const COIL_GROW_SECONDS = 0.9;
const COIL_SPIN = 9;
const COIL_SINK_SECONDS = 0.7;

interface Puddle {
  mesh: Mesh;
  radius: number;
  age: number;
}

interface Coil {
  mesh: Mesh;
  age: number;
  sinking: number;
}

interface Stream {
  bead: Mesh;
  thread: Mesh;
  /** Where the honey leaves its source. */
  source: { x: number; z: number; ground: number };
  /** Where the stream meets the surface below, trailing the source. */
  x: number;
  z: number;
  ground: number;
  top: number;
  bottom: number;
  topSpeed: number;
  bottomSpeed: number;
  flow: number;
  pouring: boolean;
  puddle: Puddle | "jar" | undefined;
  coil: Coil | undefined;
}

/** A stream running from a source that can move: lands, drizzles, thins. */
export interface Pour {
  /**
   * Moves the source to (x, from, z); `flow` (0 to 1) thins the stream as
   * its source runs dry. `intoJar` lands it on the jar's honey, not the floor.
   */
  steer: (x: number, z: number, from: number, intoJar: boolean, flow: number) => void;
  /** Stops the flow at its source; what is in the air still falls. */
  release: () => void;
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

// Turns that tighten and stack as they lay, rising a rope's width per turn.
const coilGeometry = () => {
  const points = Array.from({ length: COIL_TURNS * 16 + 1 }, (_, index) => {
    const t = index / (COIL_TURNS * 16);
    const angle = t * COIL_TURNS * Math.PI * 2;
    const radius = COIL_RADIUS * (1 - 0.35 * t);
    return new Vector3(
      Math.cos(angle) * radius,
      t * COIL_TURNS * THREAD * 1.3,
      Math.sin(angle) * radius,
    );
  });
  return new TubeGeometry(
    new CatmullRomCurve3(points),
    COIL_SEGMENTS,
    THREAD * 0.75,
    COIL_RADIAL,
    false,
  );
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

/** Honey that runs from a moving source: a thread that pools, drizzles, merges and creeps. */
export const createHoneyDrops = (world: Group) => {
  const beadGeometry = teardrop();
  // Thinner at the bottom: the stream speeds up as it falls.
  const threadGeometry = new CylinderGeometry(1, 0.55, 1, 12, 1, true).translate(0, 0.5, 0);
  const material = honeyMaterial(0.9);
  const puddleMaterial = thinHoneyMaterial();
  const up = new Vector3(0, 1, 0);
  const along = new Vector3();
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

  const removeCoil = (stream: Stream) => {
    if (stream.coil) {
      world.remove(stream.coil.mesh);
      stream.coil.mesh.geometry.dispose();
      stream.coil = undefined;
    }
  };

  const removeStream = (stream: Stream) => {
    world.remove(stream.bead, stream.thread);
    removeCoil(stream);
  };

  const surfaceUnder = (stream: Stream) =>
    stream.puddle === "jar" || stream.puddle === undefined
      ? stream.ground
      : stream.puddle.mesh.position.y + stream.puddle.mesh.scale.y * 0.8;

  // Grows the coil while honey still runs into it; sinks it once the thread is gone.
  const stepCoil = (stream: Stream, seconds: number, running: boolean) => {
    if (!stream.coil && running && stream.puddle !== undefined) {
      const mesh = new Mesh(coilGeometry(), material);
      mesh.geometry.setDrawRange(0, 0);
      world.add(mesh);
      stream.coil = { age: 0, mesh, sinking: 0 };
    }
    const { coil } = stream;
    if (!coil) {
      return false;
    }
    if (running) {
      coil.age += seconds;
      coil.mesh.rotation.y -= COIL_SPIN * seconds;
    } else {
      coil.sinking += seconds;
    }
    const grown = Math.min(1, coil.age / COIL_GROW_SECONDS);
    coil.mesh.geometry.setDrawRange(0, Math.floor(grown * COIL_SEGMENTS) * COIL_RADIAL * 6);
    const left = 1 - coil.sinking / COIL_SINK_SECONDS;
    if (left <= 0) {
      removeCoil(stream);
      return false;
    }
    const width = Math.sqrt(stream.flow);
    coil.mesh.scale.set(width, left * width, width);
    coil.mesh.position.set(stream.x, surfaceUnder(stream) - (1 - left) * THREAD, stream.z);
    return true;
  };

  /** Starts a stream from (x, from, z). */
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
      bead,
      bottom: from,
      bottomSpeed: 0,
      coil: undefined,
      flow: 1,
      ground,
      pouring: true,
      puddle: undefined,
      source: { ground, x, z },
      thread,
      top: from,
      topSpeed: 0,
      x,
      z,
    };
    streams.push(stream);
    return {
      release: () => {
        stream.pouring = false;
      },
      steer: (toX, toZ, toFrom, toJar, flow) => {
        if (stream.pouring) {
          stream.source = { ground: toJar ? HONEY_LEVEL : 0, x: toX, z: toZ };
          stream.top = toFrom;
          stream.flow = Math.max(0.05, Math.min(1, flow));
        }
      },
    };
  };

  const trail = (stream: Stream, seconds: number) => {
    const k = 1 - Math.exp(-TRAIL_RATE * seconds);
    stream.x += (stream.source.x - stream.x) * k;
    stream.z += (stream.source.z - stream.z) * k;
    if (stream.puddle === undefined) {
      stream.ground = stream.source.ground;
      return;
    }
    if (stream.source.ground !== stream.ground) {
      removeCoil(stream);
      stream.ground = stream.source.ground;
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
      stream.puddle = land(
        stream.x,
        stream.z,
        sphereVolume(THREAD * 1.6 * Math.sqrt(stream.flow)),
        false,
      );
    }
  };

  const stepStream = (stream: Stream, seconds: number) => {
    if (stream.pouring) {
      trail(stream, seconds);
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
        volumeRadius(sphereVolume(puddle.radius) + FEED * stream.flow * seconds),
      );
      puddle.age = Math.min(puddle.age, SQUASH_SECONDS + 0.6);
    }
    const stretch = 1 + Math.min(stream.bottomSpeed * 0.04, 0.6);
    stream.bead.position.set(stream.x, stream.bottom + BEAD, stream.z);
    stream.bead.scale.set(BEAD / Math.sqrt(stretch), BEAD * stretch, BEAD / Math.sqrt(stretch));
    // The thread hangs from the source to where it lands, so it leans as the source moves.
    const base = stream.bottom + (stream.puddle === undefined ? BEAD * 2 : 0);
    stream.thread.position.set(stream.x, base, stream.z);
    along.set(
      stream.source.x - stream.x,
      Math.max(0, stream.top - base),
      stream.source.z - stream.z,
    );
    const span = along.length();
    if (span > 1e-4) {
      stream.thread.quaternion.setFromUnitVectors(up, along.divideScalar(span));
    }
    const width = THREAD * Math.sqrt(stream.flow);
    stream.thread.scale.set(width, length > 0 ? Math.max(0.0001, span) : 0.0001, width);
    const coiling = stepCoil(stream, seconds, length > 0);
    return stream.top > stream.ground || coiling;
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
