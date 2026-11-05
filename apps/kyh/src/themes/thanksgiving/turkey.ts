// The turkey that follows a mouse about at Thanksgiving, for `follower.tsx`:
// a wild tom, built in the round (`turkey-pose.ts` draws it) and turning to
// face its way. It walks after the mouse (`../follower/walk.ts`) on bird's
// legs, the hock bending back, its head held still and thrust forward a step
// at a time as a walking bird's is, its snood and wattle swinging as it goes.
// Left be, it pecks about, then puffs up and fans its tail to strut, gobbling
// now and then; left long enough, it tucks its head in and sleeps. A click on
// it sets it gobbling; a click elsewhere makes it shock-gobble or call an
// alarm putt, as a tom does at a sudden noise. A mouse resting on it is a
// petting. Every movement eases on a spring (`../follower/solid.ts`), so it
// never snaps. Pure (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Swing, Walker } from "../follower/walk";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { faceGoal, smooth, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker, pace, stepSwing, stepWalker } from "../follower/walk";
import { SIZE, turkeyPose } from "./turkey-pose";

/** Its walk, on the screen: its stride and where it keeps to by the pointer shrunk with it. */
const GAIT: Gait = {
  accel: 1300,
  behind: 70 * SIZE,
  below: 42 * SIZE,
  stride: 34 * SIZE,
  top: 360,
};

/** What it's busy with a moment: a few pecks at the ground, a gobble, an alarm's head up. */
type Act = "none" | "peck" | "gobble" | "alert";
const ACT_S: Record<Act, number> = { alert: 1.1, gobble: 1.4, none: 0, peck: 0.9 };

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way it faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** 0 to 1: tail folded to fanned (and chest puffed), and dozing. */
  fan: Spring;
  doze: Spring;
  /** Its head, forward and up from its feet (pixels). */
  headX: Spring;
  headY: Spring;
  /** Its body bowed forward (radians, + bowed), to peck. */
  bow: Spring;
}

export interface Turkey {
  walker: Walker;
  gait: Gait;
  emotes: Emotes;
  random: Random;
  act: Act;
  /** Seconds into the act. */
  actFor: number;
  /** Seconds till it next pecks or, strutting, gobbles. */
  nextPeck: number;
  nextGobble: number;
  /** Seconds the mouse has rested on it. */
  petted: number;
  rig: Rig;
  /** Its wattle and snood, swinging as it's carried. */
  wattle: Swing;
  snood: Swing;
  /** How fast it was going a step ago, to feel it speed up. */
  lastVx: number;
  lastVy: number;
  lastHeadV: number;
  /** A gobble's tremble on its head (pixels up), on top of its glide. */
  tremble: number;
  /** Seconds it's been about, for its strut's slow pivot. */
  time: number;
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

/** Where its head sits, forward and up from its feet. */
const HEAD: Point = { x: 20, y: 62 };

export const createTurkey = (at: Point): Turkey => {
  const seed = Math.round(at.x * 7919 + at.y * 31);
  return {
    act: "none",
    actFor: 0,
    emotes: createEmotes(seed),
    gait: GAIT,
    lastHeadV: 0,
    lastVx: 0,
    lastVy: 0,
    nextGobble: 2,
    nextPeck: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rig: {
      bow: springAt(0),
      doze: springAt(0),
      fan: springAt(0),
      headX: springAt(HEAD.x),
      headY: springAt(HEAD.y),
      // A three-quarter view, toward the camera, to begin with.
      heading: springAt(Math.PI / 4),
    },
    snood: { angle: 0, spin: 0 },
    time: 0,
    tremble: 0,
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
const isOn = (turkey: Turkey, at: Point) => isOnWalker(turkey.walker, at, 28 * SIZE, 80 * SIZE);

/** How far into an act it is, eased in and out: 0 at either end to 1 in its middle. */
const envelope = (turkey: Turkey, act: Act, edge = 4) => {
  if (turkey.act !== act) {
    return 0;
  }
  const t = turkey.actFor / ACT_S[act];
  return smooth(Math.min(t, 1 - t) * edge);
};

/** Where its head goes this frame, forward and up from its feet, for what it's at. */
const headGoal = (turkey: Turkey): Point => {
  const { act, actFor, rig, walker } = turkey;
  const fan = rig.fan.x;
  const doze = rig.doze.x;
  // Strutting, it draws its head back onto its puffed chest; dozing, it tucks it in.
  let x = HEAD.x + (14 - HEAD.x) * fan + (-1 - HEAD.x) * doze;
  let y = HEAD.y + (59 - HEAD.y) * fan + (50 - HEAD.y) * doze;
  // Walking, it holds its head still as its body passes under, then thrusts it forward: every step.
  const step = (walker.phase * 2) % 1;
  const bob = step < 0.75 ? 3 - (step / 0.75) * 6 : -3 + ((step - 0.75) / 0.25) * 6;
  x += bob * pace(walker, GAIT);
  if (act === "peck") {
    const down = Math.abs(Math.sin((actFor / ACT_S.peck) * Math.PI * 2)) ** 0.7;
    x += (31 - x) * down;
    y += (6 - y) * down;
  } else if (act === "gobble") {
    const out = envelope(turkey, "gobble");
    x += 6 * out;
    y += 5 * out;
  } else if (act === "alert") {
    y += 10 * envelope(turkey, "alert", 6);
  }
  return { x, y };
};

/** Its tail fanning or folding, its eyes shutting or opening, after what it's at. */
const settle = (turkey: Turkey, strutting: boolean, sleeping: boolean, seconds: number) => {
  stepSpring(turkey.rig.fan, strutting ? 1 : 0, strutting ? 3.5 : 6, seconds);
  stepSpring(turkey.rig.doze, sleeping ? 1 : 0, sleeping ? 1.5 : 8, seconds);
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
  } else if (turkey.petted > PETTED_S) {
    // The moment a petting counts, it answers it, whatever it was saying.
    if (reached(turkey.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
    }
  } else if (walker.speed > GAIT.top * 0.85 && random.chance(seconds * 0.6)) {
    say(emotes, HURRY);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

/** Its head after where it's going, quick; its wattle and snood swinging as it's carried. */
const stepHead = (turkey: Turkey, pointer: Point, seconds: number) => {
  const { rig, walker } = turkey;
  // Strutting, it shows off its fan: turned to the camera, pivoting slowly side to side as a tom does.
  const display = Math.PI / 2 + 0.5 * Math.sin(turkey.time * 0.7);
  const facing = rig.fan.x > 0.5 ? display : faceGoal(walker, pointer, rig.heading.x, MOVING);
  stepAngle(rig.heading, facing, rig.fan.x > 0.5 ? 3 : 8, seconds);
  const goal = headGoal(turkey);
  // A peck is quick, down and up; otherwise its head glides.
  const rate = turkey.act === "peck" ? 34 : 20;
  stepSpring(rig.headX, goal.x, rate, seconds);
  stepSpring(rig.headY, goal.y, rate, seconds);
  stepSpring(rig.bow, turkey.act === "peck" ? 0.32 : 0, 14, seconds);
  const dt = Math.min(seconds, 0.05);
  if (dt <= 0) {
    return;
  }
  // The wattle lags the head, carried forward along its heading with the body.
  const heading = rig.heading.x;
  const along =
    ((walker.vx - turkey.lastVx) * Math.cos(heading) +
      (walker.vy - turkey.lastVy) * Math.sin(heading)) /
    dt;
  const ax = (rig.headX.v - turkey.lastHeadV) / dt + along;
  turkey.lastHeadV = rig.headX.v;
  turkey.lastVx = walker.vx;
  turkey.lastVy = walker.vy;
  stepSwing(turkey.wattle, ax, seconds);
  stepSwing(turkey.snood, ax * 0.7, seconds);
  turkey.tremble =
    turkey.act === "gobble" ? Math.sin(turkey.actFor * 46) * 1.4 * envelope(turkey, "gobble") : 0;
};

export const stepTurkey = (turkey: Turkey, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = turkey;
  turkey.time += seconds;
  // Pecking, it stands; left far behind, it gives up the ground and goes.
  const near = Math.hypot(pointer.x - walker.x, pointer.y - walker.y) < 200;
  // Pecking, or petted (a mouse resting on it), it stands.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(turkey, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || (turkey.act === "peck" && near));
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  // Petted while it stands, it puffs up for the mouse.
  turkey.petted = !moving && isOn(turkey, pointer) ? turkey.petted + seconds : 0;
  const sleeping = stepActs(turkey, moving, idle, seconds);
  stepTalk(turkey, sleeping, idle, seconds);
  stepHead(turkey, pointer, seconds);
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

export const turkey: Creature<Turkey> = {
  create: createTurkey,
  poke: pokeTurkey,
  pose: turkeyPose,
  step: stepTurkey,
};
