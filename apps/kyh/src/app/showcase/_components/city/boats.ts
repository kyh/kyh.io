import type { Ground, Held } from "./carry";
import type { Spot } from "./net";
import { carryTo, flightOf, pickUp, throwOf } from "./carry";
import { clamp, easeInOut, lerp } from "./ease";
import { CENTER, inland } from "./plan";

/** How many sailboats circle the island; the ferry, when there's a pier, comes after them. */
export const SAILBOATS = 3;
const REJOIN = 4;
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

interface Course {
  speed: number;
  start: number;
  at: (u: number, time: number) => BoatPose;
}

const sea = (angle: number, rx: number, rz: number) => ({
  x: CENTER + Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
  z: CENTER - Math.cos(angle) * rx * Math.SQRT1_2 - Math.sin(angle) * rz * Math.SQRT1_2,
});

const loopOf = (index: number) => {
  const direction = index % 2 === 0 ? 1 : -1;
  const rx = 42 + index * 2.5;
  const rz = 33 + index * 2;

  return {
    at: (u, time) => {
      const here = sea(u, rx, rz);
      const ahead = sea(u + direction * 0.01, rx, rz);

      return {
        heading: -Math.atan2(ahead.z - here.z, ahead.x - here.x),
        held: false,
        x: here.x,
        y: Math.sin(time * 1.5 + index) * 0.02 - 0.03,
        z: here.z,
      };
    },
    speed: (0.012 + index * 0.004) * direction,
    start: index * 2.1,
  };
};

const ferryOf = (pier: { x: number; z: number; d: number }) => ({
  at: (u) => ({
    heading: Math.cos(u) > 0 ? -Math.PI / 2 : Math.PI / 2,
    held: false,
    x: pier.x + 1,
    y: -0.02,
    z: pier.z + pier.d + 0.6 + ((Math.sin(u) + 1) / 2) * 9,
  }),
  speed: 0.06,
  start: 0,
});

const along = (course: Course, time: number, phase: number) =>
  course.at(time * course.speed + course.start + phase, time);

const phaseNear = (course: Course, time: number, x: number, z: number) => {
  let best = { distance: Infinity, u: 0 };

  for (let step = 0; step < 360; step += 1) {
    const u = (step / 360) * Math.PI * 2;
    const at = course.at(u, time);
    const distance = Math.hypot(at.x - x, at.z - z);

    if (distance < best.distance) {
      best = { distance, u };
    }
  }

  return best.u - time * course.speed - course.start;
};

const turnToward = (a: number, b: number, k: number) => {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));

  return a + delta * k;
};

export const createBoats = (pier: { x: number; z: number; d: number } | null) => {
  const courses: Course[] = [
    ...Array.from({ length: SAILBOATS }, (_, index) => loopOf(index)),
    ...(pier ? [ferryOf(pier)] : []),
  ];

  const boats: Boat[] = courses.map(() => ({ kind: "sailing", phase: 0 }));

  const poseOf = (index: number, time: number) => {
    const boat = boats[index];
    const route = courses[index];

    if (!boat || !route) {
      throw new RangeError(`no boat ${index}`);
    }

    const course = along(route, time, boat.phase);

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
    carry: (pointer: Spot, ground: Ground, nowMs: number) => {
      for (const [index, boat] of boats.entries()) {
        if (boat.kind === "held") {
          boats[index] = { ...boat, held: carryTo(ground, boat.held, pointer, nowMs) };
        }
      }
    },
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
    letGo: (time: number) => {
      for (const [index, boat] of boats.entries()) {
        const route = courses[index];

        if (boat.kind === "held" && route) {
          const { from, toward } = throwOf(boat.held);
          const wet = inland(toward.x, toward.z) < OFFSHORE;
          const near = along(route, time, phaseNear(route, time, toward.x, toward.z));
          const to = wet ? { ...near, x: toward.x, z: toward.z } : near;
          const flight = flightOf(from, { heading: to.heading, x: to.x, z: to.z }) / 1000;
          boats[index] = {
            flight,
            from,
            kind: "falling",
            phase: phaseNear(route, time + flight, to.x, to.z),
            start: time,
            to,
          };
        }
      }
    },
    poses: (time: number) => boats.map((_, index) => poseOf(index, time)),
  };
};

export type Boats = ReturnType<typeof createBoats>;
