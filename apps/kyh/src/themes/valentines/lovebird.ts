// The lovebird that follows a mouse about at Valentine's, for
// `follower.tsx`: a peach-faced lovebird drawn side on and facing right
// (flipped to face left). It flies after the mouse, wings beating, a little
// behind and above it; when the mouse rests, it lands on the pointer's tip
// and perches there, and rides it along while it's moved gently, flapping
// to keep its balance. Perched, it looks about, preens under a wing and
// chirps; left long enough, it fluffs up and dozes. A click on it flushes
// it off in a flutter; a click elsewhere makes it cock its head. In its own
// pixels about its feet, +y down. Pure (state is stepped in place, for a
// frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Part, Pose } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Point } from "../follower/walk";
import { point, round } from "../art";
import { createEmotes, say, stepEmotes } from "../follower/emote";
import { approach, turnBack } from "../follower/walk";

type Act = "none" | "preen" | "chirp" | "tilt";
const ACT_S: Record<Act, number> = { chirp: 0.7, none: 0, preen: 1.8, tilt: 1.2 };

export interface Lovebird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Which way it faces, and its turn toward it (its drawn width). */
  facing: -1 | 1;
  turn: number;
  /** Wingbeats so far: the fraction is where its wings are in one. */
  flap: number;
  /** 0 flying to 1 perched on the pointer, and dozing there. */
  perch: number;
  doze: number;
  /** Which way from the pointer it flies: back along the way the pointer came. */
  back: Point;
  /** Seconds the pointer's been still, and seconds yet of being flushed off it. */
  still: number;
  flushed: number;
  act: Act;
  actFor: number;
  next: number;
  time: number;
  emotes: Emotes;
  random: Random;
}

const FLUSH = ["tweet!", "eep!", "♥?"];
const TILT = ["?", "chirp?"];
const CHATTER = ["♥", "tweet tweet", "be mine?", "chirp!", "xoxo", "♥ ♥ ♥"];
const SLEEP = ["z z z"];

/** How far behind the pointer it flies, and above. */
const BEHIND = 46;
const ABOVE = 22;
/** Its spring after its spot: pull a pixel, damping, and its hardest pull. */
const PULL = 60;
const DAMP = 10;
const MOST_PULL = 4200;
/** Seconds of a still pointer before it lands on it, and before it dozes there. */
const LAND_S = 0.5;
const DOZE_S = 28;
/** Moved faster than this, a perched bird is shaken off. */
const SHAKEN = 600;
/** Seconds a flush keeps it off the pointer. */
const FLUSH_S = 1.4;
const MOST_STEP = 0.05;
/** How big it's drawn: the drawing's a small bird. */
export const SCALE = 1.5;

export const createLovebird = (at: Point): Lovebird => {
  const seed = Math.round(at.x * 7919 + at.y * 11);
  return {
    act: "none",
    actFor: 0,
    back: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    doze: 0,
    emotes: createEmotes(seed),
    facing: 1,
    flap: 0,
    flushed: 0,
    next: 1.5,
    perch: 0,
    random: createRandom(seed + 1),
    still: 0,
    time: 0,
    turn: 1,
    vx: 0,
    vy: 0,
    x: at.x - BEHIND,
    y: at.y - ABOVE,
  };
};

/** Its spot: on the pointer's tip perched, else behind and above it, bobbing on the air. */
const spotOf = (bird: Lovebird, pointer: Point, landing: boolean): Point => {
  if (landing) {
    return { x: pointer.x, y: pointer.y };
  }
  const lift = bird.flushed > 0 ? 40 : 0;
  return {
    x: pointer.x + bird.back.x * BEHIND,
    y: pointer.y - ABOVE - lift + bird.back.y * BEHIND * 0.5 + Math.sin(bird.time * 2.2) * 4,
  };
};

const fly = (bird: Lovebird, spot: Point, dt: number) => {
  const wantX = PULL * (spot.x - bird.x) - DAMP * bird.vx;
  const wantY = PULL * (spot.y - bird.y) - DAMP * bird.vy;
  const want = Math.hypot(wantX, wantY);
  const scale = want > MOST_PULL ? MOST_PULL / want : 1;
  bird.vx += wantX * scale * dt;
  bird.vy += wantY * scale * dt;
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt;
};

const stepActs = (bird: Lovebird, dozing: boolean, seconds: number) => {
  bird.actFor += seconds;
  if (bird.act !== "none" && (bird.actFor > ACT_S[bird.act] || bird.perch < 0.5)) {
    bird.act = "none";
  }
  if (bird.act !== "none" || bird.perch < 0.9 || dozing) {
    return;
  }
  bird.next -= seconds;
  if (bird.next <= 0) {
    bird.act = bird.random.pick(["preen", "chirp", "tilt"] as const);
    bird.actFor = 0;
    bird.next = 1.4 + bird.random.next() * 2.6;
    if (bird.act === "chirp") {
      say(bird.emotes, CHATTER);
    }
  }
};

/** Faster beats the faster it goes, a few to steady itself riding the pointer; facing its way. */
const stepWings = (bird: Lovebird, moved: Point, dt: number) => {
  const speed = Math.hypot(bird.vx, bird.vy);
  const riding = bird.perch > 0.5 && Math.hypot(moved.x, moved.y) > 0.5 ? 0.4 : 0;
  bird.flap += dt * (1 - bird.perch + riding) * (8 + speed / 90);
  if (speed > 40 && Math.abs(bird.vx) > speed * 0.3) {
    bird.facing = bird.vx > 0 ? 1 : -1;
  }
  bird.turn = approach(bird.turn, bird.facing, 10, dt);
};

export const stepLovebird = (bird: Lovebird, pointer: Point, moved: Point, seconds: number) => {
  const dt = Math.min(seconds, MOST_STEP);
  bird.time += dt;
  const back = turnBack(bird.back, moved, 60);
  // Never below the pointer: it flies above it.
  bird.back = { x: back.x, y: Math.min(0.2, back.y) };
  bird.still = Math.hypot(moved.x, moved.y) < 0.5 ? bird.still + seconds : 0;
  bird.flushed = Math.max(0, bird.flushed - seconds);
  // Perched, a gentle move carries it along; a quick one shakes it off.
  const gentle = dt > 0 && Math.hypot(moved.x, moved.y) / dt < SHAKEN;
  const landing = bird.flushed === 0 && (bird.still > LAND_S || (bird.perch > 0.5 && gentle));
  const spot = spotOf(bird, pointer, landing);
  const off = Math.hypot(spot.x - bird.x, spot.y - bird.y);
  // Landed once it's close; perched, it holds on however far a gentle move carries the pointer.
  const holding = landing && (off < 4 || bird.perch > 0.5);
  if (holding) {
    bird.x = spot.x;
    bird.y = spot.y;
    bird.vx = 0;
    bird.vy = 0;
  } else {
    fly(bird, spot, dt);
  }
  bird.perch = approach(bird.perch, holding ? 1 : 0, 12, seconds);
  const dozing = bird.perch > 0.9 && bird.still > DOZE_S;
  bird.doze = approach(bird.doze, dozing ? 1 : 0, dozing ? 1 : 6, seconds);
  stepWings(bird, moved, dt);
  stepActs(bird, dozing, seconds);
  stepEmotes(bird.emotes, seconds);
  if (dozing) {
    say(bird.emotes, SLEEP);
  } else if (bird.perch < 0.5 && bird.random.chance(seconds * 0.05)) {
    say(bird.emotes, CHATTER);
  }
};

const isOn = (bird: Lovebird, at: Point) =>
  Math.abs(at.x - bird.x) < 18 && at.y < bird.y + 6 && at.y > bird.y - 34;

export const pokeLovebird = (bird: Lovebird, at: Point) => {
  bird.still = 0;
  if (isOn(bird, at) || bird.perch > 0.5) {
    // Flushed off in a flutter, straight up.
    bird.flushed = FLUSH_S;
    bird.vy -= 260;
    say(bird.emotes, FLUSH, true);
  } else if (say(bird.emotes, TILT, bird.random.chance(0.4))) {
    bird.act = "tilt";
    bird.actFor = 0;
  }
};

/** Its wings' angle, degrees: raised and swept down in flight, folded perched. */
const wingOf = (bird: Lovebird) => {
  const beat = Math.sin(bird.flap * Math.PI * 2);
  // Up and back, then down: clockwise on the screen is up for a wing laid back along the body.
  const flying = 30 + beat * 50;
  return flying * (1 - bird.perch) + (bird.act === "preen" ? 16 : 0);
};

export const lovebirdPose = (bird: Lovebird): Pose => {
  const { act, actFor, doze, perch } = bird;
  const t = Math.min(1, actFor / ACT_S[act]);
  const wing = wingOf(bird);
  const width = Math.sign(bird.turn || 1) * Math.max(0.2, Math.abs(bird.turn)) * SCALE;
  // Flying, it leans into its way; perched, it sits up; dozing, it fluffs round.
  const lean = (1 - perch) * Math.max(-20, Math.min(20, (bird.vx * bird.facing) / 20));
  const fluff = 1 + doze * 0.12;
  const tilt = act === "tilt" ? Math.sin(t * Math.PI) * 28 : 0;
  const preen = act === "preen" ? Math.min(1, t * 5, (1 - t) * 5) : 0;
  const chirp = act === "chirp" ? Math.abs(Math.sin(t * Math.PI * 3)) : 0;
  const head = { x: 6 - preen * 6 - doze * 2, y: -17 + preen * 5 + doze * 3 };
  const parts = {
    beak: { transform: `rotate(${round(chirp * 22)} 5 1)` },
    body: { transform: `rotate(${round(lean)} 0 -8) scale(${round(fluff)})` },
    eye: { opacity: doze > 0.6 ? 0 : 1 },
    eyelid: { opacity: doze > 0.6 ? 1 : 0 },
    flip: { transform: `scale(${point(width, SCALE)})` },
    head: { transform: `translate(${point(head.x, head.y)}) rotate(${round(-tilt + preen * 50)})` },
    legs: { transform: `scale(1 ${round(0.3 + perch * 0.7)})` },
    "wing-0": { transform: `rotate(${round(wing)} 2 -13)` },
    "wing-1": { transform: `rotate(${round(wing * 0.9 - 6)} 1 -13)` },
  } satisfies Record<string, Part>;
  return {
    at: { x: bird.x, y: bird.y },
    bubble: { x: 0, y: -46 },
    parts,
    say: bird.emotes.line,
  };
};

export const lovebird: Creature<Lovebird> = {
  create: createLovebird,
  poke: pokeLovebird,
  pose: lovebirdPose,
  step: stepLovebird,
};
