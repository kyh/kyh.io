// The turkey that follows a mouse about at Thanksgiving, for `follower.tsx`:
// a wild tom, drawn side on and facing right (flipped to face left). It walks
// after the mouse (`../follower/walk.ts`) on bird's legs, the hock bending
// back, its head held still and thrust forward a step at a time as a
// walking bird's is, its snood and wattle swinging as it goes. Left be, it
// pecks about, then puffs up and fans its tail to strut, gobbling now and
// then; left long enough, it tucks its head in and sleeps. A click on it
// sets it gobbling; a click elsewhere makes it shock-gobble or call an alarm
// putt, as a tom does at a sudden noise. A mouse resting on it is a petting.
// In its own pixels about its feet, +y down. Pure (state is stepped in
// place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Part, Pose } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Gait, Point, Swing, Walker } from "../follower/walk";
import { point, round } from "../art";
import { createEmotes, say, stepEmotes } from "../follower/emote";
import {
  approach,
  createWalker,
  degrees,
  footAt,
  isOnWalker,
  jointOf,
  pace,
  stepSwing,
  stepWalker,
  widthOf,
} from "../follower/walk";

const GAIT: Gait = { accel: 1300, behind: 70, below: 42, stride: 34, top: 360 };

/** What it's busy with a moment: a few pecks at the ground, a gobble, an alarm's head up. */
type Act = "none" | "peck" | "gobble" | "alert";
const ACT_S: Record<Act, number> = { alert: 1.1, gobble: 1.4, none: 0, peck: 0.9 };

export interface Turkey {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  /** Seconds into the act. */
  actFor: number;
  /** Seconds till it next pecks or, strutting, gobbles. */
  nextPeck: number;
  nextGobble: number;
  /** 0 to 1: tail folded to fanned, and dozing. */
  fan: number;
  doze: number;
  /** Seconds the mouse has rested on it. */
  petted: number;
  /** Its head about its body, and how fast it's going, for the wattle's swing. */
  head: Point;
  headV: Point;
  wattle: Swing;
  snood: Swing;
  /** How fast it was going a step ago, to feel it speed up. */
  lastVx: number;
}

const GOBBLE = ["Gobble gobble!", "GOBBLE GOBBLE GOBBLE!", "gobble-obble-obble!"];
const PUTT = ["putt!", "putt putt!"];
const CHATTER = ["purr…", "yelp yelp", "cluck", "Happy Thanksgiving!", "Eat more pie!"];
const PET = ["♥", "purr ♥"];
const HURRY = ["putt!", "wait up!"];
const SLEEP = ["z z z"];

/** Seconds of a still mouse before it struts, and before it dozes off. */
const STRUT_S = 5;
const SLEEP_S = 32;
/** Faster than this it's walking, not standing. */
const MOVING = 30;

/** Where its head sits on its body, its neck's root, and its hips. */
const HEAD: Point = { x: 21, y: -67 };
const NECK: Point = { x: 12, y: -50 };
const HIPS = [
  { x: 3, y: -27 },
  { x: -3, y: -27 },
] as const;
const THIGH = 15;
const SHANK = 16;
/** The tail's root, and its feathers' angles folded and fanned (degrees, clockwise from +x). */
export const TAIL: Point = { x: -17, y: -44 };
export const FEATHERS = 9;
const FOLDED = [186, 196] as const;
const FANNED = [196, 292] as const;

export const createTurkey = (at: Point): Turkey => {
  const seed = Math.round(at.x * 7919 + at.y * 31);
  return {
    act: "none",
    actFor: 0,
    doze: 0,
    emotes: createEmotes(seed),
    fan: 0,
    head: { ...HEAD },
    headV: { x: 0, y: 0 },
    lastVx: 0,
    nextGobble: 2,
    nextPeck: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    snood: { angle: 0, spin: 0 },
    walker: createWalker(at, GAIT),
    wattle: { angle: 0, spin: 0 },
  };
};

const begin = (turkey: Turkey, act: Act) => {
  turkey.act = act;
  turkey.actFor = 0;
  if (act === "gobble") {
    // The gobble shakes its wattle and snood about.
    turkey.wattle.spin += 9;
    turkey.snood.spin -= 7;
  }
};

const gobble = (turkey: Turkey, now: boolean) => {
  if (say(turkey.emotes, GOBBLE, now)) {
    begin(turkey, "gobble");
  }
};

/** Whether a point on the screen is on it: its body and its head, not the air round its tail. */
const isOn = (turkey: Turkey, at: Point) => isOnWalker(turkey.walker, at, 28, 80);

/** Where its head goes this frame, about its body, for what it's at. */
const headGoal = (turkey: Turkey): Point => {
  const { act, actFor, doze, fan, walker } = turkey;
  // Strutting, it draws its head back onto its puffed chest; dozing, it tucks it in.
  let x = HEAD.x + (14 - HEAD.x) * fan + (-1 - HEAD.x) * doze;
  let y = HEAD.y + (-63 - HEAD.y) * fan + (-56 - HEAD.y) * doze;
  // Walking, it holds its head still as its body passes under, then thrusts it forward: every step.
  const step = (walker.phase * 2) % 1;
  const bob = step < 0.75 ? 3 - (step / 0.75) * 6 : -3 + ((step - 0.75) / 0.25) * 6;
  x += bob * pace(walker, GAIT);
  const t = actFor / ACT_S[act];
  if (act === "peck") {
    const down = Math.abs(Math.sin(t * Math.PI * 2)) ** 0.7;
    x += (31 - x) * down;
    y += (-6 - y) * down;
  } else if (act === "gobble") {
    const out = Math.sin(Math.min(1, t) * Math.PI);
    x += 6 * out;
    y += (-5 + Math.sin(actFor * 46) * 1.6) * out;
  } else if (act === "alert") {
    const up = Math.min(1, actFor / 0.15) * Math.min(1, (1 - t) / 0.3);
    x += 2 * up;
    y -= 10 * up;
  }
  return { x, y };
};

/** Its tail fanned or folded, its eyes shut or open, after what it's at. */
const settle = (turkey: Turkey, strutting: boolean, sleeping: boolean, seconds: number) => {
  turkey.fan = approach(turkey.fan, strutting ? 1 : 0, strutting ? 2.5 : 5, seconds);
  turkey.doze = approach(turkey.doze, sleeping ? 1 : 0, sleeping ? 1.2 : 6, seconds);
};

/** What it's up to, left be: pecking about, then strutting and gobbling, then dozing. */
const stepActs = (turkey: Turkey, moving: boolean, idle: number, seconds: number) => {
  const sleeping = idle > SLEEP_S && turkey.petted === 0;
  const strutting = !moving && !sleeping && (idle > STRUT_S || turkey.petted > 0.4);
  settle(turkey, strutting, sleeping, seconds);
  turkey.actFor += seconds;
  const over = turkey.actFor > ACT_S[turkey.act] || (moving && turkey.act === "peck");
  if (turkey.act !== "none" && over) {
    turkey.act = "none";
  }
  if (turkey.act !== "none" || moving || sleeping) {
    return sleeping;
  }
  turkey.nextPeck -= seconds;
  turkey.nextGobble -= seconds;
  if (!strutting && idle > 0.8 && turkey.nextPeck <= 0) {
    begin(turkey, "peck");
    turkey.nextPeck = 1.6 + turkey.random.next() * 3;
  } else if (strutting && turkey.nextGobble <= 0) {
    gobble(turkey, false);
    turkey.nextGobble = 4 + turkey.random.next() * 5;
  }
  return sleeping;
};

/** What it says unprompted: snores asleep, purrs petted, putts left behind, chatters idle. */
const stepTalk = (turkey: Turkey, sleeping: boolean, idle: number, seconds: number) => {
  const { emotes, random, walker } = turkey;
  stepEmotes(emotes, seconds);
  if (sleeping) {
    say(emotes, SLEEP);
  } else if (turkey.petted > 0.5) {
    say(emotes, PET, emotes.line === null && turkey.petted < 0.6);
  } else if (walker.speed > GAIT.top * 0.85 && random.chance(seconds * 0.6)) {
    say(emotes, HURRY);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

/** Its head after where it's going, quick; its wattle and snood swinging as it's carried. */
const stepHead = (turkey: Turkey, seconds: number) => {
  const { walker } = turkey;
  const goal = headGoal(turkey);
  const dt = Math.min(seconds, 0.05);
  if (dt <= 0) {
    return;
  }
  const was = turkey.head;
  turkey.head = {
    x: approach(was.x, goal.x, 22, seconds),
    y: approach(was.y, goal.y, 22, seconds),
  };
  const v = { x: (turkey.head.x - was.x) / dt, y: (turkey.head.y - was.y) / dt };
  const carried = ((walker.vx - turkey.lastVx) / dt) * walker.facing;
  const ax = (v.x - turkey.headV.x) / dt + carried;
  turkey.headV = v;
  turkey.lastVx = walker.vx;
  stepSwing(turkey.wattle, ax, seconds);
  stepSwing(turkey.snood, ax * 0.7, seconds);
};

export const stepTurkey = (turkey: Turkey, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = turkey;
  // Pecking, it stands; left far behind, it gives up the ground and goes.
  const near = Math.hypot(pointer.x - walker.x, pointer.y - walker.y) < 200;
  stepWalker(walker, GAIT, pointer, moved, seconds, turkey.act === "peck" && near);
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  // Petted while it stands, it puffs up for the mouse.
  turkey.petted = !moving && isOn(turkey, pointer) ? turkey.petted + seconds : 0;
  const sleeping = stepActs(turkey, moving, idle, seconds);
  stepTalk(turkey, sleeping, idle, seconds);
  stepHead(turkey, seconds);
};

export const pokeTurkey = (turkey: Turkey, at: Point) => {
  // Awake at once, whatever it was at.
  turkey.walker.still = Math.min(turkey.walker.still, STRUT_S - 1);
  if (isOn(turkey, at)) {
    gobble(turkey, true);
  } else if (turkey.random.chance(0.45)) {
    gobble(turkey, true);
  } else if (say(turkey.emotes, PUTT, turkey.act !== "gobble")) {
    begin(turkey, "alert");
  }
};

const leg = (hip: Point, foot: Point) => {
  const hock = jointOf(hip, foot, THIGH, SHANK, -1);
  // Three toes forward, curled as the foot's lifted, and one back.
  const curl = Math.min(1, -foot.y / 6);
  const toes = [
    [6.5, 0.4],
    [5, 1.6],
    [4, -0.6],
  ]
    .map(
      ([x = 0, y = 0]) => `M${point(foot.x, foot.y)}l${point(x * (1 - curl * 0.4), y + curl * 3)}`,
    )
    .join("");
  return `M${point(hip.x, hip.y)}L${point(hock.x, hock.y)}L${point(foot.x, foot.y)}${toes}M${point(foot.x, foot.y)}l-2.6 0.6`;
};

export const turkeyPose = (turkey: Turkey): Pose => {
  const { walker, fan, doze } = turkey;
  const amount = pace(walker, GAIT);
  // The body rides up as a leg straightens under it; strutting, it puffs up; dozing, it settles.
  const rise = -Math.abs(Math.sin(walker.phase * Math.PI * 2)) * 1.6 * amount;
  const sit = doze * 7;
  const puff = 1 + fan * 0.07;
  const lean =
    fan * -7 + (turkey.act === "peck" ? 9 : 0) * Math.sin((turkey.actFor / ACT_S.peck) * Math.PI);
  const width = widthOf(walker);

  const legs = HIPS.map((hip, index) => {
    const step = footAt(walker, GAIT, index / 2, 7);
    // Dozing, it squats on its folded legs.
    const at = { x: hip.x, y: hip.y + rise + sit };
    return [`leg-${index}`, { d: leg(at, { x: hip.x + step.x, y: step.y }) }] as const;
  });
  const feathers = Array.from({ length: FEATHERS }, (_, index) => {
    const t = index / (FEATHERS - 1);
    const folded = FOLDED[0] + (FOLDED[1] - FOLDED[0]) * t;
    const fanned = FANNED[0] + (FANNED[1] - FANNED[0]) * t;
    const angle = folded + (fanned - folded) * fan;
    // Fanned, the middle feathers stand tallest.
    const length = 0.78 + fan * (0.16 + 0.12 * Math.sin(t * Math.PI));
    const transform = `translate(${point(TAIL.x, TAIL.y)}) rotate(${round(angle)}) scale(${round(length)})`;
    return [`feather-${index}`, { transform }] as const;
  });
  const { head, snood, wattle } = turkey;
  const bend = point(NECK.x + (head.x - NECK.x) * 0.15 + 4, NECK.y + (head.y - NECK.y) * 0.65);
  const parts = {
    body: { transform: `translate(0 ${round(rise + sit)}) rotate(${round(lean)} 0 -30)` },
    eye: { opacity: doze > 0.5 ? 0 : 1 },
    eyelid: { opacity: doze > 0.5 ? 1 : 0 },
    flip: { transform: `scale(${point(width * puff, puff)})` },
    head: { transform: `translate(${point(head.x, head.y)})` },
    neck: { d: `M${point(NECK.x, NECK.y)}Q${bend} ${point(head.x, head.y + 3)}` },
    snood: { transform: `rotate(${round(degrees(snood.angle))} 2 -3)` },
    wattle: { transform: `rotate(${round(degrees(wattle.angle))} 1 4)` },
    wing: { transform: `translate(0 ${round(fan * 4)}) rotate(${round(fan * 7)} 4 -42)` },
    ...Object.fromEntries(legs),
    ...Object.fromEntries(feathers),
  } satisfies Record<string, Part>;
  return {
    at: { x: walker.x, y: walker.y },
    bubble: { x: turkey.head.x * width * puff, y: -94 * puff + sit },
    parts,
    say: turkey.emotes.line,
  };
};

export const turkey: Creature<Turkey> = {
  create: createTurkey,
  poke: pokeTurkey,
  pose: turkeyPose,
  step: stepTurkey,
};
