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
  /** Seconds it's been left far behind on its feet; and how fast the mouse goes over the ground (smoothed), and how long it's gone that fast. */
  behind: number;
  mouse: number;
  fast: number;
}

/** Its top walk over the ground, a second. */
export const WALK_TOP = 60;
export const WALK: Gait = { accel: 360, behind: 64, below: 34, stride: 16, top: WALK_TOP };
/** How hard it stops (a second squared), lying down and getting up. */
const BRAKE = 300;
/**
 * As far off its spot as this (screen pixels) this long, it flops to slide
 * after it; or this far off it while the mouse runs away from it, at many
 * times its walk, this long. A flick of the mouse is too short for either.
 */
const FAR = 120;
const FAR_S = 0.3;
const RUNNING = 3 * WALK_TOP;
const RUNNING_S = 0.2;
const RUNNING_OFF = 20;
/** Lying this far down, it pushes off. */
const LAIN = 0.7;
/** On its belly: how hard it pushes (a second squared), its top speed, how the snow slows it, how fast it steers. */
const PUSH = 1000;
const SLIDE_TOP = 420;
const FRICTION = 170;
/** How hard it drags to a stop on its belly, a second squared. */
const DRAG = 450;
const STEER = 2.2;
/** It slides this long at the least, and gets up slower than this, this near its spot (screen pixels). */
const SLIDE_S = 0.9;
const RISE_SPEED = 30;
const NEAR = 90;
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

/** Its heading's goal on its feet while it has somewhere to go: the way there over the ground. Else null. */
export const wayOf = (go: Go, walker: Walker, pointer: Point, held: boolean) => {
  const aim = aimOf(walker, pointer);
  return go.going === "walk" && !held && aim.off > 8 ? aim.toward : null;
};

const goTo = (go: Go, going: Going) => {
  go.going = going;
  go.since = 0;
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
  const facing = Math.cos(wrap(aim.toward - heading));
  const top = (WALK_TOP / perPixel) * Math.max(0, (facing - 0.3) / 0.7) ** 2;
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
  if (go.behind > FAR_S || go.fast > RUNNING_S) {
    go.behind = 0;
    goTo(go, "flop");
  }
};

/** How fast its speed changes on its belly: pushing on, dragging its feet and flippers to stop short, or coasting. */
const slideAccel = (go: Go, aim: ReturnType<typeof aimOf>, speed: number, turn: number) => {
  const ahead = Math.abs(turn) < 1.6;
  const stopping = (speed * speed) / (2 * FRICTION);
  // It pushes on while it couldn't stop short of its spot, or while the mouse runs on about as fast.
  const chasing = stopping < aim.ground - 30 || go.mouse > speed * 0.8;
  if (ahead && chasing && aim.off > NEAR / 2) {
    return PUSH;
  }
  // Past its spot, or about to go past it, it drags to a stop.
  return !ahead || stopping > aim.ground + 10 ? -DRAG : -FRICTION;
};

/**
 * On its belly: pushing on along its way while it's far (it can't push
 * backward), else coasting, the snow slowing it, or dragging to a stop short
 * of going past; steering a little toward its spot while it's ahead.
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
  const accel = slideAccel(go, aim, speed, turn);
  speed = Math.max(0, Math.min(SLIDE_TOP, speed + accel * dt));
  walker.vx = speed * Math.cos(way);
  walker.vy = speed * Math.sin(way) * SIN;
  walker.speed = Math.hypot(walker.vx, walker.vy);
  coast(walker, pointer, moved, seconds);
  if (go.since > SLIDE_S && speed < RISE_SPEED && (aim.off < NEAR || accel < 0)) {
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
    const mouse = Math.hypot(moved.x, moved.y / SIN) / seconds;
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
  brake(walker, go.going === "flop" ? FRICTION : BRAKE, Math.min(seconds, 0.05));
  coast(walker, pointer, moved, seconds);
  if (go.going === "flop" && lying > LAIN) {
    goTo(go, "slide");
  } else if (go.going === "rise" && lying < UP) {
    goTo(go, "walk");
  }
};

/** Whether it's down on its belly, or on its way down: what its body eases toward. */
export const isDown = (go: Go) => go.going === "flop" || go.going === "slide";
