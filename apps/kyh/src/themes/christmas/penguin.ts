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
import type { Feet, Steps } from "../follower/feet";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Walker } from "../follower/walk";
import type { Go } from "./penguin-go";
import { createChain, hangOf, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { createFeet, groundSpeedOf, stepFeet } from "../follower/feet";
import { faceGoal, smooth, springAt, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker } from "../follower/walk";
import { createGo, isDown, stepGo, WALK, WALK_TOP, wayOf } from "./penguin-go";
import { layerSidesOf, orderOf, penguinPose, scarfHangOf } from "./penguin-pose";

/** A moment's business: a preen, a look about, a stretch, the ecstatic display, a jump (startled, or for joy). */
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
  /** Its gait on its feet (`penguin-go.ts`). */
  gait: Gait;
  /** How it's getting about: walking, or flopping, sliding and getting up (`penguin-go.ts`). */
  go: Go;
  /** Down on its belly, or on its way down. */
  sliding: boolean;
  emotes: Emotes;
  /** For what it says unprompted; and for its business, apart, so neither shifts the other. */
  random: Random;
  acts: Random;
  act: Act;
  actFor: number;
  next: number;
  /** Which flipper it preens under: 1 its left, -1 its right; and the heading it shows itself off at. */
  preenSide: 1 | -1;
  showing: number;
  /** A bray asked for while it couldn't (in the air, on its belly): done once it can. */
  queued: boolean;
  petted: number;
  /** A turn nearly all the way round: which way round it's going (1, -1, or 0 for none) and toward what. */
  turning: { way: number; goal: number };
  /** Seconds it's stood still. */
  stood: number;
  /** Seconds it's been about, for its flaps and beats. */
  time: number;
  rig: Rig;
  /** Its feet, planted where they land; their stride is the walker's phase. */
  feet: Feet;
  /** Each layer in front of its body or behind (`penguin-pose.ts` orders them), held a while either way so none flickers. */
  front: Record<string, boolean>;
  /** Its layers back to front, as they were last stacked. */
  stack: string[];
  /** Its scarf's ends, the long and the short: cloth, streaming out behind as it's carried and swinging back (`chain.ts`). */
  scarfEnd: Chain;
  scarfShort: Chain;
}

const BRAY = ["Hraa-aa-aa!", "Squawk!", "Merry Christmas!"];
const STARTLED = ["!", "eep!"];
const CHATTER = ["brrr…", "❄", "Merry Christmas!", "Let it snow!"];
const PET = ["♥", "*happy flap*"];
const SLIDE_LINES = ["Wheee!", "Belly slide!"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
/** Petted this long, it's had its flap and settles; this long, it dozes off under the hand. */
const PET_FLAP_S = 3.5;
const PET_DOZE_S = 9;
/** Faster than this it's going (screen pixels a second); a mouse slower than this over it is resting on it. */
const MOVING = 6;
const RESTING = 120;
/** Stood still this long, it turns from its way to the mouse. */
const STOOD_S = 0.8;
/** A turn up to this far, radians, goes the short way, even past its back: any more, and it picks its way round. */
const SHORT_TURN = 2.6;
/** Its heading facing the camera. */
const TOWARD = Math.PI / 2;
const IDLE: readonly Act[] = ["preen", "look", "look", "stretch", "jump"];

/**
 * Its scarf's ends: soft cloth, hardly kept to where they hang, so their
 * weight and the air and their own swing do most of it, as the ghost's hem.
 */
export const SCARF: Stuff = {
  damp: 2,
  drag: 0.02,
  keep: 0.005,
  keepTip: 0.0005,
  rub: 1.5,
  weight: 600,
};

/**
 * How it steps (`../follower/feet.ts`): short steps, its feet just ahead of
 * its middle and either side and never far from there, from two steps a
 * second at a dawdle to under five at its top walk.
 */
const STEPS: Steps = {
  cadence: [0.9, 2.4],
  duty: [0.66, 0.58],
  homes: [
    { ahead: 2.5, left: 4.2 },
    { ahead: 2.5, left: -4.2 },
  ],
  lift: [1.4, 2.2],
  offsets: [0, 0.5],
  reach: 9.5,
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
    acts: createRandom(seed + 2),
    emotes: createEmotes(seed),
    feet: createFeet(STEPS, walker, heading),
    front: {},
    gait: WALK,
    go: createGo(),
    next: 1.5,
    petted: 0,
    preenSide: 1,
    queued: false,
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
    showing: Math.PI / 2,
    sliding: false,
    stack: [],
    stood: 0,
    time: 0,
    turning: { goal: 0, way: 0 },
    walker,
  };
};

/** Whether it's on its feet and up, free to start something. */
const isUp = (penguin: Penguin) => penguin.go.going === "walk" && penguin.rig.slide.x < 0.3;

/** Starts an act, unless it's at it already: a running act is never started over. */
const begin = (penguin: Penguin, act: Act) => {
  if (penguin.act === act) {
    return;
  }
  penguin.act = act;
  penguin.actFor = 0;
  // Showing itself off, it turns to the camera, near enough: the three-quarter view on the side it
  // faces, picked once, so the goal holds still as it turns.
  if (act === "display" || act === "stretch") {
    const off = Math.atan2(
      Math.sin(penguin.rig.heading.x - TOWARD),
      Math.cos(penguin.rig.heading.x - TOWARD),
    );
    penguin.showing = TOWARD + Math.max(-0.6, Math.min(0.6, off));
  }
  if (act === "preen") {
    // Under the flipper on the side toward the camera, so it's its face that's seen, not the back of its head.
    penguin.preenSide = Math.cos(penguin.rig.heading.x) >= 0 ? 1 : -1;
  }
};

/** Brays (the ecstatic display) now if it can, else once it's landed or up off its belly. */
const bray = (penguin: Penguin) => {
  if (penguin.act === "display") {
    return;
  }
  if (penguin.act === "jump" || !isUp(penguin)) {
    penguin.queued = true;
    return;
  }
  begin(penguin, "display");
};

const isOn = (penguin: Penguin, at: Point) => isOnWalker(penguin.walker, at, 16, 46);

/** What it's up to: dozing or not, and its next bit of business when it's idle. */
const stepActs = (
  penguin: Penguin,
  { idle, moving, turned }: { idle: number; moving: boolean; turned: boolean },
  seconds: number,
) => {
  const dozing = (idle > DOZE_S && penguin.petted === 0) || penguin.petted > PET_DOZE_S;
  penguin.actFor += seconds;
  const kept = penguin.act === "display" || penguin.act === "jump";
  // Dozing off, it leaves off whatever it was at; going, whatever but a bray or a jump.
  const over = penguin.actFor > ACT_S[penguin.act] || ((moving || dozing) && !kept);
  if (penguin.act !== "none" && over) {
    penguin.act = "none";
  }
  if (penguin.queued && penguin.act === "none" && isUp(penguin)) {
    penguin.queued = false;
    begin(penguin, "display");
  }
  if (penguin.act !== "none" || moving || dozing || penguin.petted > 0 || !isUp(penguin)) {
    return dozing;
  }
  penguin.next -= seconds;
  // Only once it's done turning to the mouse: a preen picks its side from where it faces.
  if (idle > 1 && turned && penguin.next <= 0) {
    begin(penguin, penguin.acts.pick(IDLE));
    penguin.next = 1.5 + penguin.acts.next() * 3;
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
  bray(penguin);
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

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * Its heading's goal: on its belly, the way it slides; on its feet, the way
 * to where it's going; braying or stretching, the camera's, near enough;
 * else the mouse's.
 */
const headingGoal = (penguin: Penguin, pointer: Point, held: boolean) => {
  const { go, rig, walker } = penguin;
  if (go.going === "flop" || go.going === "rise") {
    return rig.heading.x;
  }
  const way = wayOf(go, walker, { heading: rig.heading.x, held, pointer });
  if (way !== null) {
    return way;
  }
  // Just stopped, it keeps facing its way a moment before it turns to the mouse: inching after it, it
  // doesn't turn back and forth.
  if (penguin.stood < STOOD_S) {
    return rig.heading.x;
  }
  // Braying or stretching, it turns to show itself off, flippers spread to either side.
  if (penguin.act === "display" || penguin.act === "stretch") {
    return penguin.showing;
  }
  return faceGoal(walker, pointer, rig.heading.x, Infinity);
};

/**
 * Turns its heading toward `goal`: the short way, unless that's nearly all
 * the way round, when it turns past the camera (showing its face, not its
 * back), the way round picked once and kept, so a goal straight behind it
 * can't swing it one way and back the next frame. A goal that comes back
 * within a short turn ends that: held to, it'd spin all the way round to it.
 */
const stepHeading = (penguin: Penguin, goal: number, seconds: number) => {
  const { rig, turning } = penguin;
  const heading = rig.heading.x;
  let turn = wrap(goal - heading);
  if (Math.abs(turn) <= SHORT_TURN) {
    turning.way = 0;
  } else if (turning.way === 0 || Math.abs(wrap(goal - turning.goal)) > 0.5) {
    // The way that doesn't take it past facing straight away from the camera.
    const away = wrap(-Math.PI / 2 - heading);
    const passes = Math.sign(away) === Math.sign(turn) && Math.abs(away) < Math.abs(turn);
    turning.way = passes ? -Math.sign(turn) : Math.sign(turn);
    turning.goal = goal;
  }
  if (turning.way !== 0) {
    turn = ((turn * turning.way + Math.PI * 2) % (Math.PI * 2)) * turning.way;
  }
  stepSpring(rig.heading, heading + turn, 7, seconds);
  rig.heading.x = wrap(rig.heading.x);
};

/** Its body: on its feet or its belly, which way, leaning, lifted and squashed. */
const stepBody = (
  penguin: Penguin,
  goal: { pointer: Point; held: boolean; dozing: boolean },
  seconds: number,
) => {
  const { rig } = penguin;
  // A belly flop is quick; getting up, less so.
  stepSpring(rig.slide, penguin.sliding ? 1 : 0, penguin.sliding ? 16 : 6, seconds);
  stepHeading(penguin, headingGoal(penguin, goal.pointer, goal.held), seconds);
  stepSpring(rig.doze, goal.dozing ? 1 : 0, goal.dozing ? 2 : 10, seconds);
  const preen = envelope(penguin, "preen");
  const display = envelope(penguin, "display");
  const jump = jumpOf(penguin);
  stepSpring(rig.pitch, -0.06 * preen + 0.3 * display - 0.1 * rig.doze.x, 9, seconds);
  // Preening, it turns a little toward the side it preens.
  stepSpring(rig.twist, 0.3 * preen * penguin.preenSide, 6, seconds);
  stepSpring(rig.lift, jump.lift, 40, seconds);
  stepSpring(rig.squash, jump.squash, 30, seconds);
};

/** Its head, beak and flippers. */
const stepLimbs = (penguin: Penguin, seconds: number) => {
  const { preenSide, rig } = penguin;
  const preen = envelope(penguin, "preen");
  const display = envelope(penguin, "display");
  const stretch = envelope(penguin, "stretch");
  const look = envelope(penguin, "look");
  const beat = Math.sin(penguin.time * 16);
  const petting = pettingOf(penguin);
  // Looking about: one way, then the other. Preening: round and down to the root of the flipper it
  // lifts, nibbling at it.
  const about = look * Math.sin((penguin.actFor / ACT_S.look) * Math.PI * 2) * 0.9;
  const nibble = preen * Math.sin(penguin.time * 13);
  stepSpring(rig.look, about + preen * preenSide * (1.4 + 0.15 * nibble), 12, seconds);
  const bow = preen * (0.75 + 0.12 * nibble) + 0.6 * rig.doze.x;
  stepSpring(rig.nod, 0.75 * display + 0.3 * stretch - bow, 12, seconds);
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
  const preened = preenSide === 1 ? 0 : 1;
  for (const [index, flipper] of rig.flippers.entries()) {
    const goal = index === preened ? Math.max(raise, 1.05 * preen) : raise;
    stepSpring(flipper, goal, display > 0 || petting > 0 ? 22 : 12, seconds);
  }
};

/** Each layer in front of the body or behind, changed only once it's clearly the other side. */
const stepLayers = (penguin: Penguin) => {
  for (const [name, side] of Object.entries(layerSidesOf(penguin))) {
    const was = penguin.front[name];
    penguin.front[name] = was === undefined ? side > 0 : side > (was ? -1 : 1);
  }
  penguin.stack = orderOf(penguin);
};

/** How the snow holds a scarf's end lying on it, each fixed step: not below it, rubbing along it. */
const snowAt = (floor: number) => (chain: Chain) => {
  for (const knot of chain.knots.slice(1)) {
    if (knot.y > floor) {
      knot.y = floor;
      knot.py = Math.max(knot.py, floor);
      knot.px += (knot.x - knot.px) * 0.05;
    }
  }
};

/** Its scarf's ends, carried by the knot: the air and their swing do the rest, and they lie on the snow. */
const stepScarf = (penguin: Penguin, seconds: number) => {
  const { walker } = penguin;
  const ends = [penguin.scarfEnd, penguin.scarfShort];
  // Sliding, the air under them as it rushes along bears their weight (all of it, never more: they don't
  // float up), and the drag streams them out behind.
  const stuff = { ...SCARF, weight: SCARF.weight * Math.max(0, 1 - penguin.rig.slide.x) };
  for (const [index, chain] of ends.entries()) {
    const { floor, rest } = scarfHangOf(penguin, index);
    stepChain(
      chain,
      hangOf(rest, walker),
      stuff,
      Math.min(seconds, 0.05),
      snowAt(walker.y + floor),
    );
  }
};

/**
 * Its feet: on its feet, stepping as far as it goes over the ground. Going
 * down, they stay where they stand; on its belly they trail behind (drawn
 * from its rear), and getting up, it stands on them under it, stopped.
 */
const stepLegs = (penguin: Penguin, seconds: number) => {
  const { feet, go, rig, walker } = penguin;
  const under = () =>
    Object.assign(feet, createFeet(STEPS, walker, rig.heading.x), { phase: feet.phase });
  if (go.going === "slide" || (go.going === "rise" && go.since === 0)) {
    under();
  } else if (go.going === "walk" && rig.slide.x < 0.3) {
    stepFeet(feet, STEPS, walker, rig.heading.x, seconds);
  } else {
    feet.cadence = 0;
  }
  walker.phase = feet.phase;
};

export const stepPenguin = (penguin: Penguin, pointer: Point, moved: Point, seconds: number) => {
  const { go, rig, walker } = penguin;
  penguin.time += seconds;
  // Petted (a mouse resting on it), it stays for it; braying or jumping, it stands its ground.
  const resting =
    Math.hypot(moved.x, moved.y) < RESTING * Math.max(seconds, 1 / 240) && isOn(penguin, pointer);
  const held = resting || penguin.act === "display" || penguin.act === "jump";
  const lying = rig.slide.x;
  stepGo(go, walker, { heading: rig.heading.x, held, lying, moved, pointer }, seconds);
  penguin.sliding = isDown(go);
  stepLegs(penguin, seconds);
  const moving = walker.speed > MOVING || go.going !== "walk";
  penguin.stood = moving ? 0 : penguin.stood + seconds;
  const idle = moving ? 0 : walker.still;
  penguin.petted = !moving && isOn(penguin, pointer) ? penguin.petted + seconds : 0;
  const turned =
    penguin.stood >= STOOD_S &&
    Math.abs(wrap(headingGoal(penguin, pointer, held) - rig.heading.x)) < 0.2;
  const dozing = stepActs(penguin, { idle, moving, turned }, seconds);
  stepTalk(penguin, dozing, idle, seconds);
  // It rocks foot to foot as it steps, more the farther it goes a step.
  const going = Math.min(1, groundSpeedOf(walker) / 35);
  const stepping = penguin.feet.cadence > 0 && go.going === "walk";
  stepSpring(rig.waddle, stepping ? Math.max(going, 0.5) : 0, 8, seconds);
  stepBody(penguin, { dozing, held, pointer }, seconds);
  stepLimbs(penguin, seconds);
  stepLayers(penguin);
  stepScarf(penguin, seconds);
};

export const pokePenguin = (penguin: Penguin, at: Point) => {
  penguin.walker.still = Math.min(penguin.walker.still, 3);
  if (isOn(penguin, at)) {
    if (penguin.act !== "display") {
      say(penguin.emotes, BRAY, true);
      bray(penguin);
    }
    return;
  }
  // Startled whatever it's saying: a jump where it stands (on its belly, or in the air already, only a word).
  if (penguin.act !== "jump" && penguin.act !== "display" && isUp(penguin)) {
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
