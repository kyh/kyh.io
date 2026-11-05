// The leprechaun who follows a mouse about on St. Patrick's Day, for
// `follower.tsx`: drawn side on and facing right (flipped to face left), in
// a green coat and buckled hat, a red beard and buckled shoes. He walks
// after the mouse (`../follower/walk.ts`), arms swinging against his legs.
// Left be, he flips a gold coin and catches it, and soon dances a jig, a
// heel kicked out a beat, hopping, an arm up; left long enough, he tips his
// hat over his eyes and naps. A click on him and he doffs his hat; a click
// elsewhere, he's cross. A mouse resting on him is after his gold. In his
// own pixels about his feet, +y down. Pure (state is stepped in place, for
// a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Creature, Part, Pose } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Gait, Point, Walker } from "../follower/walk";
import { point, round } from "../art";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import {
  approach,
  createWalker,
  footAt,
  isOnWalker,
  limbOf,
  pace,
  stepWalker,
  widthOf,
} from "../follower/walk";

const GAIT: Gait = { accel: 1400, behind: 64, below: 36, stride: 30, top: 330 };

type Act = "none" | "coin" | "doff" | "cross";
const ACT_S: Record<Act, number> = { coin: 1.1, cross: 0.8, doff: 1.3, none: 0 };

export interface Leprechaun {
  walker: Walker;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  /** 0 to 1: dancing his jig, and napping; the jig's beats so far. */
  jig: number;
  nap: number;
  beat: number;
  petted: number;
}

const DOFF = ["Top o' the mornin'!", "Top o' the mornin' to ye!"];
const CROSS = ["Oi!", "Begorrah!"];
const CHATTER = ["Sláinte! ☘", "Ye'll not find me pot o' gold!", "Lucky you!", "Me gold!"];
const JIG = ["♪ diddly-dee ♪", "☘ ♪ ☘", "hup!"];
const PET = ["Hands off me gold!", "Paws off!"];
const SLEEP = ["z z z"];

const JIG_S = 4;
const NAP_S = 32;
const MOVING = 25;

const HIPS = [
  { x: 1.6, y: -19 },
  { x: -1.6, y: -19 },
] as const;
const THIGH = 9.6;
const SHIN = 10;
const SHOULDER: Point = { x: -0.6, y: -38 };
const ARM = 8.4;
const HEAD: Point = { x: 1, y: -47.5 };

export const createLeprechaun = (at: Point): Leprechaun => {
  const seed = Math.round(at.x * 7919 + at.y * 3);
  return {
    act: "none",
    actFor: 0,
    beat: 0,
    emotes: createEmotes(seed),
    jig: 0,
    nap: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    walker: createWalker(at, GAIT),
  };
};

const begin = (leprechaun: Leprechaun, act: Act) => {
  leprechaun.act = act;
  leprechaun.actFor = 0;
};

const isOn = (leprechaun: Leprechaun, at: Point) => isOnWalker(leprechaun.walker, at, 14, 66);

const stepActs = (leprechaun: Leprechaun, moving: boolean, idle: number, seconds: number) => {
  const napping = idle > NAP_S && leprechaun.petted === 0;
  const dancing = !moving && !napping && idle > JIG_S;
  leprechaun.nap = approach(leprechaun.nap, napping ? 1 : 0, napping ? 1.2 : 6, seconds);
  leprechaun.jig = approach(leprechaun.jig, dancing ? 1 : 0, 6, seconds);
  leprechaun.beat += seconds * 2.4 * leprechaun.jig;
  leprechaun.actFor += seconds;
  const over = leprechaun.actFor > ACT_S[leprechaun.act] || (moving && leprechaun.act === "coin");
  if (leprechaun.act !== "none" && over) {
    leprechaun.act = "none";
  }
  if (leprechaun.act !== "none" || moving || napping || dancing) {
    return { dancing, napping };
  }
  leprechaun.next -= seconds;
  if (idle > 0.8 && leprechaun.next <= 0) {
    begin(leprechaun, "coin");
    leprechaun.next = 2 + leprechaun.random.next() * 3;
  }
  return { dancing, napping };
};

const stepTalk = (
  leprechaun: Leprechaun,
  { dancing, napping }: { dancing: boolean; napping: boolean },
  idle: number,
  seconds: number,
) => {
  const { emotes, random } = leprechaun;
  stepEmotes(emotes, seconds);
  if (napping) {
    say(emotes, SLEEP);
  } else if (leprechaun.petted > PETTED_S) {
    // The moment a petting counts, it answers it, whatever it was saying.
    if (reached(leprechaun.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
    }
  } else if (dancing && random.chance(seconds * 0.4)) {
    say(emotes, JIG);
  } else if (idle > 1.5 && random.chance(seconds * 0.1)) {
    say(emotes, CHATTER);
  }
};

export const stepLeprechaun = (
  leprechaun: Leprechaun,
  pointer: Point,
  moved: Point,
  seconds: number,
) => {
  const { walker } = leprechaun;
  // Petted (a mouse resting on him), he stands for it.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(leprechaun, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting);
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  leprechaun.petted = !moving && isOn(leprechaun, pointer) ? leprechaun.petted + seconds : 0;
  const doing = stepActs(leprechaun, moving, idle, seconds);
  stepTalk(leprechaun, doing, idle, seconds);
};

export const pokeLeprechaun = (leprechaun: Leprechaun, at: Point) => {
  leprechaun.walker.still = Math.min(leprechaun.walker.still, 2);
  if (isOn(leprechaun, at)) {
    say(leprechaun.emotes, DOFF, true);
    begin(leprechaun, "doff");
  } else if (say(leprechaun.emotes, CROSS, leprechaun.random.chance(0.35))) {
    begin(leprechaun, "cross");
  }
};

/** A two-boned limb: its path, hip to knee to foot or shoulder to elbow to hand, and where its end gets to. */
const limb = (from: Point, to: Point, upper: number, lower: number, bend: 1 | -1) => {
  const { end, joint } = limbOf(from, to, upper, lower, bend);
  return {
    d: `M${point(from.x, from.y)}L${point(joint.x, joint.y)}L${point(end.x, end.y)}`,
    end,
  };
};

/** His feet: stepping as he walks; in the jig, one heel kicked out a beat while he hops on the other. */
const feetOf = (leprechaun: Leprechaun, hop: number) =>
  HIPS.map((hip, index) => {
    const step = footAt(leprechaun.walker, GAIT, index / 2, 5);
    const kicking = Math.floor(leprechaun.beat) % 2 === index;
    const kick = kicking ? Math.sin((leprechaun.beat % 1) * Math.PI) : 0;
    const jig = { x: kick * 7, y: -kick * 6 + hop };
    const { jig: amount } = leprechaun;
    return { x: hip.x + step.x + jig.x * amount, y: step.y + (jig.y - step.y) * amount };
  });

/** His hands: swinging against his legs as he walks; in the jig one on his hip and one up. */
const handsOf = (leprechaun: Leprechaun, lift: number) => {
  const { act, actFor, jig, walker } = leprechaun;
  const swing = Math.sin(walker.phase * Math.PI * 2) * 0.6 * pace(walker, GAIT);
  const t = Math.min(1, actFor / ACT_S[act]);
  return [1, -1].map((side, index) => {
    const angle = swing * side;
    const hang = {
      x: SHOULDER.x + Math.sin(angle) * 15.5,
      y: SHOULDER.y + lift + Math.cos(angle) * 15.5,
    };
    const up = Math.floor(leprechaun.beat) % 2 === index;
    const dance = up ? { x: 6, y: SHOULDER.y + lift - 13 } : { x: 3.4, y: SHOULDER.y + lift + 11 };
    // Doffing his hat, or flipping his coin, with his near hand.
    const raised = index === 0 && (act === "doff" || act === "coin");
    const reach = raised ? Math.min(1, t * 6, (1 - t) * 4) : 0;
    const to =
      act === "doff" ? { x: 5, y: SHOULDER.y + lift - 13 } : { x: 9, y: SHOULDER.y + lift + 3 };
    const at = {
      x: hang.x + (dance.x - hang.x) * jig + (to.x - hang.x) * reach,
      y: hang.y + (dance.y - hang.y) * jig + (to.y - hang.y) * reach,
    };
    return at;
  });
};

export const leprechaunPose = (leprechaun: Leprechaun): Pose => {
  const { act, actFor, jig, nap, walker } = leprechaun;
  const t = Math.min(1, actFor / ACT_S[act]);
  const hop = -Math.abs(Math.sin(leprechaun.beat * Math.PI)) * 4 * jig;
  const lift = -Math.abs(Math.sin(walker.phase * Math.PI * 2)) * 1.2 * pace(walker, GAIT) + hop;
  const feet = feetOf(leprechaun, hop);
  const hands = handsOf(leprechaun, lift);
  const doff = act === "doff" ? Math.min(1, t * 6, (1 - t) * 4) : 0;
  const cross = act === "cross" ? Math.sin(t * Math.PI) : 0;
  // The coin goes up off his thumb and comes down into his hand.
  const coin = act === "coin" ? Math.sin(t * Math.PI) : 0;
  const width = widthOf(walker);
  const legs = HIPS.flatMap((hip, index) => {
    const from = { x: hip.x, y: hip.y + lift };
    const { d, end } = limb(from, feet[index] ?? hip, THIGH, SHIN, 1);
    return [
      [`leg-${index}`, { d }],
      [`shoe-${index}`, { transform: `translate(${point(end.x, end.y)})` }],
    ] as const;
  });
  const reaches = hands.map((at) =>
    limb({ x: SHOULDER.x, y: SHOULDER.y + lift }, at, ARM, ARM, -1),
  );
  const arms = reaches.flatMap(({ d, end }, index) => [
    [`arm-${index}`, { d }] as const,
    [`hand-${index}`, { transform: `translate(${point(end.x, end.y)})` }] as const,
  ]);
  // The coin leaves from, and lands in, the hand where it's drawn: where the arm reaches.
  const hand = reaches[0]?.end ?? SHOULDER;
  const parts = {
    body: { transform: `translate(0 ${round(lift)})` },
    coin: {
      opacity: act === "coin" ? 1 : 0,
      transform: `translate(${point(hand.x, hand.y - coin * 26)}) scale(${round(Math.cos(actFor * 22))} 1)`,
    },
    eye: { opacity: nap > 0.6 ? 0 : 1 },
    eyelid: { opacity: nap > 0.6 ? 1 : 0 },
    flip: { transform: `scale(${round(width)} 1)` },
    // Doffed, tilted over his eyes napping, bounced off his head when he's cross.
    hat: {
      transform: `translate(${point(doff * 4, -doff * 9 - cross * 3)}) rotate(${round(-doff * 25 + nap * 16)} 0 -6)`,
    },
    head: {
      transform: `translate(${point(HEAD.x, HEAD.y + nap * 2)}) rotate(${round(nap * 12 - jig * Math.sin(leprechaun.beat * Math.PI) * 6)})`,
    },
    ...Object.fromEntries(legs),
    ...Object.fromEntries(arms),
  } satisfies Record<string, Part>;
  return {
    at: { x: walker.x, y: walker.y },
    bubble: { x: 2 * width, y: -74 + lift },
    parts,
    say: leprechaun.emotes.line,
  };
};

export const leprechaun: Creature<Leprechaun> = {
  create: createLeprechaun,
  poke: pokeLeprechaun,
  pose: leprechaunPose,
  step: stepLeprechaun,
};
