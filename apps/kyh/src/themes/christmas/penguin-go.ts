// How the penguin (`penguin.ts`) gets about: on its feet, or on its belly.
// On its feet it walks after the mouse (`../follower/walk.ts`) no faster
// than a penguin walks over the ground, whichever way across the screen
// that is, and only the way it faces: turned from its way, it slows, turns
// and then goes, so it never walks backwards or sideways. Left well behind,
// it flops: it stops, lies down on its belly, and only then pushes off and
// toboggans, steering a little as it goes, pushing on while it's far and
// coasting to a stop on the snow as it nears; slowed nearly to a stop and
// near enough, it gets back up, stopped, and walks again. In the screen's
// pixels; speeds over the ground are the screen's, its up and down
// stretched back out of the camera's foreshortening. Pure (state is stepped
// in place, for a frame's sake).
import type { Gait, Point, Walker } from "../follower/walk";
import { PITCH } from "../follower/solid";
import { spotOf, stepWalker } from "../follower/walk";

/** The screen's up and down is the ground's toward and away from the camera, foreshortened by this. */
const SIN = Math.sin(PITCH);

/** On its feet, on its way down, on its belly, or getting up. */
export type Going = "walk" | "flop" | "slide" | "rise";

export interface Go {
  going: Going;
  /** Seconds it's been at it. */
  since: number;
  /** Seconds it's been left far behind on its feet; and how fast the mouse goes across the screen (smoothed), and how long it's gone that fast. */
  behind: number;
  mouse: number;
  fast: number;
}

/** How big it's drawn, to its own pixels: about the ghost's height. */
export const SIZE = 1.25;
/** Its top walk over the ground, a second. */
export const WALK_TOP = 60 * SIZE;
export const WALK: Gait = {
  accel: 360,
  behind: 64,
  below: 34 * SIZE,
  stride: 16 * SIZE,
  top: WALK_TOP,
};
/** How hard it stops (a second squared), lying down and getting up. */
const BRAKE = 300;
/**
 * As far off its spot as this (screen pixels) this long, it flops to slide
 * after it; or this far off it while the mouse runs away
 * across the screen (pixels a second) this long. A flick of the mouse is too
 * short for either. It flops only facing its way, so it slides off that way.
 */
const FAR = 120;
const FAR_S = 0.3;
const RUNNING = 180;
const RUNNING_S = 0.2;
const RUNNING_OFF = 40;
const FACING = 0.7;
/** Lying this far down, it pushes off. */
const LAIN = 0.7;
/**
 * On its belly: how hard it pushes (a second squared), its top speed, how
 * hard it slows to stop short of its spot, how fast it eases toward the
 * speed it wants (a second), how fast it steers, and how far short it stops.
 */
const PUSH = 1000;
const SLIDE_TOP = 420;
const SLOWING = 260;
const DRAG = 700;
const EASE = 8;
/** How fast it closes in on its spot on top of the mouse's speed, a second: of how far it has to go. */
const CLOSING = 3;
/** How the snow slows it as it goes down onto its belly, a second squared. */
const SNOW = 80;
const STEER = 2.2;
const SHORT = 6;
/** It slides this long at the least, and gets up slower than this, this near its spot (screen pixels). */
const SLIDE_S = 0.9;
const RISE_SPEED = 30;
const NEAR = 90;
/** How much it must face its way (a cosine) to walk it at all. */
const STEPS_AT = 0.3;
/** A spot behind it nearer than this, screen pixels, isn't worth turning round for. */
const SHUFFLE = 13;
/** Up this far off its belly, it walks again. */
const UP = 0.25;

export const createGo = (): Go => ({ behind: 0, fast: 0, going: "walk", mouse: 0, since: 0 });

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Where it's headed: its spot, how far (on the screen and over the ground), and which way over the ground. */
const aimOf = (walker: Walker, pointer: Point) => {
  const spot = spotOf(walker, WALK, pointer);
  const dx = spot.x - walker.x;
  const dy = spot.y - walker.y;
  return {
    ground: Math.hypot(dx, dy / SIN),
    off: Math.hypot(dx, dy),
    toward: Math.atan2(dy / SIN, dx),
  };
};

const facingOf = (aim: { toward: number }, heading: number) => Math.cos(wrap(aim.toward - heading));

/** Whether it's turned enough its way to walk it at all. */
const isFacing = (aim: { toward: number }, heading: number) => facingOf(aim, heading) > STEPS_AT;

/**
 * Its heading's goal while it has somewhere to go: on its feet, the way
 * there over the ground; on its belly, the way it slides, or, slowed nearly
 * to a stop, the way there again (it pivots round to it). Else null.
 */
export const wayOf = (
  go: Go,
  walker: Walker,
  { heading, held, pointer }: { heading: number; held: boolean; pointer: Point },
) => {
  const aim = aimOf(walker, pointer);
  if (go.going === "slide") {
    return walker.speed > 20 ? Math.atan2(walker.vy / SIN, walker.vx) : aim.toward;
  }
  // It won't about-face for a shuffle: a spot this near and behind it can stay there.
  const worth = isFacing(aim, heading) ? 8 : SHUFFLE;
  return go.going === "walk" && !held && aim.off > worth ? aim.toward : null;
};

/** Into a new way of going, its counts of being left behind started afresh. */
const goTo = (go: Go, going: Going) => {
  go.going = going;
  go.since = 0;
  go.behind = 0;
  go.fast = 0;
};

/** Stepped by its own velocity: the walker carries it without pushing, and keeps count of the mouse. */
const coast = (walker: Walker, pointer: Point, moved: Point, seconds: number) =>
  stepWalker(walker, { ...WALK, accel: 0 }, pointer, moved, seconds, true);

/** Brakes it toward a stop, `rate` a second squared. */
const brake = (walker: Walker, rate: number, seconds: number) => {
  const keep = walker.speed > 0 ? Math.max(0, walker.speed - rate * seconds) / walker.speed : 0;
  walker.vx *= keep;
  walker.vy *= keep;
  walker.speed *= keep;
};

/**
 * On its feet: after its spot, no faster than its top walk over the ground,
 * and only as fast as it faces its way (turned from it, it slows to turn).
 */
const walk = (
  go: Go,
  walker: Walker,
  moves: { pointer: Point; moved: Point; held: boolean; heading: number },
  seconds: number,
) => {
  const { held, heading, moved, pointer } = moves;
  const aim = aimOf(walker, pointer);
  const perPixel = aim.off > 0 ? aim.ground / aim.off : 1;
  const facing = facingOf(aim, heading);
  const top = (WALK_TOP / perPixel) * Math.max(0, (facing - STEPS_AT) / (1 - STEPS_AT)) ** 2;
  const { back } = walker;
  stepWalker(walker, { ...WALK, top }, pointer, moved, seconds, held);
  // The mouse doubled straight back: its spot swings round under the mouse, not over (`walk.ts`), so
  // it turns about showing its face, not its back.
  const doubled = Math.atan2(-moved.y, -moved.x) - Math.atan2(back.y, back.x);
  if (Math.abs(wrap(doubled)) > Math.PI - 0.05 && walker.back.y < back.y) {
    walker.back = { x: walker.back.x, y: 2 * back.y - walker.back.y };
  }
  go.behind = !held && aim.off > FAR ? go.behind + seconds : 0;
  go.fast =
    !held && go.mouse > RUNNING && aim.off > RUNNING_OFF
      ? go.fast + seconds
      : Math.max(0, go.fast - seconds * 2);
  if ((go.behind > FAR_S || go.fast > RUNNING_S) && facing > FACING) {
    goTo(go, "flop");
  }
};

/**
 * The speed it wants on its belly: the mouse's, as it runs on, and on top of
 * that more the farther it is from its spot (so it closes in, keeping back
 * as far as it would take it to stop, should the mouse stop), but never more
 * than it could stop from just short of its spot. None while its spot is
 * behind it.
 */
const slideGoal = (go: Go, aim: ReturnType<typeof aimOf>, turn: number) => {
  if (Math.abs(turn) > 1.6) {
    return 0;
  }
  const perPixel = aim.off > 0 ? aim.ground / aim.off : 1;
  const running = go.mouse * perPixel * Math.max(0, Math.cos(turn));
  // Following a running mouse, it keeps back from its spot as far as it would take to stop.
  const lag = (running * running) / (2 * DRAG);
  const left = Math.max(0, aim.ground - SHORT);
  const closing = Math.min(CLOSING * (left - lag), Math.sqrt(2 * SLOWING * left));
  return Math.max(0, Math.min(SLIDE_TOP, running + closing));
};

/**
 * On its belly: easing toward the speed it wants (pushing no harder than it
 * can, slowing no harder than it can drag), steering a little toward its
 * spot while it's ahead; slowed nearly to a stop, it pivots round to face it
 * before it pushes off again.
 */
const slide = (
  go: Go,
  walker: Walker,
  moves: { pointer: Point; moved: Point; heading: number },
  seconds: number,
) => {
  const { heading, moved, pointer } = moves;
  const dt = Math.min(seconds, 0.05);
  const aim = aimOf(walker, pointer);
  const vz = walker.vy / SIN;
  let speed = Math.hypot(walker.vx, vz);
  let way = speed > 20 ? Math.atan2(vz, walker.vx) : heading;
  const turn = wrap(aim.toward - way);
  if (Math.abs(turn) < 1.6) {
    way += Math.max(-STEER * dt, Math.min(STEER * dt, turn));
  }
  const goal = slideGoal(go, aim, turn);
  const change = (goal - speed) * Math.min(1, EASE * dt);
  speed = Math.max(0, speed + Math.max(-DRAG * dt, Math.min(PUSH * dt, change)));
  walker.vx = speed * Math.cos(way);
  walker.vy = speed * Math.sin(way) * SIN;
  walker.speed = Math.hypot(walker.vx, walker.vy);
  coast(walker, pointer, moved, seconds);
  if (go.since > SLIDE_S && speed < RISE_SPEED && goal < RISE_SPEED && aim.off < NEAR) {
    goTo(go, "rise");
  }
};

/**
 * Steps how it gets about `seconds` on: walking, or flopping, sliding and
 * getting up again. `lying` is how far down on its belly it is (`penguin.ts`
 * eases it), `heading` which way it faces. `held`, it stands its ground.
 */
export const stepGo = (
  go: Go,
  walker: Walker,
  moves: { pointer: Point; moved: Point; held: boolean; heading: number; lying: number },
  seconds: number,
) => {
  const { lying, moved, pointer } = moves;
  go.since += seconds;
  if (seconds > 0) {
    const mouse = Math.hypot(moved.x, moved.y) / seconds;
    go.mouse += (mouse - go.mouse) * Math.min(1, seconds / 0.04);
  }
  if (go.going === "walk") {
    walk(go, walker, moves, seconds);
    return;
  }
  if (go.going === "slide") {
    slide(go, walker, moves, seconds);
    return;
  }
  // Going down, it goes on as it was going (no faster, the snow slowing it); getting up, it stops where it is.
  brake(walker, go.going === "flop" ? SNOW : BRAKE, Math.min(seconds, 0.05));
  coast(walker, pointer, moved, seconds);
  if (go.going === "flop" && lying > LAIN) {
    goTo(go, "slide");
  } else if (go.going === "rise" && lying < UP) {
    goTo(go, "walk");
  }
};

/** Whether it's down on its belly, or on its way down: what its body eases toward. */
export const isDown = (go: Go) => go.going === "flop" || go.going === "slide";
