// The sailboats round the island, and lifting one out of the water: it's
// carried like a car (carry.ts), falls where it's thrown, or back to its own
// course if that's on land, and eases from where it splashed down back onto
// its loop. Only this visitor sees it: boats sail on each page's own clock.
// Pure: time (seconds) and what's underfoot come in.
import type { Ground, Held } from "./carry";
import type { Spot } from "./net";
import { carryTo, flightOf, pickUp, throwOf } from "./carry";
import { clamp, easeInOut, lerp } from "./ease";
import { CENTER, inland } from "./plan";

export const BOATS = 3;
/** How long a boat let go takes to ease back onto its course (s). */
const REJOIN = 4;
/** How bad a landing spot may be and still be sea: a cell off the shore. */
const OFFSHORE = -1;

export interface BoatPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** In the hand: drawn clear of the roofs. */
  held: boolean;
}

type Boat =
  | { kind: "sailing"; phase: number }
  | { kind: "held"; phase: number; held: Held }
  | { kind: "falling"; phase: number; from: Spot; to: BoatPose; start: number; flight: number };

/** A point on a tilted ellipse round the island. */
const sea = (angle: number, rx: number, rz: number) => ({
  x: CENTER + Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
  z: CENTER - Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
});

const courseOf = (index: number) => {
  const direction = index % 2 === 0 ? 1 : -1;
  return {
    direction,
    rx: 42 + index * 2.5,
    rz: 33 + index * 2,
    speed: (0.012 + index * 0.004) * direction,
    start: index * 2.1,
  };
};

/** Where boat `index` is on its loop round the island, nose along the way. */
const sailing = (index: number, time: number, phase: number): BoatPose => {
  const course = courseOf(index);
  const angle = time * course.speed + course.start + phase;
  const here = sea(angle, course.rx, course.rz);
  const ahead = sea(angle + course.direction * 0.01, course.rx, course.rz);
  return {
    heading: -Math.atan2(ahead.z - here.z, ahead.x - here.x),
    held: false,
    x: here.x,
    y: Math.sin(time * 1.5 + index) * 0.02 - 0.03,
    z: here.z,
  };
};

/** The phase that puts boat `index` on the point of its loop nearest (x, z) at `time`. */
const phaseNear = (index: number, time: number, x: number, z: number) => {
  const course = courseOf(index);
  let best = { angle: 0, distance: Infinity };
  for (let step = 0; step < 360; step += 1) {
    const angle = (step / 360) * Math.PI * 2;
    const at = sea(angle, course.rx, course.rz);
    const distance = Math.hypot(at.x - x, at.z - z);
    if (distance < best.distance) {
      best = { angle, distance };
    }
  }
  return best.angle - time * course.speed - course.start;
};

/** Turns `a` toward `b` the short way round. */
const turnToward = (a: number, b: number, k: number) => {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * k;
};

export const createBoats = () => {
  const boats: Boat[] = Array.from({ length: BOATS }, () => ({ kind: "sailing", phase: 0 }));

  const poseOf = (index: number, time: number): BoatPose => {
    const boat = boats[index];
    if (!boat) {
      return sailing(index, time, 0);
    }
    const course = sailing(index, time, boat.phase);
    if (boat.kind === "held") {
      return {
        ...course,
        held: true,
        x: boat.held.spot.x,
        y: boat.held.altitude,
        z: boat.held.spot.z,
      };
    }
    if (boat.kind === "sailing") {
      return course;
    }
    const t = clamp((time - boat.start) / boat.flight, 0, 1);
    if (t < 1) {
      // Out of the hand and down into the water, a little arc on the way.
      const k = easeInOut(t);
      return {
        heading: boat.to.heading,
        held: false,
        x: lerp(boat.from.x, boat.to.x, k),
        y: lerp(boat.from.y, boat.to.y, t * t) + Math.sin(t * Math.PI) * 0.25,
        z: lerp(boat.from.z, boat.to.z, k),
      };
    }
    const settle = (time - boat.start - boat.flight) / REJOIN;
    if (settle >= 1) {
      boats[index] = { kind: "sailing", phase: boat.phase };
      return course;
    }
    const k = easeInOut(settle);
    return {
      heading: turnToward(boat.to.heading, course.heading, k),
      held: false,
      x: lerp(boat.to.x, course.x, k),
      y: course.y,
      z: lerp(boat.to.z, course.z, k),
    };
  };

  return {
    /** Carry the held boat, if any, to follow the pointer. */
    carry: (pointer: Spot, ground: Ground, nowMs: number) => {
      for (const [index, boat] of boats.entries()) {
        if (boat.kind === "held") {
          boats[index] = { ...boat, held: carryTo(ground, boat.held, pointer, nowMs) };
        }
      }
    },
    /** Take hold of boat `index`, drawn at `drawn`, with the pointer at `pointer`. */
    grab: (index: number, drawn: BoatPose, pointer: Spot, ground: Ground, nowMs: number) => {
      const boat = boats[index];
      if (!boat || boat.kind === "held") {
        return false;
      }
      boats[index] = {
        held: pickUp(ground, `b${index}`, drawn, pointer, nowMs),
        kind: "held",
        phase: boat.phase,
      };
      return true;
    },
    get holding() {
      return boats.some((boat) => boat.kind === "held");
    },
    /** Let go: it's flung the way it was moving, into the sea, or back to its course if that's land. */
    letGo: (time: number) => {
      for (const [index, boat] of boats.entries()) {
        if (boat.kind === "held") {
          const { from, toward } = throwOf(boat.held);
          const wet = inland(toward.x, toward.z) < OFFSHORE;
          const near = sailing(index, time, phaseNear(index, time, toward.x, toward.z));
          const to = wet ? { ...near, x: toward.x, z: toward.z } : near;
          const flight = flightOf(from, { heading: to.heading, x: to.x, z: to.z }) / 1000;
          boats[index] = {
            flight,
            from,
            kind: "falling",
            phase: phaseNear(index, time + flight, to.x, to.z),
            start: time,
            to,
          };
        }
      }
    },
    /** Where each boat is now. */
    poses: (time: number) => Array.from({ length: BOATS }, (_, index) => poseOf(index, time)),
  };
};

export type Boats = ReturnType<typeof createBoats>;
