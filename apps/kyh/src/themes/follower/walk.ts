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

const ARRIVED = 6;
const HURRY = 2.6;
const TURN_SPEED = 30;
const TURN_REACH = 24;
const TURN_RATE = 9;
const MOST_STEP = 0.05;

export const createWalker = (at: Point, gait: Gait) =>
  ({
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
  }) satisfies Walker;

/**
 * Which way from the pointer a follower keeps, turned toward back along the
 * way the pointer just moved (`moved`, pixels): the farther it moved, the
 * more, all the way round over `reach` pixels. Turned by angle, so even a
 * pointer doubling straight back swings it round, over the top.
 */
export const turnBack = (back: Point, moved: Point, reach: number) => {
  const length = Math.hypot(moved.x, moved.y);

  if (length <= 0.5) {
    return back;
  }

  const from = Math.atan2(back.y, back.x);
  const to = Math.atan2(-moved.y, -moved.x);
  let turn = Math.atan2(Math.sin(to - from), Math.cos(to - from));

  if (Math.abs(Math.abs(turn) - Math.PI) < 1e-3) {
    turn = back.x < 0 ? Math.PI : -Math.PI;
  }

  const angle = from + turn * Math.min(1, length / reach);

  return { x: Math.cos(angle), y: Math.sin(angle) } satisfies Point;
};

const strideAt = (walker: Walker, gait: Gait) =>
  gait.stride * (1 + Math.min(1, walker.speed / gait.top) * 0.9);

const ASIDE = 0.6;

/**
 * Where it's headed: its spot behind and below the pointer, and always a
 * little to one side of it (the side it's on), so a pointer moved straight
 * up or down isn't left resting on its back, petting it without being asked.
 */
export const spotOf = (walker: Walker, gait: Gait, pointer: Point) => {
  const across = walker.back.x * gait.behind;
  const least = gait.behind * ASIDE;
  const side = Math.sign(walker.x - pointer.x) || Math.sign(walker.back.x) || -1;

  return {
    x: pointer.x + (Math.abs(across) < least ? side * least : across),
    y: pointer.y + gait.below + walker.back.y * gait.behind * 0.4,
  } satisfies Point;
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

  if (walker.speed > TURN_SPEED && Math.abs(walker.vx) > walker.speed * 0.25) {
    walker.facing = walker.vx > 0 ? 1 : -1;
  } else if (walker.speed < TURN_SPEED && Math.abs(pointer.x - walker.x) > TURN_REACH) {
    walker.facing = pointer.x > walker.x ? 1 : -1;
  }

  walker.turn += (walker.facing - walker.turn) * Math.min(1, dt * TURN_RATE);
  walker.phase += (walker.speed * dt) / strideAt(walker, gait);
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

/** Eases `from` toward `to`, `rate` of the way a second. */
export const approach = (from: number, to: number, rate: number, seconds: number) =>
  from + (to - from) * Math.min(1, rate * Math.min(seconds, MOST_STEP));

/** Whether a point on the screen is on a walker: within `half` of it across, and up to `tall` above its feet. */
export const isOnWalker = (walker: Walker, at: Point, half: number, tall: number) =>
  Math.abs(at.x - walker.x) < half && at.y < walker.y + 4 && at.y > walker.y - tall;
