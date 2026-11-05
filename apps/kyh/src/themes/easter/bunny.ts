// The bunny that follows a mouse about at Easter, for `follower.tsx`: a
// white rabbit drawn side on and facing right (flipped to face left). It
// hops after the mouse (`../follower/walk.ts`), a hop a stride: crouched on
// the ground, then up, nose first, its long hind feet kicked out behind and
// its forepaws reaching to land. Left be, it sniffs about, its nose
// twitching, grooms its face with its paws, and sits up tall to look round;
// left long enough, it lays its ears back and dozes. A click on it, or a
// petting, sets it leaping and twisting in the air (a binky, a happy
// rabbit's jump); a click elsewhere makes it thump. In its own pixels about
// its feet, +y down. Pure (state is stepped in place, for a frame's sake).
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
  isOnWalker,
  pace,
  stepSwing,
  stepWalker,
  widthOf,
} from "../follower/walk";

const GAIT: Gait = { accel: 1600, behind: 58, below: 30, stride: 40, top: 320 };

type Act = "none" | "sniff" | "groom" | "stand" | "binky" | "thump";
const ACT_S: Record<Act, number> = {
  binky: 0.75,
  groom: 2.2,
  none: 0,
  sniff: 1.6,
  stand: 2.6,
  thump: 0.5,
};

export interface Bunny {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  doze: number;
  petted: number;
  /** Its ears swinging as it goes, and its nose's twitch (seconds of it). */
  ears: Swing;
  twitch: number;
  lastVx: number;
}

const BINKY = ["binky!", "♥", "wheee!"];
const THUMP = ["*thump*", "!"];
const CHATTER = ["*sniff sniff*", "Happy Easter!", "found any eggs?", "*nibble*"];
const PET = ["♥", "*purr*"];
const SLEEP = ["z z z"];

const DOZE_S = 30;
const MOVING = 25;
/** How high a hop goes. */
const HOP = 13;

export const createBunny = (at: Point): Bunny => {
  const seed = Math.round(at.x * 7919 + at.y * 13);
  return {
    act: "none",
    actFor: 0,
    doze: 0,
    ears: { angle: 0, spin: 0 },
    emotes: createEmotes(seed),
    lastVx: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    twitch: 0,
    walker: createWalker(at, GAIT),
  };
};

const begin = (bunny: Bunny, act: Act) => {
  bunny.act = act;
  bunny.actFor = 0;
  if (act === "binky" || act === "thump") {
    bunny.ears.spin += 9;
  }
};

const isOn = (bunny: Bunny, at: Point) => isOnWalker(bunny.walker, at, 22, 48);

const IDLE: readonly Act[] = ["sniff", "sniff", "groom", "stand"];

const stepActs = (bunny: Bunny, moving: boolean, idle: number, seconds: number) => {
  const dozing = idle > DOZE_S && bunny.petted === 0;
  bunny.doze = approach(bunny.doze, dozing ? 1 : 0, dozing ? 1 : 6, seconds);
  bunny.actFor += seconds;
  const kept = bunny.act === "binky" || bunny.act === "thump";
  const over = bunny.actFor > ACT_S[bunny.act] || (moving && !kept);
  if (bunny.act !== "none" && over) {
    bunny.act = "none";
  }
  if (bunny.act !== "none" || moving || dozing) {
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
      begin(bunny, "binky");
    }
  } else if (idle > 2 && random.chance(seconds * 0.12)) {
    say(emotes, CHATTER);
  }
};

export const stepBunny = (bunny: Bunny, pointer: Point, moved: Point, seconds: number) => {
  const { walker } = bunny;
  // Leaping, or petted (a mouse resting on it), it stays put.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(bunny, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || bunny.act === "binky");
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  bunny.petted = !moving && isOn(bunny, pointer) ? bunny.petted + seconds : 0;
  const dozing = stepActs(bunny, moving, idle, seconds);
  stepTalk(bunny, dozing, idle, seconds);
  const dt = Math.min(seconds, 0.05);
  const ax = dt > 0 ? ((walker.vx - bunny.lastVx) / dt) * walker.facing : 0;
  bunny.lastVx = walker.vx;
  // Each hop's landing tosses its ears.
  const landing = Math.sin(walker.phase * Math.PI * 2) * pace(walker, GAIT) * 900;
  stepSwing(bunny.ears, ax + landing, seconds);
  bunny.twitch += seconds * (bunny.act === "sniff" ? 3 : 1);
};

export const pokeBunny = (bunny: Bunny, at: Point) => {
  bunny.walker.still = Math.min(bunny.walker.still, 3);
  if (isOn(bunny, at)) {
    say(bunny.emotes, BINKY, true);
    begin(bunny, "binky");
  } else if (say(bunny.emotes, THUMP, bunny.random.chance(0.4))) {
    begin(bunny, "thump");
  }
};

/** How far into the air a hop has it, 0 on the ground to 1 at the top, and whether it's going up. */
const hopOf = (bunny: Bunny) => {
  const { walker } = bunny;
  const t = ((walker.phase % 1) + 1) % 1;
  const air = t > 0.12 && t < 0.88 ? Math.sin(((t - 0.12) / 0.76) * Math.PI) : 0;
  return { air: air * pace(walker, GAIT), rising: t < 0.5 };
};

/** Its body this frame: up off the ground, turned, sat up, crouched. */
const bodyOf = (bunny: Bunny) => {
  const { act, actFor, doze } = bunny;
  const t = Math.min(1, actFor / ACT_S[act]);
  const { air, rising } = hopOf(bunny);
  const binky = act === "binky" ? Math.sin(t * Math.PI) : 0;
  const stand = act === "stand" ? Math.min(1, t * 5, (1 - t) * 5) : 0;
  const lift = -air * HOP - binky * 26;
  // Nose up as it takes off, down as it lands; a binky twists it about in the air.
  const nose = air * (rising ? -14 : 12) + binky * Math.sin(t * Math.PI * 4) * 22;
  const tilt = nose - stand * 28 + doze * 4;
  return { air, binky, lift: lift + doze * 2, stand, tilt };
};

export const bunnyPose = (bunny: Bunny): Pose => {
  const { act, actFor, doze, walker } = bunny;
  const { air, lift, stand, tilt } = bodyOf(bunny);
  const t = Math.min(1, actFor / ACT_S[act]);
  const groom = act === "groom" ? Math.min(1, t * 5, (1 - t) * 5) : 0;
  const sniff = act === "sniff" ? Math.min(1, t * 5, (1 - t) * 5) : 0;
  const thump = act === "thump" ? Math.sin(t * Math.PI) : 0;
  // Ears: up and swinging, back flat dozing, pricked up sat tall.
  const ears = degrees(bunny.ears.angle) - 8 - doze * 60 + stand * 10;
  const width = widthOf(walker);
  const twitch = 1 + Math.abs(Math.sin(bunny.twitch * 18)) * 0.25 * (sniff + 0.3);
  const head = {
    x: 10 + sniff * 3 - groom * 1,
    y: -24 + sniff * 6 + groom * 3 + doze * 4,
  };
  const parts = {
    body: { transform: `translate(0 ${round(lift)}) rotate(${round(tilt)} -6 -2)` },
    "ear-0": { transform: `rotate(${round(ears * 0.8 - 8)} -1 -5)` },
    "ear-1": { transform: `rotate(${round(ears)} 0 -5)` },
    eye: { opacity: doze > 0.6 ? 0 : 1 },
    eyelid: { opacity: doze > 0.6 ? 1 : 0 },
    flip: { transform: `scale(${round(width)} 1)` },
    // Kicked out behind in the air; stamped down in a thump.
    foot: {
      transform: `translate(${round(-air * 7)} ${round(-thump * 4)}) rotate(${round(air * 34 - thump * 18)} -12 -1)`,
    },
    head: { transform: `translate(${point(head.x, head.y)}) rotate(${round(groom * 14)})` },
    nose: { transform: `translate(7.6 1.2) scale(${round(twitch)}) translate(-7.6 -1.2)` },
    // Reaching to land; up to its face to groom.
    paws: {
      transform: `translate(${point(air * 6 - groom * 3, -air * 3 - groom * 14 - stand * 6)})`,
    },
  } satisfies Record<string, Part>;
  return {
    at: { x: walker.x, y: walker.y },
    bubble: { x: 8 * width, y: -58 + lift },
    parts,
    say: bunny.emotes.line,
  };
};

export const bunny: Creature<Bunny> = {
  create: createBunny,
  poke: pokeBunny,
  pose: bunnyPose,
  step: stepBunny,
};
