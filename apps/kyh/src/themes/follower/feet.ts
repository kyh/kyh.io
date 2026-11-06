// Feet that stay where they're set down, for a follower on legs: each foot
// on the ground stays just where it landed while the body goes on over it,
// then lifts and swings to where it'll land next (as far ahead of where it
// stands as it'll be left behind when it next lifts, and on by as far as the
// body goes while it swings), so however the follower turns, hurries, slows
// or stops, a foot never slides or moonwalks. Its feet take turns, once a
// stride each; its cadence follows its pace, and its steps are never longer
// than its legs reach. Stopped, it takes a step or two to stand neat, and
// stands. Feet live in the screen's pixels, absolute (as a chain's knots do,
// `chain.ts`); the ground is the screen's across and its up and down
// stretched back out of the camera's foreshortening (`groundOf`), so a step
// toward the camera is as long as one across. A pose in the round turns a
// foot into its own 3D (`footIn`) and bends a leg to it (`legTo`). Pure
// (state is stepped in place, for a frame's sake).
import type { Vec3 } from "./solid";
import type { Point, Walker } from "./walk";
import { add, dot, normalize, PITCH, scale, sub } from "./solid";

const SIN = Math.sin(PITCH);

/** A point on the screen as a point of the ground: its up and down stretched back out of the camera's foreshortening. */
export const groundOf = (at: Point): Point => ({ x: at.x, y: at.y / SIN });

/** A point of the ground back on the screen. */
export const screenOf = (at: Point): Point => ({ x: at.x, y: at.y * SIN });

export interface Foot {
  /** Where it is on the screen (under it, on the ground, while it's lifted). */
  x: number;
  y: number;
  /** Which way its toes point, a heading (`solid.ts`): set as it lands. */
  turn: number;
  /** How high it's lifted off the ground, ground pixels: 0 on the ground. */
  lift: number;
  planted: boolean;
  /** Where its swing set off from, on the screen, and how far through the swing it is, 0 to 1. */
  from: Point;
  swing: number;
  /** The stride it last stepped in: it steps once a stride. */
  stride: number;
}

export interface Feet {
  feet: Foot[];
  /** Strides walked: the fraction is where its feet are in the stride. */
  phase: number;
  /** Strides a second it's stepping at: 0 standing. */
  cadence: number;
  /** Where the body was at the last step, on the screen: a long frame's move is stepped through, not leapt. */
  was: Point;
}

/** Where a foot stands at rest, ground pixels about the walker: ahead along its heading, and to its left. */
export interface Home {
  ahead: number;
  left: number;
}

/** How a follower steps. Distances in ground pixels (`groundOf`): the screen's, across. */
export interface Steps {
  /** Each foot's place at rest. */
  homes: readonly Home[];
  /** When in the stride each foot steps, 0 to 1: a biped's two half a stride apart. */
  offsets: readonly number[];
  /** The farthest a foot on the ground gets from its place: about as far as its leg reaches. */
  reach: number;
  /** Its walking pace at the fastest, ground pixels a second. */
  top: number;
  /** Strides a second, walking slowest and at `top`: quicker if its steps would outreach its legs. */
  cadence: readonly [number, number];
  /** The share of a stride each foot's on the ground, walking slowest and at `top`. */
  duty: readonly [number, number];
  /** How high a foot's lifted mid-swing, walking slowest and at `top`. */
  lift: readonly [number, number];
  /**
   * Optional: a foot on the ground this many reaches from its place lifts at
   * once, its turn or not (a sharp turn, a reversal), and may do so once every
   * other foot is on the ground or this far through its swing (0 to 1).
   * Left out, 1.25 reaches and only with the others down.
   */
  strain?: { reach: number; swung: number };
}

/** Something on feet: where it is on the screen, and how fast it's going (pixels a second). A walker. */
export interface Body extends Point {
  vx: number;
  vy: number;
}

/** The longest step it takes, seconds: after a slow frame or a hidden tab it doesn't leap. */
const MOST_STEP = 0.05;
/** Slower than this over the ground (pixels a second) it's standing. */
const STANDING = 6;
/** Within this share of its reach of its place, a foot stands neat. */
const NEAT = 0.15;
/** A foot this many reaches from its place has been left behind (a leap, a hidden tab): set down afresh. */
const LEFT_BEHIND = 4;
/** A foot on the ground this many reaches from its place lifts at once, its turn or not (a sharp turn). */
const STRAINED = 1.25;
/** Its steps fit this share of its legs' reach, either way: a frame's slack to spare. */
const FIT = 0.8;

const between = (range: readonly [number, number], t: number) =>
  range[0] + (range[1] - range[0]) * t;

/** How far apart two points of the screen are, on the ground. */
export const apart = (a: Point, b: Point) => Math.hypot(a.x - b.x, (a.y - b.y) / SIN);

/** How fast it's going over the ground, pixels a second. */
export const groundSpeedOf = (body: Body) => Math.hypot(body.vx, body.vy / SIN);

/** Where foot `index` stands at rest, on the screen, for a body facing `heading` (radians, as `solid.ts`'s). */
export const homeOf = (steps: Steps, index: number, body: Point, heading: number): Point => {
  const home = steps.homes[index] ?? { ahead: 0, left: 0 };
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return {
    x: body.x + home.ahead * cos - home.left * sin,
    y: body.y + (home.ahead * sin + home.left * cos) * SIN,
  };
};

export const createFeet = (steps: Steps, body: Point, heading: number): Feet => ({
  cadence: 0,
  feet: steps.homes.map((_, index) => {
    const { x, y } = homeOf(steps, index, body, heading);
    return { from: { x, y }, lift: 0, planted: true, stride: -1, swing: 0, turn: heading, x, y };
  }),
  phase: 0,
  was: { x: body.x, y: body.y },
});

/** Strides a second it steps at, going `speed` (0 standing neat); `duty` its share on the ground. */
const cadenceOf = (
  feet: Feet,
  steps: Steps,
  homes: readonly Point[],
  speed: number,
  duty: number,
) => {
  if (speed > STANDING) {
    const least = (speed * duty) / (2 * steps.reach * FIT);
    return Math.max(between(steps.cadence, Math.min(1, speed / steps.top)), least);
  }
  // Standing: a step or two to stand neat, then still.
  const neat = feet.feet.every(
    (foot, index) => foot.planted && apart(foot, homes[index] ?? foot) < steps.reach * NEAT,
  );
  return neat ? 0 : between(steps.cadence, 0.5);
};

/** The headings' difference, the short way round. */
const turnBetween = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Where a swinging foot will land: its place then, and half a stance on, kept within its legs' reach. */
const landingOf = (
  foot: Foot,
  home: Point,
  body: Body,
  swinging: { cadence: number; duty: number; reach: number },
) => {
  const { cadence, duty, reach } = swinging;
  const left = ((1 - foot.swing) * (1 - duty)) / cadence;
  const ahead = left + duty / cadence / 2;
  const target = { x: home.x + body.vx * ahead, y: home.y + body.vy * ahead };
  const far = apart(target, home);
  const most = reach * FIT;
  if (far <= most) {
    return target;
  }
  return {
    x: home.x + ((target.x - home.x) * most) / far,
    y: home.y + ((target.y - home.y) * most) / far,
  };
};

/** Steps a lifted foot on through its swing, landing it at its end. */
const swingFoot = (
  foot: Foot,
  steps: Steps,
  moved: {
    body: Body;
    cadence: number;
    duty: number;
    heading: number;
    home: Point;
    t: number;
  },
  dt: number,
) => {
  const { body, cadence, duty, heading, home, t } = moved;
  foot.swing = Math.min(1, foot.swing + (dt * cadence) / (1 - duty));
  const target = landingOf(foot, home, body, { cadence, duty, reach: steps.reach });
  if (foot.swing >= 1) {
    Object.assign(foot, { lift: 0, planted: true, turn: heading, x: target.x, y: target.y });
    return;
  }
  const u = foot.swing;
  const eased = u * u * (3 - 2 * u);
  const length = apart(foot.from, target);
  const high = between(steps.lift, t) * Math.min(1, Math.max(0.35, length / steps.reach));
  foot.x = foot.from.x + (target.x - foot.from.x) * eased;
  foot.y = foot.from.y + (target.y - foot.from.y) * eased;
  foot.lift = high * Math.sin(u * Math.PI);
  foot.turn += turnBetween(foot.turn, heading) * Math.min(1, dt * 12);
};

/** Whether a foot on the ground's left so far from its place it lifts at once, the others down (or far enough through their swing). */
const isStrained = (feet: Feet, steps: Steps, foot: Foot, home: Point) => {
  const { reach = STRAINED, swung = 1 } = steps.strain ?? {};
  const others = feet.feet.every(
    (other) => other === foot || other.planted || other.swing >= swung,
  );
  return others && apart(foot, home) > steps.reach * reach;
};

/** One step of its feet, `dt` seconds, under the body where it is now. */
const stepOnce = (feet: Feet, steps: Steps, body: Body, heading: number, dt: number) => {
  const homes = steps.homes.map((_, index) => homeOf(steps, index, body, heading));
  const lost = feet.feet.some(
    (foot, index) => apart(foot, homes[index] ?? foot) > steps.reach * LEFT_BEHIND,
  );
  if (feet.feet.length !== steps.homes.length || lost) {
    Object.assign(feet, createFeet(steps, body, heading));
    return;
  }
  const speed = groundSpeedOf(body);
  const moving = speed > STANDING;
  const t = Math.min(1, speed / steps.top);
  const duty = between(steps.duty, t);
  feet.cadence = cadenceOf(feet, steps, homes, speed, duty);
  if (feet.cadence <= 0) {
    return;
  }
  feet.phase += feet.cadence * dt;
  for (const [index, foot] of feet.feet.entries()) {
    const home = homes[index] ?? foot;
    const at = feet.phase + (steps.offsets[index] ?? 0);
    const stride = Math.floor(at);
    if (foot.planted) {
      const due = at - stride >= duty && stride > foot.stride;
      const strained = moving && isStrained(feet, steps, foot, home);
      // Standing, a foot already neat stays put when its turn comes.
      const neat = !moving && apart(foot, home) < steps.reach * NEAT;
      if (due || strained) {
        // Lifted well before its turn, it still steps on its turn this stride.
        foot.stride = due || at - stride >= duty - 0.3 ? stride : stride - 1;
        if (!neat) {
          Object.assign(foot, { from: { x: foot.x, y: foot.y }, planted: false, swing: 0 });
        }
      }
    }
    if (!foot.planted) {
      swingFoot(foot, steps, { body, cadence: feet.cadence, duty, heading, home, t }, dt);
    }
  }
};

/** The longest it steps its feet at once, seconds: a slow frame's stepped through in these. */
const SUBSTEP = 1 / 120;

/**
 * Steps its feet `seconds` on under a body (a walker: where it is and how
 * fast it's going, on the screen) facing `heading` (radians, `solid.ts`'s).
 * The body's carried from where it was to where it is over them, so a long
 * frame lifts and sets each foot down when it would have, not a frame late.
 */
export const stepFeet = (
  feet: Feet,
  steps: Steps,
  body: Body,
  heading: number,
  seconds: number,
) => {
  const dt = Math.min(Math.max(seconds, 0), MOST_STEP);
  const from = feet.was ?? body;
  const count = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-9));
  for (let step = 1; step <= count; step += 1) {
    const t = step / count;
    const at = { ...body, x: from.x + (body.x - from.x) * t, y: from.y + (body.y - from.y) * t };
    stepOnce(feet, steps, at, heading, dt / count);
  }
  feet.was = { x: body.x, y: body.y };
};

/**
 * A foot in a pose's own 3D (x right, y up, z toward the camera, `solid.ts`),
 * about the screen point `origin` its drawing's about, in a drawing scaled by `size`.
 */
export const footIn = (foot: Foot, origin: Point, size = 1): Vec3 => [
  (foot.x - origin.x) / size,
  foot.lift / size,
  (foot.y - origin.y) / SIN / size,
];

/**
 * A two-boned leg in 3D from `hip` toward `foot`, bones `upper` and `lower`
 * long, its joint bent toward `pole` (a direction: back, for a bird's hock).
 * Its `end` is the foot, or, out of reach, as far toward it as the leg goes.
 */
export const legTo = (hip: Vec3, foot: Vec3, upper: number, lower: number, pole: Vec3) => {
  const toward = sub(foot, hip);
  const distance = Math.hypot(toward[0], toward[1], toward[2]);
  const reach = Math.max(Math.abs(upper - lower) + 0.01, Math.min(upper + lower - 0.01, distance));
  const along = distance > 1e-6 ? scale(toward, 1 / distance) : ([0, -1, 0] as const);
  // How far along the line the joint sits, and how far out from it toward the pole.
  const down = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const out = Math.sqrt(Math.max(0, upper * upper - down * down));
  const side = sub(pole, scale(along, dot(pole, along)));
  const bend = normalize(Math.hypot(side[0], side[1], side[2]) > 1e-6 ? side : [1, 0, 0]);
  return {
    end: add(hip, scale(along, reach)),
    joint: add(add(hip, scale(along, down)), scale(bend, out)),
  };
};

/**
 * Holds a walker to `top` pixels a second over the ground: so it goes no
 * faster toward or away from the camera than across, its steps the same
 * length. Call it after the walker's step, with the same `seconds`.
 */
export const keepPace = (walker: Walker, top: number, seconds: number) => {
  const speed = groundSpeedOf(walker);
  if (speed <= top) {
    return;
  }
  const dt = Math.min(Math.max(seconds, 0), MOST_STEP);
  const keep = top / speed;
  // Back off what it went too fast this step, too.
  walker.x -= walker.vx * (1 - keep) * dt;
  walker.y -= walker.vy * (1 - keep) * dt;
  walker.vx *= keep;
  walker.vy *= keep;
  walker.speed = Math.hypot(walker.vx, walker.vy);
};
