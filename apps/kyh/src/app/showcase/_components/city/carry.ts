// Picking something up, as a sim game does: it stays where the hand took
// hold of it on screen, rises as it's carried (its shadow sliding out below,
// on whatever's under it, a roof or the street), and is thrown the way it
// was moving when let go. Pure: the camera's view and what's underfoot come in.
import type { Pose } from "./traffic";
import type { Spot } from "./net";
import type { Vec3 } from "./sketch";
import { clamp } from "./ease";

/** How far above what's under it something held, or dropped by someone who left, falls from. */
export const LIFT = 0.9;
/** How far above what's under it something carried hangs once it's lifted. */
export const HANG = LIFT - 0.18;
/** How far something has to be carried, in cells, before it hangs at full height. */
const LIFT_SPAN = 1.2;
/** How many of a carry's last moves its throw is read from. */
const SAMPLES = 12;

/** What the hand works against: which way the camera looks, and how high what's underfoot is. */
export interface Ground {
  /** Toward the camera. */
  view: Vec3;
  surfaceAt: (x: number, z: number) => number;
}

export interface Held {
  key: string;
  /** Its ground point: it hangs above it, casts its shadow on it, and lands on it. */
  spot: Spot;
  /** How high it hangs: on the view ray through where it's seen, so it stays in the hand. */
  altitude: number;
  /**
   * Where on screen it was grabbed, from the pointer, as ground points that
   * look the same: kept so it stays exactly where the hand took hold of it.
   */
  offset: { x: number; z: number };
  /** Where it is on screen now, as a ground point. */
  seen: { x: number; z: number };
  /** How far off the ground it's come, 0 to 1: nothing when picked up, all of HANG once carried LIFT_SPAN. */
  lift: number;
  /** Its last moves, for how it's thrown. */
  samples: { t: number; x: number; z: number }[];
}

/**
 * Where something hangs, `height` over whatever's below, to look like it's at
 * `seen` (a ground point on screen): the point up the view ray at that
 * altitude, and the ground point under it. What's below depends on where that
 * lands, so it's found twice; either way the thing stays on its point of the
 * ray, so it never leaves the hand.
 */
export const hangingOver = (
  { view, surfaceAt }: Ground,
  seen: { x: number; z: number },
  height: number,
) => {
  const under = (altitude: number): Spot => {
    const up = altitude / view[1];
    return { x: seen.x + view[0] * up, y: 0, z: seen.z + view[2] * up };
  };
  let altitude = surfaceAt(seen.x, seen.z) + height;
  for (let pass = 0; pass < 2; pass += 1) {
    const spot = under(altitude);
    altitude = surfaceAt(spot.x, spot.z) + height;
  }
  return { altitude, spot: under(altitude) };
};

/** Takes hold of `key`, drawn at `drawn`, with the pointer at `pointer` on the ground: it stays where it was on screen. */
export const pickUp = (
  ground: Ground,
  key: string,
  drawn: { x: number; y: number; z: number } | undefined,
  pointer: Spot,
  t: number,
): Held => {
  // Where it is on screen, as a ground point: down the view ray from where it's drawn.
  const { view } = ground;
  const seen = drawn
    ? { x: drawn.x - (view[0] * drawn.y) / view[1], z: drawn.z - (view[2] * drawn.y) / view[1] }
    : pointer;
  const { altitude, spot } = hangingOver(ground, seen, 0);
  return {
    altitude,
    key,
    lift: 0,
    offset: { x: seen.x - pointer.x, z: seen.z - pointer.z },
    samples: [{ t, x: spot.x, z: spot.z }],
    seen,
    spot,
  };
};

/** Carries what's held to follow the pointer, rising as it goes. */
export const carryTo = (ground: Ground, held: Held, pointer: Spot, t: number): Held => {
  const seen = { x: pointer.x + held.offset.x, z: pointer.z + held.offset.z };
  const moved = Math.hypot(seen.x - held.seen.x, seen.z - held.seen.z);
  const lift = Math.min(1, held.lift + moved / LIFT_SPAN);
  const { altitude, spot } = hangingOver(ground, seen, HANG * lift);
  return {
    ...held,
    altitude,
    lift,
    samples: [...held.samples, { t, x: spot.x, z: spot.z }].slice(-SAMPLES),
    seen,
    spot,
  };
};

/** Cells per second over the last moments of a carry. */
const velocityOf = (samples: Held["samples"]) => {
  const last = samples.at(-1);
  const first = samples.find((sample) => last && last.t - sample.t < 140) ?? last;
  if (!last || !first || last.t - first.t < 16) {
    return { x: 0, z: 0 };
  }
  const seconds = (last.t - first.t) / 1000;
  return { x: (last.x - first.x) / seconds, z: (last.z - first.z) / seconds };
};

/** Lets go: where it falls from, and where it's flung toward, the way it was moving. */
export const throwOf = (held: Held) => {
  const from: Spot = { ...held.spot, y: held.altitude };
  const velocity = velocityOf(held.samples);
  const speed = Math.hypot(velocity.x, velocity.z);
  const reach = Math.min(4, speed * 0.26);
  const toward = speed > 0.01 ? { x: velocity.x / speed, z: velocity.z / speed } : { x: 0, z: 0 };
  return { from, toward: { x: from.x + toward.x * reach, z: from.z + toward.z * reach } };
};

/** A shadow's size for something this high off what's under it: none on the ground. */
export const shadowFor = (height: number) => (height > 0.06 ? clamp(1 - height / 2.4, 0.35, 1) : 0);

/** How long a thing let go at `from` takes to land at `to` (ms). */
export const flightOf = (from: Spot, to: Pose) =>
  Math.min(760, 360 + Math.hypot(to.x - from.x, to.z - from.z) * 55 + from.y * 60);
