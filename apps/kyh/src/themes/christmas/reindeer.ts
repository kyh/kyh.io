// The reindeer that follows a mouse about at Christmas, for `follower.tsx`:
// drawn side on and facing right (flipped to face left), antlered, a bell on
// its collar. It trots after the mouse (`../follower/walk.ts`) on four legs,
// diagonal pairs together, the knees of its forelegs and the hocks of its
// hind legs bending as a deer's do, its head nodding with the stride; left
// far behind, it takes off and flies, legs tucked, as Santa's do. Left be,
// it grazes, looks about and flicks its ears; left long enough, it lies down
// and dozes. A click on it sets it prancing and its bell jingling; a click
// elsewhere throws its head up. A mouse resting on it is a petting, and it
// nuzzles it. In its own pixels about its feet, +y down. Pure (state is
// stepped in place, for a frame's sake).
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
  limbOf,
  pace,
  stepSwing,
  stepWalker,
  widthOf,
} from "../follower/walk";

const GAIT: Gait = { accel: 1500, behind: 80, below: 40, stride: 46, top: 440 };

/** A moment's business: a few bites of grass, a look about, a prance. */
type Act = "none" | "graze" | "look" | "prance" | "alert";
const ACT_S: Record<Act, number> = { alert: 1, graze: 2.4, look: 1.6, none: 0, prance: 0.9 };

export interface Reindeer {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  /** Seconds till it next grazes or looks about. */
  next: number;
  /** 0 to 1: on its feet to lying down, on the ground to flying. */
  lie: number;
  fly: number;
  petted: number;
  /** Its head about its body, its bell and its ear swinging. */
  head: Point;
  bell: Swing;
  ear: Swing;
  lastVx: number;
}

const JINGLE = ["jingle!", "♪ jingle jingle ♪", "jingle jangle!"];
const SNORT = ["!", "snort!"];
const CHATTER = ["Merry Christmas!", "snort", "❄", "*crunch crunch*", "Ho ho… no, that's his line"];
const PET = ["♥", "*nuzzle*"];
const FLY = ["Whee!", "Up, up and away!"];
const SLEEP = ["z z z"];

const LIE_S = 30;
const MOVING = 30;
/** Faster than this it's flying. */
const FLYING = 0.8;

const HEAD: Point = { x: 29, y: -63 };
const NECK: Point = { x: 15, y: -46 };
/** Its hips, near side first, foreleg then hind leg, and when in the trot each steps. */
const LEGS = [
  { bend: 1, hip: { x: 14, y: -33 }, offset: 0.5 },
  { bend: -1, hip: { x: -15, y: -33 }, offset: 0 },
  { bend: 1, hip: { x: 9, y: -33 }, offset: 0 },
  { bend: -1, hip: { x: -20, y: -33 }, offset: 0.5 },
] as const;
const UPPER = 15;
const LOWER = 18;

export const createReindeer = (at: Point): Reindeer => {
  const seed = Math.round(at.x * 7919 + at.y * 17);
  return {
    act: "none",
    actFor: 0,
    bell: { angle: 0, spin: 0 },
    ear: { angle: 0, spin: 0 },
    emotes: createEmotes(seed),
    fly: 0,
    head: { ...HEAD },
    lastVx: 0,
    lie: 0,
    next: 2,
    petted: 0,
    random: createRandom(seed + 1),
    walker: createWalker(at, GAIT),
  };
};

const begin = (reindeer: Reindeer, act: Act) => {
  reindeer.act = act;
  reindeer.actFor = 0;
  if (act === "prance" || act === "alert") {
    reindeer.bell.spin += 10;
    reindeer.ear.spin -= 8;
  }
};

const isOn = (reindeer: Reindeer, at: Point) => isOnWalker(reindeer.walker, at, 34, 90);

/** Where its head goes this frame, about its body, for what it's at. */
const headGoal = (reindeer: Reindeer): Point => {
  const { act, actFor, lie, petted, walker } = reindeer;
  const t = actFor / ACT_S[act];
  // A nod a step as it trots; lying down, its head comes down with it.
  let { x } = HEAD;
  let y = HEAD.y + Math.sin(walker.phase * Math.PI * 4) * 2 * pace(walker, GAIT) + lie * 8;
  if (act === "graze") {
    // Down to the grass, a few bites, and up.
    const down = Math.min(1, t * 6, (1 - t) * 6);
    x += (36 - x) * down;
    y += (-6 + Math.sin(actFor * 14) * 1.2 - y) * down;
  } else if (act === "look") {
    x -= Math.sin(t * Math.PI) * 6;
    y -= Math.sin(t * Math.PI) * 4;
  } else if (act === "alert") {
    y -= 8 * Math.min(1, t * 8, (1 - t) * 3);
  }
  // Petted, it nuzzles the mouse: head lowered toward it.
  if (petted > 0.3) {
    x += 3;
    y += 10;
  }
  return { x, y };
};

/** On its feet, lying down or flying, and what it's up to. */
const stepActs = (reindeer: Reindeer, moving: boolean, idle: number, seconds: number) => {
  const { walker } = reindeer;
  const lying = idle > LIE_S && reindeer.petted === 0;
  reindeer.lie = approach(reindeer.lie, lying ? 1 : 0, lying ? 1 : 5, seconds);
  const flying = walker.speed > GAIT.top * FLYING;
  reindeer.fly = approach(reindeer.fly, flying ? 1 : 0, flying ? 4 : 2, seconds);
  reindeer.actFor += seconds;
  const over = reindeer.actFor > ACT_S[reindeer.act] || (moving && reindeer.act === "graze");
  if (reindeer.act !== "none" && over) {
    reindeer.act = "none";
  }
  if (reindeer.act !== "none" || moving || lying) {
    return lying;
  }
  reindeer.next -= seconds;
  if (idle > 1 && reindeer.petted === 0 && reindeer.next <= 0) {
    begin(reindeer, reindeer.random.chance(0.6) ? "graze" : "look");
    reindeer.next = 1.5 + reindeer.random.next() * 3;
  }
  return lying;
};

const stepTalk = (reindeer: Reindeer, lying: boolean, idle: number, seconds: number) => {
  const { emotes, random } = reindeer;
  stepEmotes(emotes, seconds);
  if (lying) {
    say(emotes, SLEEP);
  } else if (reindeer.petted > 0.5) {
    say(emotes, PET, emotes.line === null && reindeer.petted < 0.6);
  } else if (reindeer.fly > 0.5 && random.chance(seconds * 0.8)) {
    say(emotes, FLY);
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

export const stepReindeer = (reindeer: Reindeer, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = reindeer;
  const near = Math.hypot(pointer.x - walker.x, pointer.y - walker.y) < 200;
  // Grazing, or petted (a mouse resting on it), it stands.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(reindeer, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || (reindeer.act === "graze" && near));
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  reindeer.petted = !moving && isOn(reindeer, pointer) ? reindeer.petted + seconds : 0;
  const lying = stepActs(reindeer, moving, idle, seconds);
  stepTalk(reindeer, lying, idle, seconds);
  const goal = headGoal(reindeer);
  reindeer.head = {
    x: approach(reindeer.head.x, goal.x, 12, seconds),
    y: approach(reindeer.head.y, goal.y, 12, seconds),
  };
  const dt = Math.min(seconds, 0.05);
  const ax = dt > 0 ? ((walker.vx - reindeer.lastVx) / dt) * walker.facing : 0;
  reindeer.lastVx = walker.vx;
  stepSwing(reindeer.bell, ax, seconds);
  stepSwing(reindeer.ear, ax * 0.5, seconds);
  // Now and then an ear flicks at nothing.
  if (reindeer.random.chance(seconds * 0.4)) {
    reindeer.ear.spin += reindeer.random.range(-6, 6);
  }
};

export const pokeReindeer = (reindeer: Reindeer, at: Point) => {
  reindeer.walker.still = Math.min(reindeer.walker.still, 3);
  if (isOn(reindeer, at)) {
    say(reindeer.emotes, JINGLE, true);
    begin(reindeer, "prance");
  } else if (say(reindeer.emotes, SNORT, reindeer.random.chance(0.4))) {
    begin(reindeer, "alert");
  }
};

/** A leg's path, hip to joint to hoof, and its hoof. */
const legPath = (hip: Point, foot: Point, bend: 1 | -1) => {
  const { end, joint } = limbOf(hip, foot, UPPER, LOWER, bend);
  return `M${point(hip.x, hip.y)}L${point(joint.x, joint.y)}L${point(end.x, end.y)}`;
};

/** Where each foot is: in its trot, folded under it lying down, tucked up flying. */
const feetOf = (reindeer: Reindeer, rise: number) =>
  LEGS.map(({ bend, hip, offset }, index) => {
    const step = footAt(reindeer.walker, GAIT, offset, 9);
    const at = { x: hip.x, y: hip.y + rise };
    const ground = { x: hip.x + step.x, y: step.y };
    const tucked = { x: hip.x - bend * 8, y: at.y + 18 };
    const folded = { x: hip.x + bend * 10, y: 0 };
    const tuck = Math.max(reindeer.fly, reindeer.lie);
    const to = reindeer.fly >= reindeer.lie ? tucked : folded;
    const foot = { x: ground.x + (to.x - ground.x) * tuck, y: ground.y + (to.y - ground.y) * tuck };
    return [`leg-${index}`, { d: legPath(at, foot, bend) }] as const;
  });

export const reindeerPose = (reindeer: Reindeer): Pose => {
  const { act, actFor, fly, head, lie, walker } = reindeer;
  const amount = pace(walker, GAIT);
  // The trot's spring, a prance's leap, flying's lift; lying, its body sinks to the ground.
  const prance = act === "prance" ? Math.sin(Math.min(1, actFor / ACT_S.prance) * Math.PI) : 0;
  const rise =
    -Math.abs(Math.sin(walker.phase * Math.PI * 2)) * 2.5 * amount * (1 - fly) -
    prance * 16 -
    fly * (22 + Math.sin(walker.phase * Math.PI * 2) * 3) +
    lie * 17;
  const tilt = fly * -6 + prance * -10;
  const width = widthOf(walker);
  const bend = point(NECK.x + (head.x - NECK.x) * 0.5 + 4, NECK.y + (head.y - NECK.y) * 0.4);
  const parts = {
    bell: { transform: `rotate(${round(degrees(reindeer.bell.angle))} 19 -40)` },
    body: { transform: `translate(0 ${round(rise)}) rotate(${round(tilt)} 0 -40)` },
    ear: { transform: `rotate(${round(degrees(reindeer.ear.angle) - 10)} -1 -4)` },
    eye: { opacity: lie > 0.6 ? 0 : 1 },
    eyelid: { opacity: lie > 0.6 ? 1 : 0 },
    flip: { transform: `scale(${round(width)} 1)` },
    head: { transform: `translate(${point(head.x, head.y)})` },
    neck: { d: `M${point(NECK.x, NECK.y)}Q${bend} ${point(head.x - 2, head.y + 2)}` },
    ...Object.fromEntries(feetOf(reindeer, rise)),
  } satisfies Record<string, Part>;
  return {
    at: { x: walker.x, y: walker.y },
    bubble: { x: head.x * width, y: head.y - 34 + rise },
    parts,
    say: reindeer.emotes.line,
  };
};

export const reindeer: Creature<Reindeer> = {
  create: createReindeer,
  poke: pokeReindeer,
  pose: reindeerPose,
  step: stepReindeer,
};
