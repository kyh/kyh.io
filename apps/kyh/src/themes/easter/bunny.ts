// The bunny that follows a mouse about at Easter, for `follower.tsx`: a
// white rabbit, built in the round (`bunny-pose.ts` draws it) and turning to
// face its way. It hops after the mouse (`../follower/walk.ts`): gathered,
// it pushes off its hind feet, stretches out in the air, lands on its
// forepaws and brings its hind feet down ahead of them, small hops at a
// dawdle and long bounds at a run, and it finishes a hop before it stops. Its
// body squashes landing and stretches taking off, with a little wobble after
// (`jiggle.ts`); its long ears and its cotton tail are chains
// (`../follower/chain.ts`), streaming back as it goes, flopping as it lands
// and swinging back up when it stops, the right ear floppier than the left.
// Left be, it sniffs about, its nose twitching, grooms its face with its
// paws, and sits up tall to look round; left long enough, it lays its ears
// back and dozes. A click on it, or a petting, sets it leaping and twisting in
// the air (a binky, a happy rabbit's jump); a click elsewhere makes it thump.
// Every movement eases on a spring (`../follower/solid.ts`), so it never
// snaps. Pure (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Walker } from "../follower/walk";
import type { Jiggle } from "./jiggle";
import { createChain, flickChain, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { faceGoal, PITCH, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker, stepWalker } from "../follower/walk";
import { bunnyPose, hangsOf, hopOf, sidesOf } from "./bunny-pose";
import { jiggleAt, stepJiggle } from "./jiggle";
import { stiffen } from "./stiffen";

/** Its hops, on the screen: a stride a hop at a dawdle, longer as it hurries. */
const GAIT: Gait = { accel: 1400, behind: 54, below: 28, stride: 30, top: 280 };

type Act = "none" | "sniff" | "groom" | "stand" | "binky" | "thump";
const ACT_S: Record<Act, number> = {
  binky: 0.95,
  groom: 2.6,
  none: 0,
  sniff: 1.8,
  stand: 2.8,
  thump: 0.6,
};

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** 0 to 1: sat up tall on its haunches, grooming, nose down sniffing, dozing, content being petted. */
  stand: Spring;
  groom: Spring;
  sniff: Spring;
  doze: Spring;
  content: Spring;
  /** Its body lifted (pixels), and pitched (radians, + nose up), rolled and twisted on top of its hop: a binky's. */
  lift: Spring;
  pitch: Spring;
  roll: Spring;
  twist: Spring;
  /** Its head turned (radians, + to its left) and nodded (+ up, - down). */
  look: Spring;
  nod: Spring;
  /** Its ears laid back (radians; less than 0 pricked forward), and its tail flagged up. */
  lay: Spring;
  tail: Spring;
  /** 0 to 1: its hind feet kicked out behind (a binky), and lifted to stamp (a thump). */
  kick: Spring;
  stamp: Spring;
  /** How long a hop it's making, pixels: none standing. */
  stride: Spring;
}

export interface Bunny {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  petted: number;
  /** Seconds it's been about, for its paws' scrubbing. */
  time: number;
  /** Hops made: the fraction is where it is in this one. */
  hop: number;
  rig: Rig;
  /** Its body's squash (-) and stretch (+), wobbling. */
  squash: Jiggle;
  /** Its ears (its left, its right) and its tail, in the screen's pixels. */
  ears: [Chain, Chain];
  tail: Chain;
  /** Its nose's twitching, in seconds of it. */
  twitch: number;
  /** Which of its parts are in front of its body (`sidesOf`), kept so they don't flicker over and under. */
  sides: Record<string, boolean>;
}

const BINKY = ["binky!", "♥", "wheee!"];
const THUMP = ["*thump*", "!"];
const CHATTER = ["*sniff sniff*", "Happy Easter!", "found any eggs?", "*nibble*"];
const PET = ["♥", "*purr*"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
const MOVING = 25;
/**
 * Slower than this (over the ground, pixels a second) it stops hopping, once
 * it's landed. Its hops a second: the fewest, at a dawdle, so its hops are
 * small rather than slow; the most, at a run, its hops longer instead; and the
 * fastest it goes over the ground, the screen's up and down foreshortened.
 */
const HOPPING = 10;
const LEAST_HOPS = 2.5;
const MOST_HOPS = 4;
const GROUND_TOP = 440;
/** How fast it finishes a hop once it's stopping. */
const SETTLE_HOPS = 2.4;
/** Petted, how far from straight at the camera it turns: a three-quarter view. */
const PETTED_TURN = 0.5;
const IDLE: readonly Act[] = ["sniff", "sniff", "groom", "stand"];

/** Its ears: stiff at the root and soft toward the tip; the right one softer and heavier, so it flops more. */
const EARS: readonly [Stuff, Stuff] = [
  { damp: 7, drag: 0.005, keep: 0.14, keepTip: 0.022, rub: 0.45, weight: 30 },
  { damp: 5.5, drag: 0.006, keep: 0.11, keepTip: 0.014, rub: 0.5, weight: 70 },
];
/** The most an ear's joint bends from its rest, radians: it bends along its length, never kinks. */
const EAR_BEND = 0.3;
/** And its root's swing from where it stands, held by the muscles at its base. */
const EAR_ROOT_BEND = 0.4;
/** Its tail: a short stiff puff that wobbles. */
const TAIL: Stuff = { damp: 4.5, drag: 0.004, keep: 0.09, keepTip: 0.09, rub: 0.3, weight: 0 };

export const createBunny = (at: Point): Bunny => {
  const seed = Math.round(at.x * 7919 + at.y * 13);
  const bunny: Bunny = {
    act: "none",
    actFor: 0,
    ears: [
      { knots: [], owed: 0 },
      { knots: [], owed: 0 },
    ],
    emotes: createEmotes(seed),
    hop: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rig: {
      content: springAt(0),
      doze: springAt(0),
      groom: springAt(0),
      // A three-quarter view, toward the camera, to begin with.
      heading: springAt(Math.PI / 4),
      kick: springAt(0),
      lay: springAt(0.12),
      lift: springAt(0),
      look: springAt(0),
      nod: springAt(0),
      pitch: springAt(0),
      roll: springAt(0),
      sniff: springAt(0),
      stamp: springAt(0),
      stand: springAt(0),
      stride: springAt(0),
      tail: springAt(0),
      twist: springAt(0),
    },
    sides: {},
    squash: jiggleAt(0),
    tail: { knots: [], owed: 0 },
    time: 0,
    twitch: 0,
    walker: createWalker(at, GAIT),
  };
  const hangs = hangsOf(bunny);
  bunny.ears = [createChain(hangs.ears[0]), createChain(hangs.ears[1])];
  bunny.tail = createChain(hangs.tail);
  return bunny;
};

const begin = (bunny: Bunny, act: Act) => {
  bunny.act = act;
  bunny.actFor = 0;
};

const isOn = (bunny: Bunny, at: Point) => isOnWalker(bunny.walker, at, 18, 42);

const stepActs = (bunny: Bunny, moving: boolean, idle: number, seconds: number) => {
  const dozing = idle > DOZE_S && bunny.petted === 0;
  bunny.actFor += seconds;
  const kept = bunny.act === "binky" || bunny.act === "thump";
  const over = bunny.actFor > ACT_S[bunny.act] || (moving && !kept);
  if (bunny.act !== "none" && over) {
    bunny.act = "none";
  }
  if (bunny.act !== "none" || moving || dozing || bunny.petted > 0) {
    return dozing;
  }
  bunny.next -= seconds;
  if (idle > 0.8 && bunny.next <= 0) {
    begin(bunny, bunny.random.pick(IDLE));
    bunny.next = 1.2 + bunny.random.next() * 2.5;
  }
  return dozing;
};

const stepTalk = (bunny: Bunny, dozing: boolean, idle: number, seconds: number) => {
  const { emotes, random } = bunny;
  stepEmotes(emotes, seconds);
  if (dozing) {
    say(emotes, SLEEP);
  } else if (bunny.petted > PETTED_S) {
    // The moment a petting counts, it answers it, whatever it was saying.
    if (reached(bunny.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
      // A binky it's in the middle of runs its course.
      if (bunny.act !== "binky") {
        begin(bunny, "binky");
      }
    }
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

/** How far into an act it is, 0 to 1, eased in and out over its first and last `edge`. */
const envelope = (bunny: Bunny, act: Act, edge = 0.2) => {
  if (bunny.act !== act) {
    return 0;
  }
  const t = bunny.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) / edge);
};

/** A binky: a crouch, then up in an arc, twisting and kicking its hind feet out at the top, and down. */
const binkyOf = (bunny: Bunny) => {
  if (bunny.act !== "binky") {
    return { air: 0, crouch: 0, u: 0 };
  }
  const t = bunny.actFor / ACT_S.binky;
  const u = Math.min(1, Math.max(0, (t - 0.16) / 0.66));
  return {
    air: u > 0 && u < 1 ? 4 * u * (1 - u) : 0,
    crouch: t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : 0,
    u,
  };
};

/** Which way it turns to: its way, or the mouse; petted, round to the camera, to see who's petting it. */
const headingGoal = (bunny: Bunny, pointer: Point) => {
  const { rig, walker } = bunny;
  if (bunny.petted > 0.2) {
    return Math.cos(rig.heading.x) >= 0 ? Math.PI / 2 - PETTED_TURN : Math.PI / 2 + PETTED_TURN;
  }
  return faceGoal(walker, pointer, rig.heading.x, MOVING);
};

/** Every part after where it's going, on its spring. */
const stepRig = (bunny: Bunny, pointer: Point, dozing: boolean, seconds: number) => {
  const { rig, walker } = bunny;
  const binky = binkyOf(bunny);
  const stand = envelope(bunny, "stand");
  const groom = envelope(bunny, "groom");
  const sniff = envelope(bunny, "sniff");
  const thump = envelope(bunny, "thump", 0.3);
  const going = Math.min(1, walker.speed / GAIT.top);
  const flying = bunny.act === "binky" ? 1 : 0;
  // Turned to its way, or the mouse; held in the air, and dozing.
  if (!dozing && bunny.act !== "binky") {
    stepAngle(rig.heading, headingGoal(bunny, pointer), 9, seconds);
  }
  // Thumping, it rises up on the alert as it stamps.
  stepSpring(rig.stand, Math.min(1, stand + 0.3 * groom + 0.35 * thump), 6, seconds);
  stepSpring(rig.groom, groom, 8, seconds);
  stepSpring(rig.sniff, sniff, 7, seconds);
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 1.5 : 8, seconds);
  stepSpring(rig.content, bunny.petted > 0.3 ? 1 : 0, 5, seconds);
  stepSpring(rig.lift, 21 * binky.air - 1.5 * binky.crouch, 26, seconds);
  stepSpring(rig.twist, 0.85 * Math.sin(Math.PI * 2 * binky.u) * binky.air, 18, seconds);
  stepSpring(rig.roll, 0.4 * Math.sin(Math.PI * binky.u) * flying, 14, seconds);
  stepSpring(rig.kick, binky.air ** 2, 16, seconds);
  stepSpring(rig.pitch, 0.25 * binky.air, 12, seconds);
  // Looking round, sat up; else at the mouse, a little.
  const lookGoal = stand * Math.sin((bunny.actFor / ACT_S.stand) * Math.PI * 2) * 0.75;
  stepSpring(rig.look, lookGoal, 6, seconds);
  const nod = 0.12 * stand + 0.2 * thump - 0.85 * sniff - 0.5 * groom - 0.12 * rig.doze.x;
  stepSpring(rig.nod, Math.max(-0.9, Math.min(0.3, nod)), 8, seconds);
  // Ears back as it runs, pricked up sat tall, laid flat dozing or petted.
  const lay =
    0.12 +
    0.3 * going +
    1.25 * rig.doze.x +
    0.55 * rig.content.x -
    0.14 * stand -
    0.3 * thump +
    0.3 * groom;
  stepSpring(rig.lay, Math.max(-0.25, Math.min(1.4, lay)), 6, seconds);
  stepSpring(rig.tail, Math.min(1.1, 1.1 * thump + 0.5 * binky.air + 0.3 * going), 10, seconds);
  // A thump: its hind feet lifted, then brought down hard at a third of the way.
  const t = bunny.actFor / ACT_S.thump;
  const stamping = bunny.act === "thump" && t < 0.34;
  const before = rig.stamp.x;
  stepSpring(rig.stamp, stamping ? smooth(t / 0.3) : 0, stamping ? 18 : 40, seconds);
  if (before > 0.5 && rig.stamp.x <= 0.5 && bunny.act === "thump") {
    bunny.squash.v -= 3.2;
    for (const ear of bunny.ears) {
      flickChain(ear, { x: 0, y: 220 });
    }
  }
};

/** Its hops: on while it goes, finished once it stops; and how long a hop. */
const stepHop = (bunny: Bunny, seconds: number) => {
  const { rig, walker } = bunny;
  const dt = Math.min(seconds, 0.05);
  // Over the ground: a pixel up the screen is farther than one across.
  const speed = Math.hypot(walker.vx, walker.vy / Math.sin(PITCH));
  const rate =
    speed > HOPPING ? LEAST_HOPS + (MOST_HOPS - LEAST_HOPS) * smooth(speed / GROUND_TOP) : 0;
  stepSpring(rig.stride, rate > 0 ? speed / rate : 0, 8, seconds);
  if (rate > 0) {
    bunny.hop += rate * dt;
  } else if (bunny.hop % 1 !== 0) {
    // Stopping: it lands this hop and stands, not frozen in the air.
    const next = bunny.hop + SETTLE_HOPS * dt;
    bunny.hop = Math.floor(next) > Math.floor(bunny.hop) ? Math.floor(next) : next;
  }
  stepJiggle(bunny.squash, hopOf(bunny).stretch, 4.2, 0.3, seconds);
};

/**
 * Its top speed over the ground: up and down the screen is toward and away
 * from the camera, foreshortened, so it goes slower there on the screen and
 * its hops never outrun its legs.
 */
const holdToGround = (walker: Walker, seconds: number) => {
  const ground = Math.hypot(walker.vx, walker.vy / Math.sin(PITCH));
  if (ground <= GROUND_TOP) {
    return;
  }
  const dt = Math.min(Math.max(seconds, 0), 0.05);
  const keep = GROUND_TOP / ground;
  walker.x -= walker.vx * (1 - keep) * dt;
  walker.y -= walker.vy * (1 - keep) * dt;
  walker.vx *= keep;
  walker.vy *= keep;
  walker.speed = Math.hypot(walker.vx, walker.vy);
};

/** Its ears and tail after where they hang this frame, the air on them as it goes. */
const stepChains = (bunny: Bunny, seconds: number) => {
  const hangs = hangsOf(bunny);
  for (const [index, ear] of bunny.ears.entries()) {
    const hang = hangs.ears[index] ?? hangs.ears[0];
    stepChain(ear, hang, EARS[index] ?? EARS[0], seconds);
    stiffen(ear, hang, EAR_BEND, EAR_ROOT_BEND);
  }
  stepChain(bunny.tail, hangs.tail, TAIL, seconds);
};

export const stepBunny = (bunny: Bunny, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = bunny;
  bunny.time += seconds;
  // Leaping, or petted (a mouse resting on it), it stays put.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(bunny, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || bunny.act === "binky");
  holdToGround(walker, seconds);
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  bunny.petted = !moving && isOn(bunny, pointer) ? bunny.petted + seconds : 0;
  const dozing = stepActs(bunny, moving, idle, seconds);
  stepTalk(bunny, dozing, idle, seconds);
  stepRig(bunny, pointer, dozing, seconds);
  stepHop(bunny, seconds);
  stepChains(bunny, seconds);
  bunny.sides = sidesOf(bunny);
  // Its nose twitches all the while it's awake, fast as it sniffs.
  bunny.twitch += seconds * (1 - bunny.rig.doze.x) * (1 + 1.2 * bunny.rig.sniff.x);
};

export const pokeBunny = (bunny: Bunny, at: Point) => {
  bunny.walker.still = Math.min(bunny.walker.still, 3);
  if (isOn(bunny, at)) {
    say(bunny.emotes, BINKY, true);
    begin(bunny, "binky");
  } else if (bunny.act !== "binky") {
    // Startled, it always thumps; it only sometimes says so.
    say(bunny.emotes, THUMP, bunny.random.chance(0.4));
    begin(bunny, "thump");
  }
};

export const bunny: Creature<Bunny> = {
  create: createBunny,
  poke: pokeBunny,
  pose: bunnyPose,
  step: stepBunny,
};
