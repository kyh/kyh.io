// The penguin that follows a mouse about at Christmas, for `follower.tsx`:
// an Adélie penguin in a red scarf, built in the round (`penguin-pose.ts`
// draws it) and turning to face its way. It waddles after the mouse
// (`../follower/walk.ts`) on short steps, its feet planted where they land
// (`../follower/feet.ts`), rocking from foot to foot, flippers held out for
// balance; no faster than a penguin walks, so left behind it flops onto its
// belly and toboggans after the mouse, as penguins do on snow, and gets back
// up once it's nearly there. Left be, it preens under a flipper, turns its
// head to look about and stretches its flippers; left long enough, it tucks
// its head down and dozes standing. A click on it, or a petting, sets it
// braying with its head thrown back and flippers spread (the ecstatic
// display); a petting kept up, it flaps happily, then settles and dozes off
// under the hand. A click elsewhere startles it into a jump. Every movement
// eases on a spring (`../follower/solid.ts`), so it never snaps. Pure (state
// is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Walker } from "../follower/walk";
import type { Feet, Steps } from "../follower/feet";
import { createChain, flickChain, hangOf, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { createFeet, groundSpeedOf, stepFeet } from "../follower/feet";
import { faceGoal, PITCH, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker, spotOf, stepWalker } from "../follower/walk";
import { layerSidesOf, penguinPose, scarfHangOf } from "./penguin-pose";

/** The screen's up and down is the ground's toward and away from the camera, foreshortened by this. */
const SIN = Math.sin(PITCH);

/** On its feet: a penguin's walk, no faster than this over the ground (a second), whichever way it goes. */
const WALK_TOP = 80;
const WALK: Gait = { accel: 500, behind: 64, below: 34, stride: 16, top: WALK_TOP };
/** On its belly: fast, and slow to stop. */
const SLIDE: Gait = { accel: 650, behind: 64, below: 34, stride: 16, top: 420 };
/** How hard the walker hurries after its spot (as `walk.ts` does): its speed this times how far off it is. */
const HURRY = 2.6;
/** Left behind this long at its top walk, it flops and slides; slower than this over the ground, it gets up. */
const FLOP_S = 0.3;
const STAND = 55;

/** A moment's business: a preen, a look about, a stretch, the ecstatic display, a startled jump. */
type Act = "none" | "preen" | "look" | "stretch" | "display" | "jump";
const ACT_S: Record<Act, number> = {
  display: 1.8,
  jump: 0.8,
  look: 2.2,
  none: 0,
  preen: 2.2,
  stretch: 1.6,
};

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** Its body turned from its heading (radians, + to its left), as it preens. */
  twist: Spring;
  /** Its body leaning (radians, + back, - bowed), lifted (pixels) and squashed (+ squat, - stretched tall). */
  pitch: Spring;
  lift: Spring;
  squash: Spring;
  /** 0 to 1: on its feet to on its belly. */
  slide: Spring;
  /** 0 to 1: standing to waddling, its rock from foot to foot. */
  waddle: Spring;
  /** Its head turned (radians, + to its left) and nodded (+ up, - down). */
  look: Spring;
  nod: Spring;
  /** Its flippers raised out from its sides (radians), each. */
  flippers: [Spring, Spring];
  /** 0 to 1: beak shut to open, eyes open to shut. */
  beak: Spring;
  doze: Spring;
}

export interface Penguin {
  walker: Walker;
  /** Its gait this frame: walking, or sliding. */
  gait: Gait;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  petted: number;
  /** On its belly, and seconds it's been left behind on its feet. */
  sliding: boolean;
  behind: number;
  /** Seconds it's been about, for its flaps and beats. */
  time: number;
  rig: Rig;
  /** Its feet, planted where they land; their stride is the walker's phase. */
  feet: Feet;
  /** Each layer in front of its body or behind (`penguin-pose.ts` orders them), held a while either way so none flickers. */
  front: Record<string, boolean>;
  /** Its scarf's ends, the long and the short: cloth, streaming out behind as it's carried and swinging back (`chain.ts`). */
  scarfEnd: Chain;
  scarfShort: Chain;
}

const BRAY = ["Hraa-aa-aa!", "Squawk!", "Merry Christmas!"];
const STARTLED = ["!", "eep!"];
const CHATTER = ["brrr…", "❄", "Merry Christmas!", "*waddle waddle*", "Let it snow!"];
const PET = ["♥", "*happy flap*"];
const SLIDE_LINES = ["Wheee!", "Belly slide!"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
/** Petted this long, it's had its flap and settles; this long, it dozes off under the hand. */
const PET_FLAP_S = 3.5;
const PET_DOZE_S = 9;
const MOVING = 20;
/** Its heading facing the camera. */
const TOWARD = Math.PI / 2;
const IDLE: readonly Act[] = ["preen", "look", "look", "stretch"];

/**
 * Its scarf's ends: soft cloth, hardly kept to where they hang, so their
 * weight and the air and their own swing do most of it, as the ghost's hem.
 */
export const SCARF: Stuff = {
  damp: 1.2,
  drag: 0.02,
  keep: 0.005,
  keepTip: 0.0005,
  rub: 1.5,
  weight: 340,
};

/**
 * How it steps (`../follower/feet.ts`): short steps, its feet just ahead of
 * its middle and either side, from two steps a second at a dawdle to under
 * five at its top walk.
 */
const STEPS: Steps = {
  cadence: [0.9, 2.3],
  duty: [0.66, 0.58],
  homes: [
    { ahead: 2.5, left: 4.2 },
    { ahead: 2.5, left: -4.2 },
  ],
  lift: [1.6, 2.4],
  offsets: [0, 0.5],
  reach: 13,
  top: WALK_TOP,
};

export const createPenguin = (at: Point): Penguin => {
  const seed = Math.round(at.x * 7919 + at.y * 17);
  const walker = createWalker(at, WALK);
  // A three-quarter view, toward the camera, to begin with.
  const heading = Math.PI / 4;
  return {
    act: "none",
    actFor: 0,
    behind: 0,
    emotes: createEmotes(seed),
    feet: createFeet(STEPS, walker, heading),
    front: {},
    gait: WALK,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rig: {
      beak: springAt(0),
      doze: springAt(0),
      flippers: [springAt(0.15), springAt(0.15)],
      heading: springAt(heading),
      lift: springAt(0),
      look: springAt(0),
      nod: springAt(0),
      pitch: springAt(0),
      slide: springAt(0),
      squash: springAt(0),
      twist: springAt(0),
      waddle: springAt(0),
    },
    // Laid out where they hang on its first step.
    scarfEnd: createChain({ rest: [], root: at }),
    scarfShort: createChain({ rest: [], root: at }),
    sliding: false,
    time: 0,
    walker,
  };
};

/** Starts an act, unless it's at it already: a running act is never started over. */
const begin = (penguin: Penguin, act: Act) => {
  if (penguin.act === act) {
    return;
  }
  penguin.act = act;
  penguin.actFor = 0;
  if (act === "display" || act === "jump") {
    flickChain(penguin.scarfEnd, { x: 0, y: -160 });
    flickChain(penguin.scarfShort, { x: 0, y: -120 });
  }
};

const isOn = (penguin: Penguin, at: Point) => isOnWalker(penguin.walker, at, 16, 46);

/**
 * Its gait this frame: on its feet no faster than a penguin walks over the
 * ground, whichever way across the screen that is; left behind a moment at
 * that, it flops onto its belly and slides, and gets up once it's nearly there.
 */
const gaitOf = (penguin: Penguin, pointer: Point, held: boolean, seconds: number): Gait => {
  const { walker } = penguin;
  const spot = spotOf(walker, penguin.gait, pointer);
  const dx = spot.x - walker.x;
  const dy = spot.y - walker.y;
  const off = Math.hypot(dx, dy);
  // Ground a pixel, the way it's going: across the screen one, toward the camera more.
  const ground = off > 0 ? Math.hypot(dx, dy / SIN) / off : 1;
  const want = off * HURRY * ground;
  const ahead = !held && want > WALK_TOP * 1.05;
  penguin.behind = ahead ? penguin.behind + seconds : Math.max(0, penguin.behind - seconds * 2);
  if (!penguin.sliding && penguin.behind > FLOP_S) {
    penguin.sliding = true;
  } else if (penguin.sliding && want < STAND && groundSpeedOf(walker) < STAND * 1.6) {
    penguin.sliding = false;
    penguin.behind = 0;
  }
  return penguin.sliding ? SLIDE : { ...WALK, top: WALK_TOP / ground };
};

/** What it's up to: dozing or not, and its next bit of business when it's idle. */
const stepActs = (penguin: Penguin, moving: boolean, idle: number, seconds: number) => {
  const dozing = (idle > DOZE_S && penguin.petted === 0) || penguin.petted > PET_DOZE_S;
  penguin.actFor += seconds;
  const kept = penguin.act === "display" || penguin.act === "jump";
  const over = penguin.actFor > ACT_S[penguin.act] || (moving && !kept);
  if (penguin.act !== "none" && over) {
    penguin.act = "none";
  }
  if (penguin.act !== "none" || moving || dozing || penguin.petted > 0) {
    return dozing;
  }
  penguin.next -= seconds;
  if (idle > 1 && penguin.next <= 0) {
    begin(penguin, penguin.random.pick(IDLE));
    penguin.next = 1.5 + penguin.random.next() * 3;
  }
  return dozing;
};

/** A petting counted: it answers it, whatever it was saying; mid-bray, it brays on with a heart. */
const answerPetting = (penguin: Penguin) => {
  const { emotes } = penguin;
  if (penguin.act === "display") {
    say(emotes, emotes.line && !emotes.line.endsWith("♥") ? [`${emotes.line} ♥`] : PET, true);
    return;
  }
  say(emotes, PET, true);
  begin(penguin, "display");
};

const stepTalk = (penguin: Penguin, dozing: boolean, idle: number, seconds: number) => {
  const { emotes, random } = penguin;
  stepEmotes(emotes, seconds);
  // Up off its belly, it's done saying so.
  if (!penguin.sliding && emotes.line !== null && SLIDE_LINES.includes(emotes.line)) {
    emotes.left = 0;
  }
  if (dozing) {
    say(emotes, SLEEP);
  } else if (penguin.petted > PETTED_S) {
    // The moment a petting counts, it answers it.
    if (reached(penguin.petted, seconds, PETTED_S)) {
      answerPetting(penguin);
    }
  } else if (penguin.rig.slide.x > 0.8 && random.chance(seconds * 0.8)) {
    say(emotes, SLIDE_LINES);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

/** How far into an act it is, 0 to 1, eased in and out over its first and last fifth. */
const envelope = (penguin: Penguin, act: Act) => {
  if (penguin.act !== act) {
    return 0;
  }
  const t = penguin.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) * 5);
};

/** A jump: a crouch to spring from, up and down, and a squash as it lands. */
const jumpOf = (penguin: Penguin) => {
  if (penguin.act !== "jump") {
    return { flare: 0, lift: 0, squash: 0 };
  }
  const t = penguin.actFor;
  if (t < 0.14) {
    return { flare: 0, lift: 0, squash: 0.16 * Math.sin((t / 0.14) * (Math.PI / 2)) };
  }
  if (t < 0.6) {
    const up = Math.sin(((t - 0.14) / 0.46) * Math.PI);
    return { flare: 1, lift: 12 * up, squash: -0.08 * up };
  }
  const landed = Math.min(1, (t - 0.6) / 0.2);
  return { flare: 1 - landed, lift: 0, squash: 0.14 * Math.sin(landed * Math.PI) };
};

/** 0 to 1: how much it flaps for a petting, settling after a while of it. */
const pettingOf = (penguin: Penguin) =>
  smooth((penguin.petted - 0.3) / 0.3) * (1 - smooth(penguin.petted - PET_FLAP_S));

/** Its heading's goal: its way over the ground while it goes, else the mouse's way, or the camera's. */
const headingGoal = (penguin: Penguin, pointer: Point) => {
  const { rig, walker } = penguin;
  if (walker.speed > MOVING) {
    return Math.atan2(walker.vy / SIN, walker.vx);
  }
  // Braying, it turns to show itself off: no farther than a three-quarter view from the camera.
  if (penguin.act === "display") {
    const off = Math.atan2(Math.sin(rig.heading.x - TOWARD), Math.cos(rig.heading.x - TOWARD));
    return TOWARD + Math.max(-0.6, Math.min(0.6, off));
  }
  return faceGoal(walker, pointer, rig.heading.x, MOVING);
};

/** Its body: on its feet or its belly, which way, leaning, lifted and squashed. */
const stepBody = (penguin: Penguin, pointer: Point, dozing: boolean, seconds: number) => {
  const { rig } = penguin;
  const slide = penguin.sliding ? 1 : 0;
  stepSpring(rig.slide, slide, penguin.sliding ? 8 : 6, seconds);
  stepAngle(rig.heading, headingGoal(penguin, pointer), rig.slide.x > 0.5 ? 10 : 7, seconds);
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 2 : 10, seconds);
  const preen = envelope(penguin, "preen");
  const display = envelope(penguin, "display");
  const jump = jumpOf(penguin);
  stepSpring(rig.pitch, -0.08 * preen + 0.3 * display - 0.1 * rig.doze.x, 9, seconds);
  stepSpring(rig.twist, 0.35 * preen, 6, seconds);
  stepSpring(rig.lift, jump.lift, 40, seconds);
  stepSpring(rig.squash, jump.squash, 30, seconds);
};

/** Its head, beak and flippers. */
const stepLimbs = (penguin: Penguin, seconds: number) => {
  const { rig } = penguin;
  const preen = envelope(penguin, "preen");
  const display = envelope(penguin, "display");
  const stretch = envelope(penguin, "stretch");
  const look = envelope(penguin, "look");
  const beat = Math.sin(penguin.time * 16);
  const petting = pettingOf(penguin);
  // Looking about: one way, then the other. Preening: round and down to under its left flipper.
  const lookGoal = look * Math.sin((penguin.actFor / ACT_S.look) * Math.PI * 2) * 0.9 + preen * 1.2;
  stepSpring(rig.look, lookGoal, 8, seconds);
  stepSpring(
    rig.nod,
    0.75 * display + 0.3 * stretch - 0.55 * preen - 0.6 * rig.doze.x,
    10,
    seconds,
  );
  stepSpring(rig.beak, display * (0.5 + 0.5 * Math.abs(beat)), 18, seconds);
  // Flippers: out for balance waddling, out to the sides sliding, beating as it brays, spread as it
  // stretches, flapping for a petting, flung up in a fright: the most of them, never over its head.
  const raise = Math.min(
    1.6,
    Math.max(
      0.15,
      0.32 * rig.waddle.x,
      0.8 * rig.slide.x,
      display * (1.15 + 0.3 * beat),
      stretch * 1.45,
      petting * (0.6 + 0.35 * beat),
      0.9 * jumpOf(penguin).flare,
    ),
  );
  for (const [index, flipper] of rig.flippers.entries()) {
    const goal = index === 0 ? Math.max(raise, 0.7 * preen) : raise;
    stepSpring(flipper, goal, display > 0 || petting > 0 ? 22 : 12, seconds);
  }
};

/** Each layer in front of the body or behind, changed only once it's clearly the other side. */
const stepLayers = (penguin: Penguin) => {
  for (const [name, side] of Object.entries(layerSidesOf(penguin))) {
    const was = penguin.front[name];
    penguin.front[name] = was === undefined ? side > 0 : side > (was ? -1 : 1);
  }
};

/** Its scarf's ends, carried by the knot: the air and their swing do the rest, and they lie on the snow. */
const stepScarf = (penguin: Penguin, seconds: number) => {
  const { walker } = penguin;
  const ends = [penguin.scarfEnd, penguin.scarfShort];
  // Sliding, the air under them as it rushes along bears their weight, and streams them out behind.
  const stuff = { ...SCARF, weight: SCARF.weight * (1 - 1.9 * penguin.rig.slide.x) };
  for (const [index, chain] of ends.entries()) {
    const { floor, rest } = scarfHangOf(penguin, index);
    stepChain(chain, hangOf(rest, walker), stuff, Math.min(seconds, 0.05));
    for (const knot of chain.knots.slice(1)) {
      if (knot.y > walker.y + floor) {
        knot.y = walker.y + floor;
        knot.py = knot.y;
        // Rubbing along the snow.
        knot.px += (knot.x - knot.px) * 0.2;
      }
    }
  }
};

export const stepPenguin = (penguin: Penguin, pointer: Point, moved: Point, seconds: number) => {
  const { rig, walker } = penguin;
  penguin.time += seconds;
  // Petted (a mouse resting on it), it stays for it; braying or jumping, it stands its ground.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(penguin, pointer);
  const held = resting || penguin.act === "display" || penguin.act === "jump";
  penguin.gait = gaitOf(penguin, pointer, held, seconds);
  stepWalker(walker, penguin.gait, pointer, moved, seconds, held);
  // Its feet, on its feet: stepping as far as it goes over the ground. On its belly, they trail, and
  // it gets up with them under it.
  if (rig.slide.x < 0.5) {
    stepFeet(penguin.feet, STEPS, walker, rig.heading.x, seconds);
  } else {
    Object.assign(penguin.feet, createFeet(STEPS, walker, rig.heading.x), {
      phase: penguin.feet.phase,
    });
  }
  walker.phase = penguin.feet.phase;
  const stepping = rig.slide.x < 0.5 && penguin.feet.cadence > 0;
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  penguin.petted = !moving && isOn(penguin, pointer) ? penguin.petted + seconds : 0;
  const dozing = stepActs(penguin, moving, idle, seconds);
  stepTalk(penguin, dozing, idle, seconds);
  // It rocks foot to foot as it steps, more the farther it goes a step.
  const going = Math.min(1, groundSpeedOf(walker) / 45);
  stepSpring(rig.waddle, penguin.sliding ? 0 : Math.max(going, stepping ? 0.5 : 0), 8, seconds);
  stepBody(penguin, pointer, dozing, seconds);
  stepLimbs(penguin, seconds);
  stepLayers(penguin);
  stepScarf(penguin, seconds);
};

export const pokePenguin = (penguin: Penguin, at: Point) => {
  penguin.walker.still = Math.min(penguin.walker.still, 3);
  if (isOn(penguin, at)) {
    if (penguin.act !== "display") {
      say(penguin.emotes, BRAY, true);
      begin(penguin, "display");
    }
    return;
  }
  // Startled whatever it's saying: a jump where it stands (on its belly, a flinch of the flippers).
  if (penguin.act !== "jump" && penguin.act !== "display" && !penguin.sliding) {
    begin(penguin, "jump");
  }
  say(penguin.emotes, STARTLED, penguin.random.chance(0.35));
};

export const penguin: Creature<Penguin> = {
  create: createPenguin,
  poke: pokePenguin,
  pose: penguinPose,
  step: stepPenguin,
};
