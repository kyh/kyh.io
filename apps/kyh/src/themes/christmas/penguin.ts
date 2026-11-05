// The penguin that follows a mouse about at Christmas, for `follower.tsx`:
// an Adélie penguin in a red scarf, drawn side on and facing right (flipped
// to face left). It waddles after the mouse (`../follower/walk.ts`), rocking
// from foot to foot on short steps, flippers held out for balance; left far
// behind, it flops onto its belly and toboggans after it, as penguins do on
// snow. Left be, it preens, looks about and stretches its flippers; left long
// enough, it tucks its head down and dozes standing. A click on it, or a
// petting, sets it braying with its head thrown back and flippers spread
// (the ecstatic display); a click elsewhere makes it jump. In its own pixels
// about its feet, +y down. Pure (state is stepped in place, for a frame's
// sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Part, Pose } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Gait, Point, Swing, Walker } from "../follower/walk";
import { point, round } from "../art";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import {
  approach,
  createWalker,
  degrees,
  footAt,
  isOnWalker,
  pace,
  stepSwing,
  stepWalker,
  widthOf,
} from "../follower/walk";

const GAIT: Gait = { accel: 1200, behind: 64, below: 34, stride: 16, top: 400 };

/** A moment's business: a preen, a look about, a stretch, the ecstatic display, a startled jump. */
type Act = "none" | "preen" | "look" | "stretch" | "display" | "jump";
const ACT_S: Record<Act, number> = {
  display: 1.6,
  jump: 0.5,
  look: 1.4,
  none: 0,
  preen: 1.8,
  stretch: 1.1,
};

export interface Penguin {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  /** 0 to 1: on its feet to tobogganing on its belly, and dozing. */
  slide: number;
  doze: number;
  petted: number;
  /** Its scarf's end, swinging as it's carried. */
  scarf: Swing;
  lastVx: number;
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

/** Where its feet are under it, near and far. */
const FEET = [2.5, -2.5] as const;
const IDLE: readonly Act[] = ["preen", "look", "look", "stretch"];

export const createPenguin = (at: Point): Penguin => {
  const seed = Math.round(at.x * 7919 + at.y * 17);
  return {
    act: "none",
    actFor: 0,
    doze: 0,
    emotes: createEmotes(seed),
    lastVx: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    scarf: { angle: 0, spin: 0 },
    slide: 0,
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

/** On its feet or its belly, dozing or not, and what it's up to. */
const stepActs = (penguin: Penguin, moving: boolean, idle: number, seconds: number) => {
  const { walker } = penguin;
  // It flops down past a run and gets up again once it's slowed, not at one speed both ways.
  const fast = walker.speed / GAIT.top;
  const sliding = fast > SLIDING || (penguin.slide > 0.5 && fast > STANDING);
  penguin.slide = approach(penguin.slide, sliding ? 1 : 0, sliding ? 7 : 4, seconds);
  const dozing = idle > DOZE_S && penguin.petted === 0;
  penguin.doze = approach(penguin.doze, dozing ? 1 : 0, dozing ? 1 : 6, seconds);
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
  } else if (penguin.slide > 0.8 && random.chance(seconds * 0.8)) {
    say(emotes, SLIDE);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

export const stepPenguin = (penguin: Penguin, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = penguin;
  // Petted (a mouse resting on it), it stays for it.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(penguin, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || penguin.act === "display");
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  penguin.petted = !moving && isOn(penguin, pointer) ? penguin.petted + seconds : 0;
  const dozing = stepActs(penguin, moving, idle, seconds);
  stepTalk(penguin, dozing, idle, seconds);
  const dt = Math.min(seconds, 0.05);
  const ax = dt > 0 ? ((walker.vx - penguin.lastVx) / dt) * walker.facing : 0;
  penguin.lastVx = walker.vx;
  // Each waddle tosses the scarf's end a little, as well as being carried.
  const rock = Math.sin(walker.phase * Math.PI * 2) * pace(walker, GAIT) * (1 - penguin.slide);
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

/** How far into an act it is, 0 to 1, eased in and out at either end. */
const amountOf = (penguin: Penguin, act: Act, edge = 5) => {
  if (penguin.act !== act) {
    return 0;
  }
  const t = Math.min(1, penguin.actFor / ACT_S[act]);
  return Math.min(1, t * edge, (1 - t) * edge);
};

/** Its body this frame: rocking foot to foot, bowed to preen, thrown back to bray, or flat on its belly. */
const bodyOf = (penguin: Penguin) => {
  const { slide, walker } = penguin;
  const walking = pace(walker, GAIT) * (1 - slide);
  const rock = Math.sin(walker.phase * Math.PI * 2) * 9 * walking;
  const preen = amountOf(penguin, "preen");
  const display = amountOf(penguin, "display", 4);
  const jump =
    penguin.act === "jump" ? Math.sin(Math.min(1, penguin.actFor / ACT_S.jump) * Math.PI) : 0;
  const tilt = rock + preen * 24 - display * 14 + slide * 78 + penguin.doze * 6;
  const lift = -jump * 10 - Math.abs(Math.sin(walker.phase * Math.PI * 2)) * 1.4 * walking;
  return { display, lift, preen, tilt };
};

export const penguinPose = (penguin: Penguin): Pose => {
  const { doze, slide, walker } = penguin;
  const { display, lift, preen, tilt } = bodyOf(penguin);
  const stretch = amountOf(penguin, "stretch");
  const look = amountOf(penguin, "look");
  // Flippers: held out a little for balance waddling, beating braying and stretching, back sliding.
  const walking = pace(walker, GAIT) * (1 - slide);
  const beat = Math.sin(penguin.actFor * 18);
  const flipper =
    walking * 18 +
    display * (55 + beat * 10) +
    stretch * (70 + beat * 6) -
    slide * 10 +
    (penguin.petted > 0.3 ? 20 + Math.sin(penguin.actFor * 20) * 15 : 0);
  const feet = FEET.map((x, index) => {
    const step = footAt(walker, GAIT, index / 2, 3);
    // Sliding, its feet trail behind it, pushing.
    const foot = { x: x + step.x * (1 - slide) - slide * 14, y: step.y * (1 - slide) - slide * 2 };
    return [`foot-${index}`, { transform: `translate(${point(foot.x, foot.y)})` }] as const;
  });
  const width = widthOf(walker);
  const parts = {
    beak: { transform: `rotate(${round(display * 25 * Math.abs(beat))} 9 -32)` },
    body: { transform: `translate(0 ${round(lift)}) rotate(${round(tilt)} 0 -10)` },
    eye: { opacity: doze > 0.6 ? 0 : 1 },
    eyelid: { opacity: doze > 0.6 ? 1 : 0 },
    flip: { transform: `scale(${round(width)} 1)` },
    flipper: { transform: `rotate(${round(flipper)} -2 -27)` },
    // Looking about, it turns its head away and back: its eye and beak slide round.
    head: { transform: `translate(${round(-look * 4)} ${round(doze * 3)})` },
    scarf: { transform: `rotate(${round(degrees(penguin.scarf.angle) + slide * -60)} -9 -25)` },
    ...Object.fromEntries(feet),
  } satisfies Record<string, Part>;
  return {
    at: { x: walker.x, y: walker.y },
    bubble: { x: 4 * width, y: -58 + lift + slide * 26 + preen * 4 },
    parts,
    say: penguin.emotes.line,
  };
};

export const penguin: Creature<Penguin> = {
  create: createPenguin,
  poke: pokePenguin,
  pose: penguinPose,
  step: stepPenguin,
};
