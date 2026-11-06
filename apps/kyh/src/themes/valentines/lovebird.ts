// The lovebird that follows a mouse about at Valentine's, for `follower.tsx`:
// a peach-faced lovebird built in the round (`lovebird-pose.ts` draws it) and
// seen from a little above, so it turns through every view as it flies. It
// flies after the mouse a little behind and above it, as a small parrot
// does: quick wingbeats, the hand whipping after each stroke (`flex.ts`),
// and in a steady cruise a few beats then a bound on folded wings. It banks
// into its turns, pitches nose down speeding up and up braking, and its head
// stays level. When the mouse rests, it comes in and flares over the last of
// it to land on the pointer's tip (wings spread, tail fanned, feet thrown
// forward) and settles with a dip; perched, it rides a gentle move along,
// balancing (its body swaying over its feet, its tail countering, a few
// flaps when it's jolted, its head held still and caught up in a thrust),
// and after a long ride it hops off by itself. A brisk move and it launches:
// a crouch, a spring and two strong beats; only a real jerk shakes it off in
// a ruffled tumble. Perched, it looks about in quick glances, preens under a
// wing, chirps, cocks its head and rouses its feathers; held still a moment
// on a resting pointer (a petting), it nuzzles down to it, eyes shut happy;
// left long enough, it fluffs up, tucks its head back and dozes. A click on
// it in the air flushes it up in a startled hop; a click anywhere else, as
// on whatever the pointer it's perched on clicks, makes it flinch and cock
// its head. Its tail is a chain (`../follower/chain.ts`) trailing on the
// air. Every other part eases on a spring (`../follower/solid.ts`). Pure
// (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Flex } from "./flex";
import { flickChain, stepChain } from "../follower/chain";
import { createEmotes, reached, say, stepEmotes } from "../follower/emote";
import { headingOf, PITCH, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { approach, turnBack } from "../follower/walk";
import { flexAt, kickFlex, stepFlex } from "./flex";
import type { View } from "./lovebird-pose";
import { lovebirdPose, settleView, SIZE, tailHangOf, viewOf } from "./lovebird-pose";
import { strokeAt } from "./wingbeat";

/** A moment's business, perched: a preen, a chirp, a cock of the head, a rousing shake of its feathers, a nuzzle petted. */
type Act = "none" | "preen" | "chirp" | "tilt" | "rouse" | "nuzzle";
const ACT_S: Record<Act, number> = {
  chirp: 0.7,
  none: 0,
  nuzzle: 1.8,
  preen: 1.8,
  rouse: 0.75,
  tilt: 1.2,
};
const IDLE: readonly Act[] = ["preen", "chirp", "tilt", "rouse", "preen", "tilt"];

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** Its body rolled (radians, + its top to its left) and pitched (+ its front up). */
  bank: Spring;
  pitch: Spring;
  /** Pixels up: its body rising on its beats and falling through a bound. */
  lift: Spring;
  /** 0 to 1: wings folded to spread; how big their strokes are. */
  spread: Spring;
  amp: Spring;
  /** 0 to 1: the landing's flare. */
  flare: Spring;
  /** Its tumble's spin in the screen's plane (radians, + clockwise). */
  spin: Spring;
  /** 0 to 1: tail closed to fanned; its tail lowered off its body's line (radians, + down, - cocked up). */
  fan: Spring;
  tail: Spring;
  /** 0 to 1: feet tucked up to gripping; thrown forward to land. */
  legs: Spring;
  reach: Spring;
  /** Its head turned (radians, + to its left), nodded (+ up) and cocked (+ its top to its left). */
  look: Spring;
  nod: Spring;
  cock: Spring;
  /** Where its head is held off its place on its neck (pixels: right, up, toward the camera). */
  head: [Spring, Spring, Spring];
  /** 0 to 1: beak shut to open, eyes open to shut, content (eyes shut happy), feathers sleek to ruffled, a wing lifted to preen. */
  beak: Spring;
  doze: Spring;
  content: Spring;
  fluff: Spring;
  preen: Spring;
}

/** How it left the pointer: launched, or tumbled off by a jerk. */
type Departure = "launch" | "tumble";

/** The pointer's moves over the last moment, to tell a brisk move from a gentle one whatever the frame rate. */
interface Move {
  x: number;
  y: number;
  seconds: number;
}

/** Its wings' beat: where in it they are, the arm's stroke and the hand whipping after it. */
export interface Wings {
  /** Wingbeats so far: the fraction is where in one they are, the downstroke first. */
  phase: number;
  /** The arm's stroke (radians, + up) and the hand's, lagging and overshooting it. */
  arm: number;
  hand: Flex;
  /** Beats left before it next bounds, and seconds left of a bound on folded wings. */
  beats: number;
  bound: number;
  /** Seconds left of flapping to keep its balance, perched, and of the strong beats of a launch; seconds it's glided down. */
  balance: number;
  launch: number;
  glide: number;
}

export interface Lovebird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** How hard it's pulling after its spot (pixels a second squared). */
  ax: number;
  ay: number;
  /** 0 flying to 1 perched on the pointer. */
  perch: number;
  /** Whether it's holding on to the pointer now: once shaken off, it flies and lands again. */
  riding: boolean;
  /** Which way from the pointer it flies: back along the way the pointer came. */
  back: Point;
  /** Seconds the pointer's been still, and seconds yet of being flushed off it. */
  still: number;
  flushed: number;
  /** Seconds yet of its scramble after it's shaken off. */
  scramble: number;
  /** Seconds it's been carried along on a moving pointer, and seconds it's been held still on one (a petting). */
  ridden: number;
  petted: number;
  /** Whether it's been petted this time on the pointer: once, till it leaves it. */
  pettedHere: boolean;
  /** A petting to answer with a nuzzle once what it's at is done. */
  nuzzleDue: boolean;
  /** The pointer's last moves, and how fast they've gone (pixels a second). */
  moves: Move[];
  pace: Point;
  /** Its landing's last few pixels onto the pointer, eased off rather than snapped (pixels on the screen). */
  landing: [Spring, Spring];
  act: Act;
  actFor: number;
  next: number;
  /** Which side it preens and which way it cocks its head (1 its left). */
  side: 1 | -1;
  /** Where it's glancing perched (radians), and seconds till it glances elsewhere. */
  gaze: number;
  nextGaze: number;
  /** Its head catching up with its body in a thrust, having been held still. */
  thrust: boolean;
  /** Its body's shake as it rouses, radians in the screen's plane. */
  shiver: number;
  /** 0 to 1: its eyes shut in a blink, and seconds till its next. */
  blink: number;
  nextBlink: number;
  /** Steps so far: what its pose is built for (`lovebird-pose.ts` keeps one frame a step). */
  steps: number;
  time: number;
  rig: Rig;
  wings: Wings;
  /** Perched, its body swaying over its feet (radians, + clockwise on the screen) and dipping (pixels down). */
  sway: Flex;
  dip: Flex;
  /** The pointer's speed perched, smoothed (pixels a second). */
  carried: [Spring, Spring];
  /** Which of its sides faces the camera, and so which way its layers stack (`lovebird-pose.ts`). */
  view: View;
  /** Its tail, trailing on the air (`../follower/chain.ts`), in the screen's pixels. */
  tail: Chain;
  emotes: Emotes;
  random: Random;
}

const FLUSH = ["tweet!", "eep!", "♥?"];
const TILT = ["?", "chirp?"];
const JOLTED = ["!", "chirp?", "?"];
const CHATTER = ["♥", "tweet tweet", "be mine?", "chirp!", "xoxo", "♥ ♥ ♥"];
const SHAKEN = ["eep!", "whoa!"];
const PET = ["♥", "chirrup ♥", "♥ ♥"];
const SLEEP = ["z z z"];

/** How far behind the pointer it flies, and above (screen pixels, for its size). */
const BEHIND = 58;
const ABOVE = 28;
/** Its spring after its spot: pull a pixel, damping, and its hardest pull. */
const PULL = 60;
const DAMP = 10;
const MOST_PULL = 4200;
/** Seconds of a still pointer before it lands on it, and before it dozes there. */
const LAND_S = 0.5;
const DOZE_S = 28;
/** Moved faster than this (pixels a second, over the last moment), a perched bird launches; faster than this, it's jerked off in a tumble. */
const SHAKE_OFF = 600;
const TUMBLE = 1500;
/** Seconds of the pointer's moves it judges their pace over. */
const PACE_S = 0.05;
/** Seconds of the strong beats of its launch. */
const LAUNCH_S = 0.32;
/** Seconds held still on a resting pointer, settled, before it's a petting. */
const PET_S = 2.5;
/** Seconds it glides down at most before it beats again. */
const GLIDE_S = 0.45;
/** Seconds of being carried before it hops off by itself. */
const RIDE_S = 3;
/** Seconds a flush keeps it off the pointer. */
const FLUSH_S = 1.4;
const MOST_STEP = 0.05;
/** Pixels from the pointer it starts its flare to land, and pixels off it that it takes hold. */
const FLARE_AT = 48;
const HOLD_AT = 6;
/** Coming in to land: a stiff pull, critically damped, its speed capped by how far it has to go. */
const LAND_PULL = 110;
const LAND_DAMP = 21;
/** The longest piece the wingbeat is stepped in. */
const PIECE = 1 / 240;
/** How far its head is held off its neck, at most, before it thrusts to catch up. */
const NECK_REACH = 3;
/** Its tail feathers: light, trailing on the air, and quick to flick back. */
const TAIL: Stuff = { damp: 7, drag: 0.014, keep: 0.05, keepTip: 0.012, rub: 0.5, weight: 60 };

const clamp = (value: number, most: number) => Math.max(-most, Math.min(most, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const createLovebird = (at: Point): Lovebird => {
  const seed = Math.round(at.x * 7919 + at.y * 11);
  return {
    act: "none",
    actFor: 0,
    ax: 0,
    ay: 0,
    back: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    blink: 0,
    carried: [springAt(0), springAt(0)],
    dip: flexAt(0),
    emotes: createEmotes(seed),
    flushed: 0,
    gaze: 0,
    landing: [springAt(0), springAt(0)],
    moves: [],
    next: 1.5,
    nextBlink: 2,
    nextGaze: 1,
    nuzzleDue: false,
    pace: { x: 0, y: 0 },
    perch: 0,
    petted: 0,
    pettedHere: false,
    random: createRandom(seed + 1),
    ridden: 0,
    riding: false,
    rig: {
      amp: springAt(1),
      bank: springAt(0),
      beak: springAt(0),
      cock: springAt(0),
      content: springAt(0),
      doze: springAt(0),
      fan: springAt(0.2),
      flare: springAt(0),
      fluff: springAt(0),
      head: [springAt(0), springAt(0), springAt(0)],
      // A three-quarter view, toward the camera, to begin with.
      heading: springAt(Math.PI / 5),
      legs: springAt(0),
      lift: springAt(0),
      look: springAt(0),
      nod: springAt(0),
      pitch: springAt(0.2),
      preen: springAt(0),
      reach: springAt(0),
      spin: springAt(0),
      spread: springAt(1),
      tail: springAt(0),
    },
    scramble: 0,
    shiver: 0,
    side: 1,
    steps: 0,
    still: 0,
    sway: flexAt(0),
    tail: { knots: [], owed: 0 },
    thrust: false,
    time: 0,
    view: {
      age: 0,
      beakFront: true,
      headFront: true,
      headOverWing: true,
      near: 1,
      tailFront: false,
    },
    vx: 0,
    vy: 0,
    wings: {
      arm: strokeAt(0, 1),
      balance: 0,
      beats: 4,
      bound: 0,
      glide: 0,
      hand: flexAt(strokeAt(0, 1)),
      launch: 0,
      phase: 0,
    },
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

/** Flies after its spot on a spring; coming in to land, no faster than it can stop in. */
const fly = (bird: Lovebird, spot: Point, landing: boolean, off: number, dt: number) => {
  const pull = landing ? LAND_PULL : PULL;
  const damp = landing ? LAND_DAMP : DAMP;
  const wantX = pull * (spot.x - bird.x) - damp * bird.vx;
  const wantY = pull * (spot.y - bird.y) - damp * bird.vy;
  const want = Math.hypot(wantX, wantY);
  const scale = want > MOST_PULL ? MOST_PULL / want : 1;
  bird.ax = wantX * scale;
  bird.ay = wantY * scale;
  bird.vx += bird.ax * dt;
  bird.vy += bird.ay * dt;
  const speed = Math.hypot(bird.vx, bird.vy);
  const most = 10 * off + 40;
  if (landing && speed > most) {
    bird.vx *= most / speed;
    bird.vy *= most / speed;
  }
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt;
};

/** The pointer's pace over the last moment: by the real time it took, whatever the frame rate or a long frame. */
const stepPace = (bird: Lovebird, moved: Point, seconds: number) => {
  const { moves } = bird;
  moves.push({ seconds: Math.max(0, seconds), x: moved.x, y: moved.y });
  let total = 0;
  for (const move of moves) {
    total += move.seconds;
  }
  while (moves.length > 1 && total - (moves[0]?.seconds ?? 0) >= PACE_S) {
    total -= moves.shift()?.seconds ?? 0;
  }
  let x = 0;
  let y = 0;
  for (const move of moves) {
    x += move.x;
    y += move.y;
  }
  bird.pace = total > 0 ? { x: x / total, y: y / total } : { x: 0, y: 0 };
};

/** How far into an act it is, eased in and out over its first and last fifth. */
const envelope = (bird: Lovebird, act: Act) => {
  if (bird.act !== act) {
    return 0;
  }
  const t = bird.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) * 5);
};

const begin = (bird: Lovebird, act: Act) => {
  bird.act = act;
  bird.actFor = 0;
  bird.side = bird.random.chance(0.5) ? 1 : -1;
  if (act === "chirp") {
    say(bird.emotes, CHATTER);
    // A flick of its tail up as it chirps.
    bird.rig.tail.v -= 5;
  } else if (act === "tilt") {
    say(bird.emotes, TILT);
  }
};

/** It touches down on the pointer: its body dips under its own weight, its tail flicks on. */
const touchDown = (bird: Lovebird) => {
  const { vx, vy } = bird;
  kickFlex(bird.dip, 30 + Math.max(0, vy) * 0.08);
  kickFlex(bird.sway, clamp(vx * 0.003, 0.9));
  bird.rig.tail.v -= 6;
  flickChain(bird.tail, { x: vx * 0.5, y: vy * 0.5 + 120 });
};

/** Holding on to the pointer: carried with it, its last few pixels of landing eased off. */
const hold = (bird: Lovebird, spot: Point, wasRiding: boolean, dt: number) => {
  const [offX, offY] = bird.landing;
  if (!wasRiding) {
    offX.x = bird.x - spot.x;
    offY.x = bird.y - spot.y;
    offX.v = bird.vx;
    offY.v = bird.vy;
    touchDown(bird);
  }
  for (const spring of bird.landing) {
    stepSpring(spring, 0, 28, dt);
    if (Math.abs(spring.x) < 0.02 && Math.abs(spring.v) < 1) {
      spring.x = 0;
      spring.v = 0;
    }
  }
  bird.x = spot.x + offX.x;
  bird.y = spot.y + offY.x;
  bird.vx = 0;
  bird.vy = 0;
  bird.ax = 0;
  bird.ay = 0;
};

/** Leaving the pointer: a launch (up off its crouch, two strong beats), or a tumble when jerked off. */
const depart = (bird: Lovebird, how: Departure) => {
  const { rig, wings } = bird;
  rig.amp.x = 1;
  wings.bound = 0;
  wings.beats = 6;
  // From the top of a stroke, so its first beat is a full downstroke.
  wings.phase = Math.ceil(wings.phase);
  for (const spring of bird.landing) {
    spring.x = 0;
    spring.v = 0;
  }
  // Off the pointer it's done with its perched business: feet up, eyes open, body down to fly.
  bird.pettedHere = false;
  bird.nuzzleDue = false;
  if (bird.act !== "tilt") {
    bird.act = "none";
  }
  rig.content.x = 0;
  rig.content.v = 0;
  rig.legs.x *= 0.35;
  rig.pitch.v -= 5;
  if (how === "tumble") {
    rig.fluff.x = 1;
    const tumble = bird.random.chance(0.5) ? 1 : -1;
    rig.bank.v += 9 * tumble;
    rig.spin.v += 12 * tumble;
    rig.pitch.v -= 4;
    bird.scramble = 0.6;
    // Its tail whipped about in the tumble.
    flickChain(bird.tail, { x: 420 * tumble, y: -360 });
    say(bird.emotes, SHAKEN, true);
    return;
  }
  wings.launch = LAUNCH_S;
  kickFlex(bird.dip, -40);
  bird.vy -= 120;
  flickChain(bird.tail, { x: -bird.pace.x * 0.3, y: 220 });
};

/** Perched, the pointer's moves rock it: its body lags a change of pace and swings back over its feet. */
const stepBalance = (bird: Lovebird, holding: boolean, dt: number) => {
  if (dt <= 0) {
    return;
  }
  const { dip, sway, wings } = bird;
  const [carriedX, carriedY] = bird.carried;
  const before = { x: carriedX.x, y: carriedY.x };
  stepSpring(carriedX, holding ? bird.pace.x : 0, 16, dt);
  stepSpring(carriedY, holding ? bird.pace.y : 0, 16, dt);
  const jolt = Math.hypot(carriedX.x - before.x, carriedY.x - before.y) / dt;
  if (holding) {
    // Carried off to the right, it's left leaning back to the left; jerked down, its body's left up.
    kickFlex(sway, -(carriedX.x - before.x) * 0.018);
    // Carried up, it crouches into the lift; braked, it rises off its feet.
    kickFlex(dip, -(carriedY.x - before.y) * 0.25);
  }
  // Carried steadily, it leans into the way it goes; carried briskly, it crouches to spring off.
  const lean = holding ? clamp(carriedX.x * 0.0006, 0.2) : 0;
  const speed = Math.hypot(bird.pace.x, bird.pace.y);
  const crouch = holding ? smooth((speed - 300) / 300) * 2 : 0;
  stepFlex(sway, lean, 1.7, 0.4, dt);
  stepFlex(dip, crouch, 3.2, 0.3, dt);
  sway.x = clamp(sway.x, 0.45);
  dip.x = clamp(dip.x, 5);
  // Jolted, tipped further than its lean or its pace changed hard, it flaps to steady itself.
  const jolted = holding && (Math.abs(sway.x - lean) > 0.38 || Math.abs(dip.x) > 3 || jolt > 3000);
  wings.balance = jolted ? 0.25 : Math.max(0, wings.balance - dt);
  // Carried a long way, it tires of the ride.
  bird.ridden = holding && speed > 120 ? bird.ridden + dt : Math.max(0, bird.ridden - dt * 2);
};

interface WingGoal {
  amp: number;
  hertz: number;
  spread: number;
}

/** Perched, its wings folded, unless it's been jolted: then a few flaps to steady itself. */
const perchedWings = (bird: Lovebird): WingGoal =>
  bird.wings.balance > 0
    ? { amp: 0.75, hertz: 5.5, spread: 0.65 }
    : { amp: 0, hertz: 0, spread: 0 };

/** In the air: launching, flaring to land, scrambling, gliding down, bounding on folded wings, or beating. */
const flyingWings = (bird: Lovebird): WingGoal => {
  const speed = Math.hypot(bird.vx, bird.vy);
  if (bird.wings.launch > 0) {
    return { amp: 1, hertz: 7, spread: 1 };
  }
  if (bird.rig.flare.x > 0.15) {
    return { amp: 1, hertz: 6, spread: 1 };
  }
  if (bird.scramble > 0) {
    return { amp: 1, hertz: 8, spread: 1 };
  }
  if (bird.vy > 160 && speed > 240) {
    // A short glide down on held wings, then slow beats.
    return bird.wings.glide < GLIDE_S
      ? { amp: 0.12, hertz: 4, spread: 1 }
      : { amp: 0.6, hertz: 5, spread: 1 };
  }
  if (bird.wings.bound > 0) {
    return { amp: 0.25, hertz: 0, spread: 0 };
  }
  const climb = Math.max(0, -bird.vy);
  return { amp: 1, hertz: 6.5 + Math.min(2, climb / 250) + (speed < 90 ? 1 : 0), spread: 1 };
};

/** Whether it's cruising: going steadily, neither climbing hard, diving, braking, banking hard nor landing. */
const cruising = (bird: Lovebird) => {
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  return (
    speed > 170 &&
    Math.abs(along) < 2000 &&
    bird.vy > -140 &&
    bird.vy < 160 &&
    Math.abs(bird.rig.bank.x) < 0.4 &&
    bird.rig.flare.x < 0.05 &&
    bird.scramble === 0 &&
    bird.wings.launch === 0
  );
};

/** Its beats on: the arm's stroke, the hand whipping after it, a bound now and then cruising. */
const beat = (bird: Lovebird, hertz: number, cruise: boolean, dt: number) => {
  const { rig, wings } = bird;
  if (wings.bound > 0) {
    wings.bound -= dt;
    if (wings.bound <= 0 || !cruise) {
      wings.bound = 0;
      wings.beats = bird.random.int(2, 4);
    }
  }
  const pieces = Math.ceil(dt / PIECE);
  const h = dt / Math.max(1, pieces);
  for (let piece = 0; piece < pieces; piece += 1) {
    const before = wings.phase;
    if (wings.bound <= 0) {
      wings.phase += hertz * h;
    }
    if (Math.floor(wings.phase) > Math.floor(before)) {
      wings.beats -= 1;
      // Cruising, after a few beats it folds its wings at the top of the upstroke and bounds.
      if (cruise && wings.beats <= 0) {
        wings.bound = bird.random.range(0.16, 0.3);
        wings.phase = Math.floor(wings.phase);
      }
    }
    const arm = strokeAt(wings.phase, rig.amp.x);
    const armSpeed = (arm - wings.arm) / h;
    wings.arm = arm;
    stepFlex(wings.hand, arm, 19, 0.4, h, armSpeed);
  }
};

const stepWings = (bird: Lovebird, holding: boolean, dt: number) => {
  const { rig, wings } = bird;
  wings.launch = Math.max(0, wings.launch - dt);
  wings.glide = bird.vy > 160 && !holding ? wings.glide + dt : 0;
  const goal = holding ? perchedWings(bird) : flyingWings(bird);
  // Bounding, it folds its wings tight at once; perched, it folds them away at its leisure.
  const folding = wings.bound > 0 ? 30 : 16;
  stepSpring(rig.spread, goal.spread, goal.spread > rig.spread.x ? 22 : folding, dt);
  stepSpring(rig.amp, goal.amp, 12, dt);
  beat(bird, goal.hertz, !holding && cruising(bird), dt);
};

/** Which way it faces perched: three-quarters toward the camera, on the side it already faces. */
const perchedHeading = (heading: number) => (Math.cos(heading) >= 0 ? 0.6 : Math.PI - 0.6);

/** Which way it faces flying: its way; hanging in the air, toward the pointer. */
const flyingHeading = (bird: Lovebird, pointer: Point, speed: number) => {
  if (speed > 70) {
    return headingOf(bird.vx, bird.vy);
  }
  const dx = pointer.x - bird.x;
  const dy = pointer.y - bird.y;
  return Math.hypot(dx, dy) < 30 ? bird.rig.heading.x : headingOf(dx, dy);
};

/** Its body after its flight: turned its way, banked into turns, pitched by how it speeds up. */
const stepBody = (bird: Lovebird, pointer: Point, dt: number) => {
  const { rig, perch } = bird;
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  const heading = perch > 0.5 ? perchedHeading(rig.heading.x) : flyingHeading(bird, pointer, speed);
  stepAngle(rig.heading, heading, perch > 0.5 ? 3 : 6, dt);
  // Banked into its turn, the harder the faster it goes.
  const turning = clamp(rig.heading.v * Math.min(speed, 500) * 0.0016, 0.9);
  stepSpring(rig.bank, (1 - perch) * turning, 10, dt);
  const bounding = bird.wings.bound > 0;
  // Coming toward the camera, it flies nose down, so its back and the tops of its wings show.
  const toward = Math.max(0, Math.sin(rig.heading.x)) * (1 - rig.flare.x);
  const flying =
    (bounding ? 0.06 : 0.22) +
    clamp(-bird.vy * 0.0007, 0.3) +
    clamp(-along * 0.00011, 0.38) -
    0.5 * toward;
  const flared = mix(flying, 1.15, rig.flare.x);
  const perched = 0.92 - 0.12 * rig.doze.x + 0.1 * rig.preen.x;
  stepSpring(rig.pitch, mix(flared, perched, perch), 8, dt);
  stepSpring(rig.lift, bounding ? -2.5 : 0, 7, dt);
  stepSpring(rig.spin, 0, 7, dt);
};

/** Its tail fanning as it brakes, turns and lands; cocked to counter a sway; its feet down to land and grip. */
const stepTail = (bird: Lovebird, holding: boolean, dt: number) => {
  const { rig, perch } = bird;
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  const braking = Math.max(0, Math.min(0.6, -along / 2600));
  const flyingFan = Math.min(1, 0.15 + braking + Math.abs(rig.bank.x) * 0.35 + rig.flare.x);
  // Perched, its tail's a little open, so it shows edge on too.
  const perchedFan = Math.min(
    1,
    0.3 + 0.3 * envelope(bird, "chirp") + 0.6 * envelope(bird, "rouse"),
  );
  stepSpring(rig.fan, mix(flyingFan, perchedFan, perch), 14, dt);
  // Perched, its tail hangs below it and swings against its body's lean: up as it tips forward over its feet.
  const counter = -bird.sway.x * Math.cos(rig.heading.x) * 1.3;
  // Flaring, it lowers its tail to brake; bounding, it holds it up a little.
  const flyingTail = 0.2 * rig.flare.x - (bird.wings.bound > 0 ? 0.06 : 0);
  stepSpring(rig.tail, mix(flyingTail, 0.6 + clamp(counter, 0.45), perch), 10, dt);
  stepSpring(rig.legs, holding ? 1 : 0, holding ? 16 : 24, dt);
  stepSpring(rig.reach, holding ? 0 : rig.flare.x, 20, dt);
};

/** Whether it's carried along or steadying itself: no business, no glancing about, till it's still. */
const isBusy = (bird: Lovebird) =>
  Math.hypot(bird.carried[0].x, bird.carried[1].x) > 40 ||
  bird.wings.balance > 0 ||
  bird.wings.launch > 0;

/** Perched, it glances about in quick turns of its head, holding each a moment. */
const glance = (bird: Lovebird, dt: number) => {
  if (isBusy(bird)) {
    bird.gaze = 0;
    return 0;
  }
  bird.nextGaze -= dt;
  if (bird.nextGaze <= 0) {
    bird.gaze = bird.random.range(-0.85, 0.85);
    bird.nextGaze = bird.random.range(0.5, 2.2);
  }
  return bird.gaze;
};

/**
 * Its head, level whatever its body does. Perched, it's held still in the
 * world as the pointer carries its body, as far as its neck reaches, then
 * thrust after it.
 */
const stepHeadPlace = (bird: Lovebird, from: Point, holding: boolean, dt: number) => {
  const [hx, hy, hz] = bird.rig.head;
  if (holding) {
    hx.x -= (bird.x - from.x) / SIZE;
    hy.x += (bird.y - from.y) / SIZE / Math.cos(PITCH);
  }
  const off = Math.hypot(hx.x, hy.x);
  if (off > NECK_REACH) {
    hx.x *= NECK_REACH / off;
    hy.x *= NECK_REACH / off;
    bird.thrust = true;
  } else if (off < 0.4) {
    bird.thrust = false;
  }
  let rate = 22;
  if (bird.thrust) {
    rate = 40;
  } else if (holding) {
    rate = 2;
  }
  for (const spring of [hx, hy, hz]) {
    stepSpring(spring, 0, rate, dt);
  }
};

const stepHead = (bird: Lovebird, holding: boolean, dt: number) => {
  const { rig } = bird;
  const preen = envelope(bird, "preen");
  const chirp = envelope(bird, "chirp");
  const nuzzle = envelope(bird, "nuzzle");
  const tilt = bird.act === "tilt" ? Math.sin((bird.actFor / ACT_S.tilt) * Math.PI) : 0;
  const doze = rig.doze.x;
  const perched = bird.perch > 0.5;
  const gaze = perched ? glance(bird, dt) : 0;
  // Preening, it bows its head to the bend of its near wing; dozing, it turns it back over its far shoulder, its beak tucked into its back.
  const { near } = bird.view;
  const away = Math.max(preen, doze);
  const look = gaze * (1 - away) * (1 - nuzzle) + near * (1.45 * preen - 2.5 * doze);
  stepSpring(rig.look, look, perched ? 18 : 8, dt);
  // Nuzzling, it bobs its head down to the pointer twice.
  const bob =
    nuzzle * (0.25 + 0.3 * Math.abs(Math.sin((bird.actFor / ACT_S.nuzzle) * Math.PI * 2)));
  const nod = -1.1 * preen - 0.25 * doze + 0.3 * chirp - 0.12 * tilt - bob;
  stepSpring(rig.nod, Math.max(-1.1, Math.min(0.45, nod)) + (perched ? 0 : -0.08), 12, dt);
  stepSpring(rig.cock, 0.6 * tilt * bird.side + 0.25 * nuzzle * bird.side, 12, dt);
  const nibble = preen * 0.45 * Math.abs(Math.sin(bird.actFor * 15));
  const open = chirp * Math.abs(Math.sin((bird.actFor / ACT_S.chirp) * Math.PI * 3));
  stepSpring(rig.beak, Math.max(open, nibble), 26, dt);
  stepSpring(rig.preen, holding ? preen : 0, 10, dt);
  stepSpring(rig.content, nuzzle > 0.2 ? 1 : 0, 9, dt);
};

/** What it's up to, perched: dozing or not, and its next bit of business. */
const stepActs = (bird: Lovebird, dozing: boolean, seconds: number) => {
  bird.actFor += seconds;
  const busy = isBusy(bird);
  // Its business is a perched bird's, and not while it's carried; a cock of the head goes any time.
  const interrupted = (bird.perch < 0.5 || busy) && bird.act !== "tilt";
  if (bird.act !== "none" && (bird.actFor > ACT_S[bird.act] || interrupted)) {
    bird.act = "none";
  }
  const rouse = envelope(bird, "rouse");
  // Rousing, it shakes itself, body and head, in the screen's plane.
  bird.shiver = rouse * 0.14 * Math.sin(bird.actFor * Math.PI * 2 * 8);
  const { rig } = bird;
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 1.5 : 8, seconds);
  const fluff = 0.55 * rig.doze.x + rouse + 0.3 * envelope(bird, "preen") + 0.4 * rig.content.x;
  // Its feathers snap up at once, and settle slowly.
  const goal = Math.min(1, fluff);
  stepSpring(rig.fluff, goal, goal > rig.fluff.x ? 20 : 4, seconds);
  if (bird.act !== "none" || bird.perch < 0.9 || dozing || busy) {
    return;
  }
  if (bird.nuzzleDue) {
    bird.nuzzleDue = false;
    begin(bird, "nuzzle");
    return;
  }
  bird.next -= seconds;
  if (bird.next <= 0) {
    begin(bird, bird.random.pick(IDLE));
    bird.next = 1.4 + bird.random.next() * 2.6;
  }
};

/**
 * Settled a while on a resting pointer, it's being petted: once a perch, it
 * says so if it isn't talking and nuzzles down to it, once what it's at is done.
 */
const stepPetting = (bird: Lovebird, holding: boolean, seconds: number) => {
  bird.petted = holding && bird.still > 0 && bird.perch > 0.99 ? bird.petted + seconds : 0;
  // Nuzzling, it says so as soon as it isn't saying something else.
  if (bird.act === "nuzzle") {
    say(bird.emotes, PET);
  }
  // A petting owed a nuzzle is let go once the pointer moves on: it isn't nuzzled after.
  if (bird.petted === 0) {
    bird.nuzzleDue = false;
  }
  if (bird.pettedHere || !reached(bird.petted, seconds, PET_S)) {
    return;
  }
  bird.pettedHere = true;
  if (bird.act === "none") {
    begin(bird, "nuzzle");
  } else if (bird.act !== "nuzzle") {
    bird.nuzzleDue = true;
  }
};

/** A blink now and then: shut and open again in a few frames. */
const BLINK_S = 0.16;
const stepBlink = (bird: Lovebird, dt: number) => {
  bird.nextBlink -= dt;
  if (bird.nextBlink <= 0) {
    bird.nextBlink = bird.random.range(1.8, 5.5);
  }
  bird.blink = bird.nextBlink < BLINK_S ? Math.sin((1 - bird.nextBlink / BLINK_S) * Math.PI) : 0;
};

/** What it says unprompted: snores asleep, chatter flying. */
const stepTalk = (bird: Lovebird, dozing: boolean, seconds: number) => {
  stepEmotes(bird.emotes, seconds);
  if (dozing) {
    say(bird.emotes, SLEEP);
  } else if (bird.perch < 0.5 && bird.random.chance(seconds * 0.05)) {
    say(bird.emotes, CHATTER);
  }
};

/** Where it goes this step: holding on to the pointer, or flying after its spot (leaving the pointer, if it was on it). */
const stepPlace = (bird: Lovebird, pointer: Point, dt: number) => {
  const pace = Math.hypot(bird.pace.x, bird.pace.y);
  // Perched, a gentle move carries it along, till it tires of the ride; a brisk one and it's off.
  const tired = bird.ridden > RIDE_S;
  const landing =
    bird.flushed === 0 && !tired && (bird.still > LAND_S || (bird.riding && pace < SHAKE_OFF));
  const spot = spotOf(bird, pointer, landing);
  const off = Math.hypot(spot.x - bird.x, spot.y - bird.y);
  // Taken hold once it's close; perched, it holds on however far a gentle move carries the pointer.
  const holding = landing && (off < HOLD_AT || bird.riding);
  const wasRiding = bird.riding;
  bird.riding = holding;
  if (holding) {
    hold(bird, spot, wasRiding, dt);
  } else {
    if (wasRiding) {
      depart(bird, pace > TUMBLE ? "tumble" : "launch");
      bird.ridden = 0;
    } else if (bird.wings.launch > LAUNCH_S - PACE_S && pace > TUMBLE) {
      // Just off, and the pointer's gone on to a real jerk: it wasn't a launch, it's thrown off.
      bird.wings.launch = 0;
      depart(bird, "tumble");
    }
    fly(bird, spot, landing, off, dt);
  }
  // Its flare: over the last of its way in.
  const flare = landing && !holding ? smooth((FLARE_AT - off) / 30) : 0;
  stepSpring(bird.rig.flare, flare, flare > bird.rig.flare.x ? 16 : 6, dt);
  return holding;
};

export const stepLovebird = (bird: Lovebird, pointer: Point, moved: Point, seconds: number) => {
  const dt = Math.min(Math.max(0, seconds), MOST_STEP);
  bird.time += dt;
  bird.steps += 1;
  const back = turnBack(bird.back, moved, 60);
  // Never below the pointer: it flies above it.
  bird.back = { x: back.x, y: Math.min(0.2, back.y) };
  bird.still = Math.hypot(moved.x, moved.y) < 0.5 ? bird.still + seconds : 0;
  bird.flushed = Math.max(0, bird.flushed - seconds);
  bird.scramble = Math.max(0, bird.scramble - seconds);
  stepPace(bird, moved, seconds);
  const from = { x: bird.x, y: bird.y };
  const holding = stepPlace(bird, pointer, dt);
  // Off the pointer it's quickly a bird in the air again.
  bird.perch = approach(bird.perch, holding ? 1 : 0, holding ? 12 : 22, seconds);
  const dozing = bird.perch > 0.9 && bird.still > DOZE_S;
  stepBalance(bird, holding, dt);
  stepWings(bird, holding, dt);
  stepBody(bird, pointer, dt);
  stepTail(bird, holding, dt);
  stepHeadPlace(bird, from, holding, dt);
  stepHead(bird, holding, dt);
  stepActs(bird, dozing, seconds);
  stepPetting(bird, holding, seconds);
  stepBlink(bird, dt);
  stepTalk(bird, dozing, seconds);
  stepChain(bird.tail, tailHangOf(bird), TAIL, dt);
  bird.view = settleView(bird.view, viewOf(bird), dt);
};

/** Whether a point on the screen is on it: its body and head, above its feet. */
const isOn = (bird: Lovebird, at: Point) =>
  Math.abs(at.x - bird.x) < 15 * SIZE && at.y < bird.y + 2 && at.y > bird.y - 30 * SIZE;

export const pokeLovebird = (bird: Lovebird, at: Point) => {
  bird.still = 0;
  if (bird.riding) {
    // Perched, a click's at its feet, on whatever's under the pointer: the perch jolts, it flinches and cocks its head.
    begin(bird, "tilt");
    bird.wings.balance = 0.3;
    kickFlex(bird.dip, 25);
    say(bird.emotes, JOLTED, true);
  } else if (isOn(bird, at)) {
    // Clicked on in the air: flushed up in a startled hop, its feathers up in alarm.
    bird.flushed = FLUSH_S;
    bird.vy -= 260;
    bird.wings.launch = 0.4;
    bird.rig.fluff.x = Math.max(bird.rig.fluff.x, 0.45);
    say(bird.emotes, FLUSH, true);
  } else {
    // A click elsewhere: it always cocks its head at it, and sometimes asks.
    begin(bird, "tilt");
    say(bird.emotes, TILT, bird.random.chance(0.4));
  }
};

export const lovebird: Creature<Lovebird> = {
  create: createLovebird,
  poke: pokeLovebird,
  pose: lovebirdPose,
  step: stepLovebird,
};
