// How a follower on foot gets about after the mouse, for the turkey, the
// reindeer, the bunny and the leprechaun: it walks to a spot a little behind
// the pointer (back along the way the pointer came) and a little below it, so
// it stands beside what's pointed at and not over it; it speeds up the
// farther it's left behind, slows to arrive, and turns to face where it's
// going, or the pointer once it's stopped. And the bits of a body on legs:
// where a foot is in its stride, the knee between hip and foot, a dangling
// thing swinging as it's carried. In the screen's pixels, +y down; the walker
// is where its feet meet the ground. Pure (state is stepped in place, for a
// frame's sake).

export interface Point {
  x: number;
  y: number;
}

export interface Gait {
  /** How far behind the pointer it keeps, and how far below it. */
  behind: number;
  below: number;
  /** Its top speed (pixels a second), and the hardest it speeds up or slows (a second squared). */
  top: number;
  accel: number;
  /** Pixels its body goes in one whole stride, every foot stepping once, at a walk. */
  stride: number;
}

export interface Walker {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  /** Which way it faces, and its turn toward it: -1 left to 1 right, its drawn width. */
  facing: -1 | 1;
  turn: number;
  /** Strides walked: the fraction is where its feet are in the stride. */
  phase: number;
  /** Which way from the pointer it keeps: back along the way the pointer came. */
  back: Point;
  /** Seconds the pointer's been still. */
  still: number;
}

/** Within this of its spot, it's arrived and stands. */
const ARRIVED = 6;
/** How hard it hurries after its spot, a second: its speed is this times how far off it is. */
const HURRY = 2.6;
/** It turns to face its way only when going this fast, and to the pointer only when it's this far to the side. */
const TURN_SPEED = 30;
const TURN_REACH = 24;
/** How fast it turns round, a second. */
const TURN_RATE = 9;
/** The longest step it takes, seconds: after a slow frame or a hidden tab it doesn't leap. */
const MOST_STEP = 0.05;

export const createWalker = (at: Point, gait: Gait): Walker => ({
  back: { x: -1, y: 0 },
  facing: 1,
  phase: 0,
  speed: 0,
  still: 0,
  turn: 1,
  vx: 0,
  vy: 0,
  x: at.x - gait.behind,
  y: at.y + gait.below,
});

/**
 * Which way from the pointer a follower keeps, turned toward back along the
 * way the pointer just moved (`moved`, pixels): the farther it moved, the
 * more, all the way round over `reach` pixels. Turned by angle, so even a
 * pointer doubling straight back swings it round, over the top.
 */
export const turnBack = (back: Point, moved: Point, reach: number): Point => {
  const length = Math.hypot(moved.x, moved.y);
  if (length <= 0.5) {
    return back;
  }
  const from = Math.atan2(back.y, back.x);
  const to = Math.atan2(-moved.y, -moved.x);
  let turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  // Dead opposite, it swings round over the top, not under.
  if (Math.abs(Math.abs(turn) - Math.PI) < 1e-3) {
    turn = back.x < 0 ? Math.PI : -Math.PI;
  }
  const angle = from + turn * Math.min(1, length / reach);
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

/** Its stride at the speed it's going: longer the faster. */
export const strideAt = (walker: Walker, gait: Gait) =>
  gait.stride * (1 + Math.min(1, walker.speed / gait.top) * 0.9);

/** How far to the side of the pointer it keeps at the least, of how far behind: never right under it. */
const ASIDE = 0.6;

/**
 * Where it's headed: its spot behind and below the pointer, and always a
 * little to one side of it (the side it's on), so a pointer moved straight
 * up or down isn't left resting on its back, petting it without being asked.
 */
export const spotOf = (walker: Walker, gait: Gait, pointer: Point): Point => {
  const side =
    walker.back.x === 0 ? Math.sign(walker.x - pointer.x) || -1 : Math.sign(walker.back.x);
  const across = walker.back.x * gait.behind;
  const least = gait.behind * ASIDE;
  return {
    x: pointer.x + (Math.abs(across) < least ? side * least : across),
    y: pointer.y + gait.below + walker.back.y * gait.behind * 0.4,
  };
};

/**
 * Steps it `seconds` on after the pointer, which moved `moved` pixels since
 * the last step. Held (`hold`), it stands where it is: busy pecking, say.
 */
export const stepWalker = (
  walker: Walker,
  gait: Gait,
  pointer: Point,
  moved: Point,
  seconds: number,
  hold = false,
) => {
  const dt = Math.min(seconds, MOST_STEP);
  const reach = Math.hypot(moved.x, moved.y);
  walker.still = reach < 0.5 ? walker.still + seconds : 0;
  walker.back = turnBack(walker.back, moved, 80);

  const spot = spotOf(walker, gait, pointer);
  const dx = spot.x - walker.x;
  const dy = spot.y - walker.y;
  const off = Math.hypot(dx, dy);
  const want = hold || off < ARRIVED ? 0 : Math.min(gait.top, off * HURRY);
  const wantX = off > 0 ? (dx / off) * want : 0;
  const wantY = off > 0 ? (dy / off) * want : 0;
  // Toward the speed it wants, no harder than its legs allow.
  const pushX = wantX - walker.vx;
  const pushY = wantY - walker.vy;
  const push = Math.hypot(pushX, pushY);
  const most = gait.accel * dt;
  const scale = push > most ? most / push : 1;
  walker.vx += pushX * scale;
  walker.vy += pushY * scale;
  walker.x += walker.vx * dt;
  walker.y += walker.vy * dt;
  walker.speed = Math.hypot(walker.vx, walker.vy);

  // Facing its way while it goes, the pointer once it's stopped.
  if (walker.speed > TURN_SPEED && Math.abs(walker.vx) > walker.speed * 0.25) {
    walker.facing = walker.vx > 0 ? 1 : -1;
  } else if (walker.speed < TURN_SPEED && Math.abs(pointer.x - walker.x) > TURN_REACH) {
    walker.facing = pointer.x > walker.x ? 1 : -1;
  }
  walker.turn += (walker.facing - walker.turn) * Math.min(1, dt * TURN_RATE);
  // Longer strides as it hurries, so its feet keep up without a blur.
  walker.phase += (walker.speed * dt) / strideAt(walker, gait);
};

/** How much it's walking, 0 standing to 1 at a stride: its legs blend from standing to stepping. */
export const pace = (walker: Walker, gait: Gait) => Math.min(1, walker.speed / (gait.top * 0.2));

/** How much of a stride a foot is on the ground. */
const STANCE = 0.6;

/**
 * A foot in its stride, about where it stands at rest: back along the ground
 * as the body goes over it (as far as the body goes, so it never slips), then
 * lifted and swung forward. `offset` is when in the stride this foot steps.
 */
export const footAt = (walker: Walker, gait: Gait, offset: number, lift: number): Point => {
  const t = (((walker.phase + offset) % 1) + 1) % 1;
  const reach = strideAt(walker, gait) * STANCE;
  const amount = pace(walker, gait);
  if (t < STANCE) {
    return { x: (reach / 2 - (t / STANCE) * reach) * amount, y: 0 };
  }
  const u = (t - STANCE) / (1 - STANCE);
  const eased = u * u * (3 - 2 * u);
  return {
    x: (-reach / 2 + eased * reach) * amount,
    y: -lift * Math.sin(u * Math.PI) * amount,
  };
};

/**
 * A two-boned limb from `hip` toward `foot`, bones `upper` and `lower` long,
 * its joint bent to one side of the line between (`bend`, 1 or -1, as the
 * limb is drawn facing right): a knee forward, a bird's or a deer's hock back.
 * Its `end` is where the foot gets to: the foot, or, out of reach, as far
 * toward it as the limb goes, so neither bone ever stretches.
 */
export const limbOf = (hip: Point, foot: Point, upper: number, lower: number, bend: 1 | -1) => {
  const dx = foot.x - hip.x;
  const dy = foot.y - hip.y;
  const most = upper + lower - 0.01;
  const least = Math.abs(upper - lower) + 0.01;
  const reach = Math.max(least, Math.min(most, Math.hypot(dx, dy)));
  const toward = Math.atan2(dy, dx);
  const cos = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const angle = toward - bend * Math.acos(Math.max(-1, Math.min(1, cos)));
  return {
    end: { x: hip.x + reach * Math.cos(toward), y: hip.y + reach * Math.sin(toward) },
    joint: { x: hip.x + upper * Math.cos(angle), y: hip.y + upper * Math.sin(angle) },
  };
};

/** Something dangling (a wattle, a bell, ears): its angle (radians, 0 hanging straight) and how fast it swings. */
export interface Swing {
  angle: number;
  spin: number;
}

/** How hard a swing's righted, a second squared, and how it's slowed, a second. */
const SWING_STIFFNESS = 90;
const SWING_DAMPING = 5;

/** Swings it `seconds` on, carried along at `ax` (pixels a second squared): it lags the way it's carried. */
export const stepSwing = (swing: Swing, ax: number, seconds: number) => {
  const dt = Math.min(seconds, MOST_STEP);
  const lag = Math.max(-1.2, Math.min(1.2, -ax / 1600));
  swing.spin += (SWING_STIFFNESS * (lag - swing.angle) - SWING_DAMPING * swing.spin) * dt;
  swing.angle += swing.spin * dt;
};

/** Eases `from` toward `to`, `rate` of the way a second. */
export const approach = (from: number, to: number, rate: number, seconds: number) =>
  from + (to - from) * Math.min(1, rate * Math.min(seconds, MOST_STEP));

/** Its drawn width, flipped to face its way: never quite edge on, mid-turn. */
export const widthOf = (walker: Walker) =>
  Math.sign(walker.turn || 1) * Math.max(0.2, Math.abs(walker.turn));

/** Degrees, from radians: for an SVG rotate(). */
export const degrees = (radians: number) => (radians * 180) / Math.PI;

/** Whether a point on the screen is on a walker: within `half` of it across, and up to `tall` above its feet. */
export const isOnWalker = (walker: Walker, at: Point, half: number, tall: number) =>
  Math.abs(at.x - walker.x) < half && at.y < walker.y + 4 && at.y > walker.y - tall;
