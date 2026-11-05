// The penguin that follows a mouse about at Christmas, for `follower.tsx`:
// an Adélie penguin in a red scarf, built in the round (`penguin-pose.ts`
// draws it) and turning to face its way. It waddles after the mouse
// (`../follower/walk.ts`), rocking from foot to foot on short steps,
// flippers held out for balance; left far behind, it flops onto its belly
// and toboggans after it, as penguins do on snow. Left be, it preens under a
// flipper, turns its head to look about and stretches its flippers; left long
// enough, it tucks its head down and dozes standing. A click on it, or a
// petting, sets it braying with its head thrown back and flippers spread
// (the ecstatic display); a click elsewhere makes it jump. Every movement
// eases on a spring (`../follower/solid.ts`), so it never snaps. Pure
// (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Swing, Walker } from "../follower/walk";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { faceGoal, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker, pace, stepSwing, stepWalker } from "../follower/walk";
import { penguinPose } from "./penguin-pose";

const GAIT: Gait = { accel: 1200, behind: 64, below: 34, stride: 16, top: 400 };

/** A moment's business: a preen, a look about, a stretch, the ecstatic display, a startled jump. */
type Act = "none" | "preen" | "look" | "stretch" | "display" | "jump";
const ACT_S: Record<Act, number> = {
  display: 1.8,
  jump: 0.6,
  look: 2.2,
  none: 0,
  preen: 2,
  stretch: 1.6,
};

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** Its body leaning (radians, + back, - bowed) and lifted (pixels). */
  pitch: Spring;
  lift: Spring;
  /** 0 to 1: on its feet to on its belly. */
  slide: Spring;
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
  gait: Gait;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  petted: number;
  /** Seconds it's been about, for its flaps and beats. */
  time: number;
  rig: Rig;
  /** Its scarf's end, swinging as it's carried. */
  scarf: Swing;
  lastVx: number;
  lastVy: number;
}

const BRAY = ["Hraa-aa-aa!", "Squawk!", "Merry Christmas!"];
const STARTLED = ["!", "eep!"];
const CHATTER = ["brrr…", "❄", "Merry Christmas!", "*waddle waddle*", "Let it snow!"];
const PET = ["♥", "*happy flap*"];
const SLIDE = ["Wheee!", "Belly slide!"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
const MOVING = 20;
/** Faster than this it's on its belly; slower than this it gets back up. */
const SLIDING = 0.5;
const STANDING = 0.3;
const IDLE: readonly Act[] = ["preen", "look", "look", "stretch"];

export const createPenguin = (at: Point): Penguin => {
  const seed = Math.round(at.x * 7919 + at.y * 17);
  return {
    act: "none",
    actFor: 0,
    emotes: createEmotes(seed),
    gait: GAIT,
    lastVx: 0,
    lastVy: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rig: {
      beak: springAt(0),
      doze: springAt(0),
      flippers: [springAt(0.15), springAt(0.15)],
      // A three-quarter view, toward the camera, to begin with.
      heading: springAt(Math.PI / 4),
      lift: springAt(0),
      look: springAt(0),
      nod: springAt(0),
      pitch: springAt(0),
      slide: springAt(0),
    },
    scarf: { angle: 0, spin: 0 },
    time: 0,
    walker: createWalker(at, GAIT),
  };
};

const begin = (penguin: Penguin, act: Act) => {
  penguin.act = act;
  penguin.actFor = 0;
  if (act === "display" || act === "jump") {
    penguin.scarf.spin += 8;
  }
};

const isOn = (penguin: Penguin, at: Point) => isOnWalker(penguin.walker, at, 16, 46);

/** What it's up to: dozing or not, and its next bit of business when it's idle. */
const stepActs = (penguin: Penguin, moving: boolean, idle: number, seconds: number) => {
  const dozing = idle > DOZE_S && penguin.petted === 0;
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

const stepTalk = (penguin: Penguin, dozing: boolean, idle: number, seconds: number) => {
  const { emotes, random } = penguin;
  stepEmotes(emotes, seconds);
  if (dozing) {
    say(emotes, SLEEP);
  } else if (penguin.petted > PETTED_S) {
    // The moment a petting counts, it answers it, whatever it was saying.
    if (reached(penguin.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
      begin(penguin, "display");
    }
  } else if (penguin.rig.slide.x > 0.8 && random.chance(seconds * 0.8)) {
    say(emotes, SLIDE);
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

/** Every part after where it's going, on its spring. */
const stepRig = (penguin: Penguin, pointer: Point, dozing: boolean, seconds: number) => {
  const { rig, walker } = penguin;
  const fast = walker.speed / GAIT.top;
  // It flops down past a run and gets up again once it's slowed, not at one speed both ways.
  const sliding = fast > SLIDING || (rig.slide.x > 0.5 && fast > STANDING);
  stepSpring(rig.slide, sliding ? 1 : 0, sliding ? 9 : 6, seconds);
  stepAngle(
    rig.heading,
    faceGoal(walker, pointer, rig.heading.x, MOVING),
    rig.slide.x > 0.5 ? 12 : 7,
    seconds,
  );
  stepSpring(rig.doze, dozing ? 1 : 0, dozing ? 2 : 10, seconds);

  const preen = envelope(penguin, "preen");
  const display = envelope(penguin, "display");
  const stretch = envelope(penguin, "stretch");
  const look = envelope(penguin, "look");
  const jump = penguin.act === "jump" ? Math.sin((penguin.actFor / ACT_S.jump) * Math.PI) : 0;
  const walking = pace(walker, GAIT) * (1 - rig.slide.x);
  const beat = Math.sin(penguin.time * 16);
  const petting = penguin.petted > 0.3 ? 1 : 0;

  stepSpring(rig.pitch, -0.42 * preen + 0.3 * display - 0.1 * rig.doze.x, 9, seconds);
  stepSpring(rig.lift, 11 * jump, 16, seconds);
  // Looking about: one way, then the other. Preening: down under its near flipper.
  const lookGoal = look * Math.sin((penguin.actFor / ACT_S.look) * Math.PI * 2) * 0.9 + preen * 0.8;
  stepSpring(rig.look, lookGoal, 8, seconds);
  stepSpring(
    rig.nod,
    0.75 * display + 0.3 * stretch - 0.75 * preen - 0.6 * rig.doze.x,
    10,
    seconds,
  );
  stepSpring(rig.beak, display * (0.5 + 0.5 * Math.abs(beat)), 18, seconds);
  // Flippers: out for balance waddling, beating as it brays, spread as it stretches, back along it sliding.
  const raise =
    0.18 +
    0.35 * walking +
    display * (1.1 + 0.25 * beat) +
    stretch * 1.35 +
    petting * (0.5 + 0.35 * beat);
  for (const [index, flipper] of rig.flippers.entries()) {
    const preening = index === 0 ? preen * 0.7 : 0;
    stepSpring(
      flipper,
      rig.slide.x > 0.5 ? 0.05 : raise + preening,
      display > 0 ? 22 : 12,
      seconds,
    );
  }
};

export const stepPenguin = (penguin: Penguin, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = penguin;
  penguin.time += seconds;
  // Petted (a mouse resting on it), it stays for it.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(penguin, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || penguin.act === "display");
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  penguin.petted = !moving && isOn(penguin, pointer) ? penguin.petted + seconds : 0;
  const dozing = stepActs(penguin, moving, idle, seconds);
  stepTalk(penguin, dozing, idle, seconds);
  stepRig(penguin, pointer, dozing, seconds);
  // Its scarf's end lags its body as it's carried, and is tossed a little each waddle.
  const dt = Math.min(seconds, 0.05);
  const heading = penguin.rig.heading.x;
  const ax =
    dt > 0
      ? ((walker.vx - penguin.lastVx) * Math.cos(heading) +
          (walker.vy - penguin.lastVy) * Math.sin(heading)) /
        dt
      : 0;
  penguin.lastVx = walker.vx;
  penguin.lastVy = walker.vy;
  const rock =
    Math.sin(walker.phase * Math.PI * 2) * pace(walker, GAIT) * (1 - penguin.rig.slide.x);
  stepSwing(penguin.scarf, ax + rock * 500, seconds);
};

export const pokePenguin = (penguin: Penguin, at: Point) => {
  penguin.walker.still = Math.min(penguin.walker.still, 3);
  if (isOn(penguin, at)) {
    say(penguin.emotes, BRAY, true);
    begin(penguin, "display");
  } else if (say(penguin.emotes, STARTLED, penguin.random.chance(0.4))) {
    begin(penguin, "jump");
  }
};

export const penguin: Creature<Penguin> = {
  create: createPenguin,
  poke: pokePenguin,
  pose: penguinPose,
  step: stepPenguin,
};
