// The lovebird that follows a mouse about at Valentine's, for `follower.tsx`:
// a peach-faced lovebird built in the round (`lovebird-pose.ts` draws it) and
// seen from a little above, so it turns through every view as it flies. It
// flies after the mouse a little behind and above it, as a small parrot
// does: quick wingbeats, the hand whipping after each stroke (`flex.ts`),
// and in a steady cruise a few beats then a bound on folded wings. It banks
// into its turns, pitches nose down speeding up and up braking, and its head
// stays level. When the mouse rests, it flares in to land on the pointer's
// tip (wings spread, tail fanned, feet thrown forward) and settles with a
// dip; perched, it rides a gentle move along, balancing (its body swaying
// over its feet, its tail countering, a few flaps when it's knocked about,
// its head held still and caught up in a thrust); a quick jerk shakes it off
// in a ruffled scramble. Perched, it looks about in quick glances, preens
// under a wing, chirps, cocks its head and rouses its feathers; left long
// enough, it fluffs up, tucks its head back and dozes. A click on it flushes
// it off; a click elsewhere makes it cock its head. Its tail is a chain
// (`../follower/chain.ts`) trailing on the air. Every other part eases on a
// spring (`../follower/solid.ts`). Pure (state is stepped in place, for a
// frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Point } from "../follower/walk";
import type { Flex } from "./flex";
import { flickChain, stepChain } from "../follower/chain";
import { createEmotes, say, stepEmotes } from "../follower/emote";
import { faceGoal, PITCH, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { approach, turnBack } from "../follower/walk";
import { flexAt, kickFlex, stepFlex } from "./flex";
import { layerDepths, lovebirdPose, SIZE, tailHangOf } from "./lovebird-pose";
import { strokeAt } from "./wingbeat";

/** A moment's business, perched: a preen, a chirp, a cock of the head, a rousing shake of its feathers. */
type Act = "none" | "preen" | "chirp" | "tilt" | "rouse";
const ACT_S: Record<Act, number> = { chirp: 0.7, none: 0, preen: 1.8, rouse: 0.75, tilt: 1.2 };
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
  /** 0 to 1: tail closed to fanned; its tail cocked (radians, + up). */
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
  /** 0 to 1: beak shut to open, eyes open to shut, feathers sleek to ruffled, a wing lifted to preen. */
  beak: Spring;
  doze: Spring;
  fluff: Spring;
  preen: Spring;
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
  /** Seconds left of flapping to keep its balance, perched. */
  balance: number;
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
  /** Whether it's said it's content since it last landed. */
  settled: boolean;
  /** Its body's shake as it rouses, radians of roll. */
  shiver: number;
  time: number;
  rig: Rig;
  wings: Wings;
  /** Perched, its body swaying over its feet (radians, + clockwise on the screen) and dipping (pixels down). */
  sway: Flex;
  dip: Flex;
  /** The pointer's speed perched, smoothed (pixels a second). */
  carried: [Spring, Spring];
  /** Its layers back to front, as last stacked. */
  order: string[];
  /** Its tail, trailing on the air (`../follower/chain.ts`), in the screen's pixels. */
  tail: Chain;
  emotes: Emotes;
  random: Random;
}

const FLUSH = ["tweet!", "eep!", "♥?"];
const TILT = ["?", "chirp?"];
const CHATTER = ["♥", "tweet tweet", "be mine?", "chirp!", "xoxo", "♥ ♥ ♥"];
const SHAKEN = ["eep!", "whoa!"];
const CONTENT = ["♥", "chirrup ♥"];
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
const SHAKE_OFF = 600;
/** Seconds a flush keeps it off the pointer. */
const FLUSH_S = 1.4;
const MOST_STEP = 0.05;
/** Pixels from the pointer it starts its flare to land. */
const FLARE_AT = 90;
/** Coming in to land, a gentler pull, so it comes in slower and flares over the last of it. */
const LAND_PULL = 28;
const LAND_DAMP = 10;
/** The longest piece the wingbeat is stepped in. */
const PIECE = 1 / 240;
/** How far its head is held off its neck, at most, before it thrusts to catch up. */
const NECK_REACH = 3;
/** Its tail feathers: stiff, light and quick to flick back. */
const TAIL: Stuff = { damp: 8, drag: 0.012, keep: 0.07, keepTip: 0.02, rub: 0.5, weight: 60 };

const clamp = (value: number, most: number) => Math.max(-most, Math.min(most, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const createLovebird = (at: Point): Lovebird => {
  const seed = Math.round(at.x * 7919 + at.y * 11);
  const bird: Lovebird = {
    act: "none",
    actFor: 0,
    ax: 0,
    ay: 0,
    back: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
    carried: [springAt(0), springAt(0)],
    dip: flexAt(0),
    emotes: createEmotes(seed),
    flushed: 0,
    gaze: 0,
    next: 1.5,
    nextGaze: 1,
    order: [],
    perch: 0,
    random: createRandom(seed + 1),
    riding: false,
    rig: {
      amp: springAt(1),
      bank: springAt(0),
      beak: springAt(0),
      cock: springAt(0),
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
      spread: springAt(1),
      tail: springAt(0),
    },
    scramble: 0,
    settled: true,
    shiver: 0,
    side: 1,
    still: 0,
    sway: flexAt(0),
    tail: { knots: [], owed: 0 },
    thrust: false,
    time: 0,
    vx: 0,
    vy: 0,
    wings: {
      arm: strokeAt(0, 1),
      balance: 0,
      beats: 4,
      bound: 0,
      hand: flexAt(strokeAt(0, 1)),
      phase: 0,
    },
    x: at.x - BEHIND,
    y: at.y - ABOVE,
  };
  return bird;
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

const fly = (bird: Lovebird, spot: Point, landing: boolean, dt: number) => {
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
  bird.x += bird.vx * dt;
  bird.y += bird.vy * dt;
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
    bird.rig.tail.v += 5;
  }
};

/** It touches down on the pointer: its body dips under its own weight, its tail flicks on. */
const touchDown = (bird: Lovebird, vx: number, vy: number) => {
  kickFlex(bird.dip, 30 + Math.max(0, vy) * 0.08);
  kickFlex(bird.sway, clamp(vx * 0.004, 1.2));
  bird.rig.tail.v += 6;
  flickChain(bird.tail, { x: vx * 0.5, y: vy * 0.5 + 120 });
  bird.settled = false;
};

/** It's lost its hold: feathers ruffled, tumbling, scrambling into the air. */
const knockedOff = (bird: Lovebird) => {
  const { rig, wings } = bird;
  rig.fluff.x = 1;
  const tumble = bird.random.chance(0.5) ? 1 : -1;
  rig.bank.v += 9 * tumble;
  rig.pitch.v -= 4;
  rig.amp.x = 1;
  wings.bound = 0;
  wings.beats = 6;
  bird.scramble = 0.6;
  // Its tail whipped about in the tumble.
  flickChain(bird.tail, { x: 420 * tumble, y: -360 });
  say(bird.emotes, SHAKEN);
};

/** Perched, the pointer's moves rock it: its body lags a jerk and swings back over its feet. */
const stepBalance = (bird: Lovebird, moved: Point, holding: boolean, dt: number) => {
  if (dt <= 0) {
    return;
  }
  const [carriedX, carriedY] = bird.carried;
  const before = { x: carriedX.x, y: carriedY.x };
  stepSpring(carriedX, holding ? moved.x / dt : 0, 16, dt);
  stepSpring(carriedY, holding ? moved.y / dt : 0, 16, dt);
  if (holding) {
    // Carried off to the right, it's left leaning back to the left; jerked down, its body's left up.
    kickFlex(bird.sway, -(carriedX.x - before.x) * 0.035);
    kickFlex(bird.dip, -(carriedY.x - before.y) * 0.05);
  }
  // Carried steadily, it leans into the way it goes.
  const lean = holding ? clamp(carriedX.x * 0.0009, 0.3) : 0;
  stepFlex(bird.sway, lean, 1.7, 0.2, dt);
  stepFlex(bird.dip, 0, 3.2, 0.3, dt);
  bird.sway.x = clamp(bird.sway.x, 0.7);
  bird.dip.x = clamp(bird.dip.x, 4);
};

interface WingGoal {
  amp: number;
  hertz: number;
  spread: number;
}

/** Perched, its wings folded, unless it's been knocked about: then a few flaps to steady itself. */
const perchedWings = (bird: Lovebird, dt: number): WingGoal => {
  const { wings } = bird;
  const knocked =
    Math.abs(bird.sway.x) > 0.16 || Math.hypot(bird.carried[0].x, bird.carried[1].x) > 260;
  wings.balance = knocked ? 0.45 : Math.max(0, wings.balance - dt);
  return wings.balance > 0
    ? { amp: 0.75, hertz: 5.5, spread: 0.65 }
    : { amp: 0, hertz: 0, spread: 0 };
};

/** In the air: flaring to land, scrambling, gliding down, bounding on folded wings, or beating. */
const flyingWings = (bird: Lovebird): WingGoal => {
  const speed = Math.hypot(bird.vx, bird.vy);
  if (bird.rig.flare.x > 0.15) {
    return { amp: 1, hertz: 5.5, spread: 1 };
  }
  if (bird.scramble > 0) {
    return { amp: 1, hertz: 8, spread: 1 };
  }
  if (bird.vy > 160 && speed > 240) {
    return { amp: 0.12, hertz: 4, spread: 1 };
  }
  if (bird.wings.bound > 0) {
    return { amp: 0.25, hertz: 0, spread: 0 };
  }
  const climb = Math.max(0, -bird.vy);
  return { amp: 1, hertz: 6.5 + Math.min(2, climb / 250) + (speed < 90 ? 1 : 0), spread: 1 };
};

/** Whether it's cruising: going steadily, neither climbing hard, diving, braking nor landing. */
const cruising = (bird: Lovebird) => {
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  return (
    speed > 170 &&
    Math.abs(along) < 2000 &&
    bird.vy > -140 &&
    bird.vy < 160 &&
    bird.rig.flare.x < 0.05 &&
    bird.scramble === 0
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
  const { rig } = bird;
  const goal = holding ? perchedWings(bird, dt) : flyingWings(bird);
  // Preening, it lifts the wing it's preening under a little.
  const spread = Math.max(goal.spread, rig.preen.x * 0.15);
  // Bounding, it folds its wings tight at once; perched, it folds them away at its leisure.
  const folding = bird.wings.bound > 0 ? 30 : 11;
  stepSpring(rig.spread, spread, spread > rig.spread.x ? 22 : folding, dt);
  stepSpring(rig.amp, goal.amp, 12, dt);
  beat(bird, goal.hertz, !holding && cruising(bird), dt);
};

/** Which way it faces perched: three-quarters toward the camera, on the side it already faces. */
const perchedHeading = (heading: number) => (Math.cos(heading) >= 0 ? 0.6 : Math.PI - 0.6);

/** Its body after its flight: turned its way, banked into turns, pitched by how it speeds up. */
const stepBody = (bird: Lovebird, pointer: Point, holding: boolean, dt: number) => {
  const { rig, perch } = bird;
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  const heading =
    perch > 0.5
      ? perchedHeading(rig.heading.x)
      : faceGoal(
          { speed, vx: bird.vx, vy: bird.vy, x: bird.x, y: bird.y },
          pointer,
          rig.heading.x,
          70,
        );
  stepAngle(rig.heading, heading, perch > 0.5 ? 3 : 6, dt);
  // Banked into its turn, the harder the faster it goes.
  const turning = clamp(rig.heading.v * Math.min(speed, 500) * 0.0016, 0.9);
  stepSpring(rig.bank, (1 - perch) * turning, 10, dt);
  const bounding = bird.wings.bound > 0;
  const flying =
    (bounding ? 0.06 : 0.22) + clamp(-bird.vy * 0.0007, 0.3) + clamp(-along * 0.00011, 0.38);
  const flared = mix(flying, 1.15, rig.flare.x);
  const perched = 0.92 - 0.12 * rig.doze.x + 0.12 * rig.preen.x;
  stepSpring(rig.pitch, mix(flared, perched, perch), 8, dt);
  stepSpring(rig.lift, bounding ? -2.5 : 0, 7, dt);
};

/** Its tail fanning as it brakes, turns and lands; cocked to counter a sway; its feet down to land and grip. */
const stepTail = (bird: Lovebird, holding: boolean, dt: number) => {
  const { rig, perch } = bird;
  const speed = Math.hypot(bird.vx, bird.vy);
  const along = (bird.ax * bird.vx + bird.ay * bird.vy) / Math.max(speed, 1);
  const braking = Math.max(0, Math.min(0.6, -along / 2600));
  const flyingFan = Math.min(1, 0.15 + braking + Math.abs(rig.bank.x) * 0.35 + rig.flare.x);
  const perchedFan = Math.min(
    1,
    0.06 + 0.3 * envelope(bird, "chirp") + 0.8 * envelope(bird, "rouse"),
  );
  stepSpring(rig.fan, mix(flyingFan, perchedFan, perch), 14, dt);
  // Perched, its tail swings against its body's lean: up as it tips forward over its feet.
  const counter = bird.sway.x * Math.cos(rig.heading.x) * 1.3;
  const flyingTail = -0.4 * rig.flare.x + (bird.wings.bound > 0 ? 0.06 : 0);
  stepSpring(rig.tail, mix(flyingTail, 0.18 + clamp(counter, 0.5), perch), 10, dt);
  stepSpring(rig.legs, holding ? 1 : 0, holding ? 16 : 9, dt);
  stepSpring(rig.reach, holding ? 0 : rig.flare.x, 10, dt);
};

/** Perched, it glances about in quick turns of its head, holding each a moment. */
const glance = (bird: Lovebird, dt: number) => {
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
  const tilt = bird.act === "tilt" ? Math.sin((bird.actFor / ACT_S.tilt) * Math.PI) : 0;
  const doze = rig.doze.x;
  const perched = bird.perch > 0.5;
  const gaze = perched ? glance(bird, dt) : 0;
  // Preening, it turns its head back under the wing on its near side; dozing, it tucks it into its back.
  const near = Math.cos(rig.heading.x) >= 0 ? 1 : -1;
  const look = gaze * (1 - preen) * (1 - doze) + near * Math.min(2.4, 2.1 * preen + 2.4 * doze);
  stepSpring(rig.look, look, perched ? 18 : 8, dt);
  stepSpring(
    rig.nod,
    Math.max(-0.75, Math.min(0.45, -0.55 * preen - 0.35 * doze + 0.3 * chirp - 0.12 * tilt)) +
      (perched ? 0 : -0.08),
    12,
    dt,
  );
  stepSpring(rig.cock, 0.6 * tilt * bird.side, 12, dt);
  const nibble = preen * 0.45 * Math.abs(Math.sin(bird.actFor * 15));
  const open = chirp * Math.abs(Math.sin((bird.actFor / ACT_S.chirp) * Math.PI * 3));
  stepSpring(rig.beak, Math.max(open, nibble), 26, dt);
  stepSpring(rig.preen, holding ? preen : 0, 10, dt);
};

/** What it's up to, perched: dozing or not, and its next bit of business. */
const stepActs = (bird: Lovebird, dozing: boolean, seconds: number) => {
  bird.actFor += seconds;
  // Its business is a perched bird's; a cock of the head goes in flight too.
  const flownOff = bird.perch < 0.5 && bird.act !== "tilt";
  if (bird.act !== "none" && (bird.actFor > ACT_S[bird.act] || flownOff)) {
    bird.act = "none";
  }
  const rouse = envelope(bird, "rouse");
  bird.shiver = rouse * 0.22 * Math.sin(bird.actFor * Math.PI * 2 * 7);
  const { rig } = bird;
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 1.5 : 8, seconds);
  stepSpring(rig.fluff, 0.55 * rig.doze.x + rouse + 0.3 * envelope(bird, "preen"), 4, seconds);
  if (bird.act !== "none" || bird.perch < 0.9 || dozing) {
    return;
  }
  bird.next -= seconds;
  if (bird.next <= 0) {
    begin(bird, bird.random.pick(IDLE));
    bird.next = 1.4 + bird.random.next() * 2.6;
  }
};

/** What it says unprompted: snores asleep, a contented chirrup once it's settled, chatter flying. */
const stepTalk = (bird: Lovebird, dozing: boolean, seconds: number) => {
  stepEmotes(bird.emotes, seconds);
  if (dozing) {
    say(bird.emotes, SLEEP);
  } else if (!bird.settled && bird.perch > 0.99 && bird.still > 1.5) {
    // Held on a still pointer, it's content: it says so and rouses its feathers.
    if (say(bird.emotes, CONTENT)) {
      bird.settled = true;
      if (bird.act === "none") {
        begin(bird, "rouse");
      }
    }
  } else if (bird.perch < 0.5 && bird.random.chance(seconds * 0.05)) {
    say(bird.emotes, CHATTER);
  }
};

/** Pixels of depth one layer must pass another by before they swap: so a wing on its stroke doesn't flicker in front and behind. */
const RESTACK = 2.5;

/**
 * Its layers back to front: as they were, but for any that's now nearer the
 * camera than the one in front of it by more than a margin, moved forward.
 */
export const restack = (order: readonly string[], depths: readonly [string, number][]) => {
  const depth = new Map(depths);
  if (order.length !== depths.length || order.some((name) => !depth.has(name))) {
    return depths.toSorted((a, b) => a[1] - b[1]).map(([name]) => name);
  }
  const next = [...order];
  let swapped = true;
  while (swapped) {
    swapped = false;
    for (let index = 0; index < next.length - 1; index += 1) {
      const back = next[index] ?? "";
      const front = next[index + 1] ?? "";
      if ((depth.get(back) ?? 0) > (depth.get(front) ?? 0) + RESTACK) {
        next[index] = front;
        next[index + 1] = back;
        swapped = true;
      }
    }
  }
  return next;
};

export const stepLovebird = (bird: Lovebird, pointer: Point, moved: Point, seconds: number) => {
  const dt = Math.min(seconds, MOST_STEP);
  bird.time += dt;
  const back = turnBack(bird.back, moved, 60);
  // Never below the pointer: it flies above it.
  bird.back = { x: back.x, y: Math.min(0.2, back.y) };
  bird.still = Math.hypot(moved.x, moved.y) < 0.5 ? bird.still + seconds : 0;
  bird.flushed = Math.max(0, bird.flushed - seconds);
  bird.scramble = Math.max(0, bird.scramble - seconds);
  // Perched, a gentle move carries it along; a quick one shakes it off.
  const gentle = dt > 0 && Math.hypot(moved.x, moved.y) / dt < SHAKE_OFF;
  const landing = bird.flushed === 0 && (bird.still > LAND_S || (bird.riding && gentle));
  const spot = spotOf(bird, pointer, landing);
  const off = Math.hypot(spot.x - bird.x, spot.y - bird.y);
  // Landed once it's close; perched, it holds on however far a gentle move carries the pointer.
  const holding = landing && (off < 4 || bird.riding);
  const from = { x: bird.x, y: bird.y };
  const wasRiding = bird.riding;
  bird.riding = holding;
  if (holding) {
    if (!wasRiding) {
      touchDown(bird, bird.vx, bird.vy);
    }
    bird.x = spot.x;
    bird.y = spot.y;
    bird.vx = 0;
    bird.vy = 0;
    bird.ax = 0;
    bird.ay = 0;
  } else {
    if (wasRiding) {
      knockedOff(bird);
    }
    fly(bird, spot, landing, dt);
  }
  bird.perch = approach(bird.perch, holding ? 1 : 0, 12, seconds);
  const flare = landing && !holding ? smooth((FLARE_AT - off) / 40) : 0;
  stepSpring(bird.rig.flare, flare, flare > bird.rig.flare.x ? 14 : 6, dt);
  const dozing = bird.perch > 0.9 && bird.still > DOZE_S;
  stepBalance(bird, moved, holding, dt);
  stepWings(bird, holding, dt);
  stepBody(bird, pointer, holding, dt);
  stepTail(bird, holding, dt);
  stepHeadPlace(bird, from, holding, dt);
  stepHead(bird, holding, dt);
  stepActs(bird, dozing, seconds);
  stepTalk(bird, dozing, seconds);
  stepChain(bird.tail, tailHangOf(bird), TAIL, dt);
  bird.order = restack(bird.order, layerDepths(bird));
};

/** Whether a point on the screen is on it: its body and head, above its feet. */
const isOn = (bird: Lovebird, at: Point) =>
  Math.abs(at.x - bird.x) < 18 * SIZE && at.y < bird.y + 6 && at.y > bird.y - 34 * SIZE;

export const pokeLovebird = (bird: Lovebird, at: Point) => {
  bird.still = 0;
  if (isOn(bird, at)) {
    // Flushed off in a flutter, straight up.
    bird.flushed = FLUSH_S;
    bird.vy -= 260;
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
