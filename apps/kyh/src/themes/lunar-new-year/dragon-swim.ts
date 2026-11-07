// How the dragon gets about (`dragon.ts`): it swims. It has a heading and a
// speed and goes only along its nose, steering no tighter than a turning
// radius, so it can't pivot, stop short or swing round on the spot: a turn is
// a curve its body then lies along (`dragon-trail.ts`). A turn past a certain
// size is committed to, one way, till it's done. Stepped in fixed pieces, so
// its path is the same at any frame rate. On the ground: x along the screen,
// z toward the camera (a screen pixel down is 1 / sin(PITCH) of it), in its
// pixels. Pure (state is stepped in place, for a frame's sake).
import type { Spring } from "../follower/solid";
import type { Mark, Trail } from "./dragon-trail";
import { PITCH, smooth, springAt, stepSpring } from "../follower/solid";
import { createTrail, extendTrail } from "./dragon-trail";

/** Where it wants to go this step. */
export interface Course {
  heading: number;
  speed: number;
  /** The tightest it'll turn, pixels. */
  radius: number;
  /** Radians either side of its heading that it weaves. */
  weave: number;
  /** Pixels up it would swim. */
  height: number;
}

export interface Swim {
  x: number;
  z: number;
  /** Pixels up. */
  h: Spring;
  /** Which way it's going, radians: 0 to the right, a quarter turn toward the camera. */
  heading: number;
  /** How fast its heading's turning, radians a second, and how fast it's going, pixels a second. */
  turn: number;
  speed: number;
  /** Which way round a big turn's committed to, till it's done; 0, none. */
  committed: -1 | 0 | 1;
  /** Its weave's place, radians: it goes on with distance, so its body's waves stay one length. */
  weave: number;
  /** How far it's rolled into its turn (radians, + its top to its left). */
  roll: Spring;
  trail: Trail;
}

/** Seconds a step: fine enough that it's stepped at least once in a 240Hz frame. */
export const STEP = 1 / 240;
/** Fastest it goes on the screen, pixels a second: straight up it, that's far more of the ground. */
const TOP = 560;
/** How hard it speeds up and brakes, screen pixels a second squared. */
const SPEEDS_UP = 900;
const BRAKES = 2400;
/** How hard it turns at most (radians a second), and how quickly it takes up a turn (a second). */
export const MOST_TURN = 6.5;
const TAKES_TURN = 16;
/** How much of how far it's off its heading it turns by, a second. */
const STEERS = 8;
/** Off by more than this it commits to a way round; within this it's come round. */
const COMMIT = 2.2;
const COMPLETE = 1;
/** Ground pixels of one whole weave. */
const WEAVE_LENGTH = 104;

const SIN = Math.sin(PITCH);

export const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** How much of a ground pixel going this way shows on the screen. */
const shownOf = (heading: number) => Math.hypot(Math.cos(heading), Math.sin(heading) * SIN);

/** Its top speed on the ground this way. */
export const topOf = (heading: number) => TOP / shownOf(heading);

export const createSwim = (x: number, z: number, heading: number, reach: number): Swim => {
  const head: Mark = { h: 0, roll: 0, x, z };
  return {
    committed: 0,
    h: springAt(0),
    heading,
    roll: springAt(0),
    speed: 0,
    trail: createTrail(head, heading, reach),
    turn: 0,
    weave: 0,
    x,
    z,
  };
};

/** How far it has to turn, the way it's committed to if it's in a big turn. */
const offOf = (swim: Swim, goal: number) => {
  const off = wrap(goal - swim.heading);
  const size = Math.abs(off);
  if (size < COMPLETE) {
    swim.committed = 0;
  } else if (size > COMMIT && swim.committed === 0) {
    // Already turning, it carries on that way; else round by the camera, so its face shows.
    const through = Math.abs(swim.turn) > 1 ? swim.turn : wrap(Math.PI / 2 - swim.heading);
    swim.committed = through >= 0 ? 1 : -1;
  }
  if (swim.committed !== 0 && Math.sign(off) !== swim.committed) {
    return off + swim.committed * Math.PI * 2;
  }
  return off;
};

export const stepSwim = (swim: Swim, course: Course, h: number) => {
  const weaved = course.heading + Math.sin(swim.weave) * course.weave;
  const off = offOf(swim, weaved);
  const most = Math.min(MOST_TURN, Math.max(swim.speed, 16) / course.radius);
  const want = Math.max(-most, Math.min(most, off * STEERS));
  swim.turn += (want - swim.turn) * (1 - Math.exp(-TAKES_TURN * h));
  // Stopped, it can't turn: it has to swim round.
  swim.heading = wrap(swim.heading + swim.turn * Math.min(1, swim.speed / 16) * h);
  // Slowing for a sharp turn, so it's a curve and not a skid.
  const easing = 1 - 0.4 * smooth((Math.abs(off) - 0.7) / 1.5);
  const goal = Math.min(course.speed * easing, topOf(swim.heading) * 1.4);
  const shown = shownOf(swim.heading);
  const change = ((goal > swim.speed ? SPEEDS_UP : BRAKES) * h) / shown;
  swim.speed += Math.max(-change, Math.min(change, goal - swim.speed));
  swim.x += Math.cos(swim.heading) * swim.speed * h;
  swim.z += Math.sin(swim.heading) * swim.speed * h;
  swim.weave += ((Math.PI * 2) / WEAVE_LENGTH) * swim.speed * h;
  stepSpring(swim.h, course.height, 7, h);
  const bank = swim.turn * Math.min(swim.speed, 300) * 0.0035;
  stepSpring(swim.roll, Math.max(-1, Math.min(1, bank)), 8, h);
  extendTrail(swim.trail, { h: swim.h.x, roll: swim.roll.x, x: swim.x, z: swim.z });
};
