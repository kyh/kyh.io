// The leprechaun who follows a mouse about on St. Patrick's Day, for
// `follower.tsx`: a little man in a green coat and buckled hat, a red beard
// and buckled shoes, built in the round (`leprechaun-pose.ts` draws him) and
// turning to face his way. He walks after the mouse (`../follower/walk.ts`),
// heel to toe, hips and shoulders twisting against each other, arms swinging
// against his legs; he leans into speeding up, rocks back to stop and
// settles. Left be, he flips a gold coin off his thumb and catches it, and
// soon dances a jig, hopping, a heel kicked out a beat, an arm up and a hand
// on his hip, spinning now and then; left long enough, his hat tips over his
// eyes and he naps standing. A click on him and he doffs his hat with a bow;
// a click elsewhere, he folds his arms and stamps. A mouse resting on him is
// after his gold: he hides his hands behind his back. His loose bits have
// weight (`leprechaun-acts.ts` says what each act does when): his body's
// lean, his hands and his hat are springs that overshoot and settle, and his
// coat's tails and his beard's point are chains of cloth and hair
// (`../follower/chain.ts`) that stream out behind a move, flare as he spins,
// swing back and settle. Pure (state is stepped in place, for a frame's sake).
import type { Random } from "@/lib/random";
import { createRandom } from "@/lib/random";
import type { Chain, Stuff } from "../follower/chain";
import type { Creature } from "../follower/creature";
import type { Emotes } from "../follower/emote";
import type { Spring } from "../follower/solid";
import type { Gait, Point, Walker } from "../follower/walk";
import type { Feet } from "../follower/feet";
import type { Act } from "./leprechaun-acts";
import { createChain, flickChain, hangOf, stepChain } from "../follower/chain";
import { createEmotes, PETTED_S, reached, say, stepEmotes } from "../follower/emote";
import { createFeet, keepPace, stepFeet } from "../follower/feet";
import { faceGoal, springAt, stepAngle, stepSpring } from "../follower/solid";
import { createWalker, isOnWalker, stepWalker } from "../follower/walk";
import {
  ACT_S,
  BEATS_S,
  bump,
  CATCH,
  coinOf,
  doffOf,
  gaitOf,
  handGoals,
  liftOf,
  STEPS,
  timeIn,
} from "./leprechaun-acts";
import { armSidesOf, hangsOf, leprechaunPose } from "./leprechaun-pose";

/** His walk on the screen. He's slower than the others: on short legs he steps no faster than a person. */
const GAIT: Gait = { accel: 900, behind: 60, below: 34, stride: 26, top: 200 };

/** A spring that overshoots and settles: what has weight swings on past and comes back. */
export interface Wobble {
  x: number;
  v: number;
}

/** Each part's spring: where it's going, and how fast it gets there. */
export interface Rig {
  /** Which way he faces, radians: 0 to the right, a quarter turn toward the camera. */
  heading: Spring;
  /** His body leaned forward (radians, - back), and rolled toward his left. */
  lean: Wobble;
  tip: Wobble;
  /** His head turned (radians, + to his left) and nodded (+ up). */
  look: Spring;
  nod: Spring;
  /** Each hand (0 his left) in his body's own pixels, x, y and z. */
  hands: [Wobble, Wobble, Wobble][];
  /** His hat on his head: tipped back (radians), rolled, turned, and risen off it (pixels). */
  hatPitch: Wobble;
  hatRoll: Wobble;
  hatYaw: Wobble;
  hatRise: Wobble;
  /** 0 to 1: dancing his jig, napping, hiding his gold, blinking. */
  jig: Spring;
  nap: Spring;
  guard: Spring;
  blink: Spring;
  /** His brows: -1 cross to 1 raised. */
  brow: Spring;
}

export interface Leprechaun {
  walker: Walker;
  gait: Gait;
  emotes: Emotes;
  random: Random;
  act: Act;
  actFor: number;
  next: number;
  petted: number;
  /** Seconds he's been about, for his breath. */
  time: number;
  /** The jig's beats so far, and how far round it's spun him (radians). */
  beat: number;
  spin: number;
  /** The hand (0 his left) he flips his coin and doffs his hat with: the one nearer the camera. */
  hand: 0 | 1;
  /** His feet, set down and lifted (`../follower/feet.ts`, `STEPS` in `leprechaun-acts.ts`). */
  feet: Feet;
  /** Which side each arm's drawn on: in front of his body, and, raised, of his head. Settled with some give, so a swing doesn't flicker it. */
  armFront: boolean[];
  armOverHead: boolean[];
  rig: Rig;
  /** His coat's tails (0 his left) and his beard's point, on the stage, and how each hangs at rest about its root, eased. */
  tails: Chain[];
  beard: Chain;
  rests: Point[][];
  /** Seconds till he blinks. */
  blinkIn: number;
  /** How fast he and his body went a step ago, to feel them speed up. */
  lastVx: number;
  lastVy: number;
  lastTurn: number;
  lastLift: number;
  lastRise: number;
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
/** The longest a step's felt: a slow frame doesn't fling him. */
const MOST_STEP = 0.05;
/** Steps a wobble's taken in, so it's the same at any frame rate. */
const WOBBLE_STEP = 1 / 240;

/** `n` kept within `most` either way. */
const clamp = (n: number, most: number) => Math.max(-most, Math.min(most, n));

const wobbleAt = (x: number): Wobble => ({ v: 0, x });

/**
 * Steps a wobble `seconds` on toward `goal`: `rate` its quickness (radians a
 * second), `ratio` its damping (under 1, it overshoots), `push` a force on it
 * (a second squared), as the jolt of the body it's carried on.
 */
const stepWobble = (
  wobble: Wobble,
  goal: number,
  [rate, ratio]: readonly [number, number],
  seconds: number,
  push = 0,
) => {
  const total = Math.min(Math.max(seconds, 0), 0.1);
  const steps = Math.ceil(total / WOBBLE_STEP);
  const dt = steps > 0 ? total / steps : 0;
  for (let step = 0; step < steps; step += 1) {
    wobble.v += (rate * rate * (goal - wobble.x) - 2 * ratio * rate * wobble.v + push) * dt;
    wobble.x += wobble.v * dt;
  }
};

/** His hands quick and a little loose; his body heavier; his hat looser still. */
const HAND: readonly [number, number] = [24, 0.55];
const BODY: readonly [number, number] = [9, 0.42];
const HAT: readonly [number, number] = [17, 0.28];

export const createLeprechaun = (at: Point): Leprechaun => {
  const seed = Math.round(at.x * 7919 + at.y * 3);
  const unhung = (): Chain => createChain({ rest: [], root: at });
  const walker = createWalker(at, GAIT);
  const leprechaun: Leprechaun = {
    act: "none",
    actFor: 0,
    armFront: [true, true],
    armOverHead: [false, false],
    beard: unhung(),
    beat: 0,
    blinkIn: 2,
    emotes: createEmotes(seed),
    feet: createFeet(STEPS, walker, Math.PI / 4),
    gait: GAIT,
    hand: 0,
    lastLift: 0,
    lastRise: 0,
    lastTurn: 0,
    lastVx: 0,
    lastVy: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rests: [],
    rig: {
      blink: springAt(0),
      brow: springAt(0),
      guard: springAt(0),
      hands: [1, -1].map((side): [Wobble, Wobble, Wobble] => [
        wobbleAt(0.5),
        wobbleAt(15.4),
        wobbleAt(side * 6),
      ]),
      hatPitch: wobbleAt(0),
      hatRise: wobbleAt(0),
      hatRoll: wobbleAt(0),
      hatYaw: wobbleAt(0),
      // A three-quarter view, toward the camera, to begin with.
      heading: springAt(Math.PI / 4),
      jig: springAt(0),
      lean: wobbleAt(0),
      look: springAt(0),
      nap: springAt(0),
      nod: springAt(0),
      tip: wobbleAt(0),
    },
    spin: 0,
    tails: [unhung(), unhung()],
    time: 0,
    walker,
  };
  return leprechaun;
};

const begin = (leprechaun: Leprechaun, act: Act) => {
  leprechaun.act = act;
  leprechaun.actFor = 0;
  // He uses the hand nearer the camera, so it's seen: his left facing right, his right facing left.
  leprechaun.hand = Math.cos(leprechaun.rig.heading.x) >= 0 ? 0 : 1;
};

const isOn = (leprechaun: Leprechaun, at: Point) => isOnWalker(leprechaun.walker, at, 13, 52);

/** What he's up to: napping, dancing, or, idle a moment, flipping his coin. */
const stepActs = (leprechaun: Leprechaun, moving: boolean, idle: number, seconds: number) => {
  const napping = idle > NAP_S && leprechaun.petted === 0;
  // A mouse coming to rest on him won't stop a jig he's begun.
  const dancing =
    !moving && !napping && idle > JIG_S && (leprechaun.petted === 0 || leprechaun.rig.jig.x > 0.5);
  leprechaun.actFor += seconds;
  const over = leprechaun.actFor > ACT_S[leprechaun.act] || (moving && leprechaun.act === "coin");
  if (leprechaun.act !== "none" && over) {
    leprechaun.act = "none";
  }
  if (leprechaun.act !== "none" || moving || napping || dancing || leprechaun.petted > 0) {
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

/** The jig's beat and his spins in it: once every eight beats, a whole turn over two. */
const stepJig = (leprechaun: Leprechaun, dancing: boolean, seconds: number) => {
  const { rig } = leprechaun;
  stepSpring(rig.jig, dancing ? 1 : 0, dancing ? 5 : 9, seconds);
  const beats = seconds * BEATS_S * rig.jig.x;
  const spinning = leprechaun.beat % 8 >= 6 && rig.jig.x > 0.9;
  leprechaun.beat += beats;
  if (spinning) {
    leprechaun.spin += beats * Math.PI;
  } else {
    // Between spins, the turn so far is always a whole one: he faces where he did.
    const whole = Math.round(leprechaun.spin / (Math.PI * 2)) * Math.PI * 2;
    leprechaun.spin = whole;
  }
};

/** His body, head, brows and eyes after what he's at. */
const stepBody = (
  leprechaun: Leprechaun,
  pointer: Point,
  { dancing, napping }: { dancing: boolean; napping: boolean },
  seconds: number,
) => {
  const { rig, walker } = leprechaun;
  const dt = Math.min(seconds, MOST_STEP);
  const heading = rig.heading.x;
  // How hard he's speeding up along his way, and to his left (into a turn).
  const ax = dt > 0 ? (walker.vx - leprechaun.lastVx) / dt : 0;
  const ay = dt > 0 ? (walker.vy - leprechaun.lastVy) / dt : 0;
  leprechaun.lastVx = walker.vx;
  leprechaun.lastVy = walker.vy;
  const along = ax * Math.cos(heading) + ay * Math.sin(heading);
  const aside = -ax * Math.sin(heading) + ay * Math.cos(heading);
  const gait = gaitOf(leprechaun);
  const doff = doffOf(leprechaun);
  const coin = coinOf(leprechaun);
  const coinT = timeIn(leprechaun, "coin");
  const cross = timeIn(leprechaun, "cross");
  const crossly = cross === null ? 0 : bump(cross, [0, 0.12, 0.8, 1]);

  stepAngle(
    rig.heading,
    faceGoal(walker, pointer, rig.heading.x - leprechaun.spin, MOVING) + leprechaun.spin,
    7,
    seconds,
  );
  stepSpring(rig.nap, napping ? 1 : 0, napping ? 1.2 : 8, seconds);
  stepSpring(rig.guard, leprechaun.petted > 0.25 && !dancing ? 1 : 0, 7, seconds);
  // Into his walk and more into a run; bowing; napping; leaning away from a mouse after his gold.
  const leanGoal =
    0.04 * gait.walking + 0.07 * gait.run + 0.42 * doff.bow + 0.08 * rig.nap.x - 0.12 * rig.guard.x;
  stepWobble(rig.lean, clamp(leanGoal, 0.5), BODY, seconds, clamp(along, 1500) * 0.009);
  stepWobble(rig.tip, 0, BODY, seconds, clamp(aside, 1500) * 0.006);
  const shake = Math.sin(leprechaun.actFor * 15) * 0.35 * crossly;
  stepSpring(rig.look, shake, 14, seconds);
  // Watching the coin up and down into his hand, then looking at it.
  const watch =
    coinT === null
      ? 0
      : coin.height / 30 - 0.3 * bump(coinT, [CATCH - 0.02, CATCH + 0.06, 0.88, 1]);
  const nod = watch - 0.3 * doff.bow - 0.35 * rig.nap.x + 0.3 * rig.guard.x - 0.1 * crossly;
  stepSpring(rig.nod, clamp(nod, 0.6), 10, seconds);
  const brow = 0.6 * doff.reach + 0.5 * Math.min(1, coin.height / 10) - crossly - 0.6 * rig.guard.x;
  stepSpring(rig.brow, clamp(brow, 1), 12, seconds);
  leprechaun.blinkIn -= seconds;
  if (leprechaun.blinkIn <= 0) {
    leprechaun.blinkIn = 2 + leprechaun.random.next() * 4;
  }
  stepSpring(rig.blink, leprechaun.blinkIn < 0.12 ? 1 : 0, 40, seconds);
  return { along, aside, dt };
};

/** His hands and his hat: each to where it's going, jolted by his body's moves. */
const stepLoose = (
  leprechaun: Leprechaun,
  { along, aside, dt }: { along: number; aside: number; dt: number },
  seconds: number,
) => {
  const { rig } = leprechaun;
  const goals = handGoals(leprechaun);
  const caught = timeIn(leprechaun, "coin");
  for (const [index, hand] of rig.hands.entries()) {
    const goal = goals[index] ?? [0, 0, 0];
    for (const [axis, wobble] of hand.entries()) {
      // Carried along, a loose hand lags the way he speeds up.
      const push = axis === 0 ? -along * 0.012 : 0;
      stepWobble(wobble, goal[axis] ?? 0, HAND, seconds, push);
    }
  }
  // The coin smacks into his palm and knocks it down.
  if (caught !== null && caught >= CATCH && caught - seconds / ACT_S.coin < CATCH) {
    const palm = rig.hands[leprechaun.hand]?.[1];
    if (palm) {
      palm.v -= 40;
    }
  }
  // His body's lift, and how hard it changes: a hop's landing jolts the hat down onto his head.
  const lift = liftOf(leprechaun);
  const rise = dt > 0 ? (lift - leprechaun.lastLift) / dt : 0;
  const jolt = dt > 0 ? (rise - leprechaun.lastRise) / dt : 0;
  leprechaun.lastLift = lift;
  leprechaun.lastRise = rise;
  const turning = dt > 0 ? (rig.heading.v - leprechaun.lastTurn) / dt : 0;
  leprechaun.lastTurn = rig.heading.v;
  stepWobble(rig.hatPitch, 0, HAT, seconds, clamp(along, 1500) * 0.03 + rig.lean.v * 6);
  stepWobble(rig.hatRoll, 0, HAT, seconds, clamp(aside, 1500) * 0.02);
  stepWobble(rig.hatYaw, 0, HAT, seconds, -clamp(turning, 120) * 1.2);
  stepWobble(rig.hatRise, 0, [22, 0.3], seconds, -clamp(jolt, 4000) * 0.4);
  rig.hatRise.x = Math.max(-0.8, Math.min(2, rig.hatRise.x));
};

/** His coat's tails: light wool, caught by the air, streaming out behind a run and flaring as he spins. */
const TAILS: Stuff = { damp: 3.5, drag: 0.022, keep: 0.02, keepTip: 0.002, rub: 0.6, weight: 320 };
/** His beard: springier, swinging and bouncing on his chin. */
const BEARD: Stuff = { damp: 6, drag: 0.012, keep: 0.05, keepTip: 0.01, rub: 0.5, weight: 260 };

/** How fast a chain's rest follows his body's turns and bobs: a walk's jitter doesn't crumple it. */
const REST_RATE = 14;

/** His coat's tails and his beard's point, after where they hang this frame: roots on his body, rests eased. */
const stepChains = (leprechaun: Leprechaun, seconds: number) => {
  const { walker } = leprechaun;
  const origin = { x: walker.x, y: walker.y };
  const hangs = hangsOf(leprechaun);
  const chains = [...leprechaun.tails, leprechaun.beard];
  const stuffs = [TAILS, TAILS, BEARD];
  const ease = 1 - Math.exp(-REST_RATE * Math.max(0, seconds));
  for (const [index, points] of [...hangs.tails, hangs.beard].entries()) {
    const [root = origin] = points;
    const rest = points.map((at) => ({ x: at.x - root.x, y: at.y - root.y }));
    const eased = leprechaun.rests[index];
    if (eased?.length === rest.length) {
      for (const [knot, at] of eased.entries()) {
        at.x += ((rest[knot]?.x ?? at.x) - at.x) * ease;
        at.y += ((rest[knot]?.y ?? at.y) - at.y) * ease;
      }
    } else {
      leprechaun.rests[index] = rest;
    }
    const hang = (leprechaun.rests[index] ?? rest).map((at) => ({
      x: root.x + at.x,
      y: root.y + at.y,
    }));
    const chain = chains[index];
    if (chain) {
      stepChain(chain, hangOf(hang, origin), stuffs[index] ?? TAILS, seconds);
    }
  }
};

/** Which side of his body and head each arm's drawn: changed only once it's well over, so a swing won't flicker it. */
const SIDE_GIVE = 0.7;
const settleSides = (leprechaun: Leprechaun) => {
  for (const [index, { body, head }] of armSidesOf(leprechaun).entries()) {
    if (Math.abs(body) > SIDE_GIVE) {
      leprechaun.armFront[index] = body > 0;
    }
    if (Math.abs(head) > SIDE_GIVE / 3) {
      leprechaun.armOverHead[index] = head > 0;
    }
  }
};

export const stepLeprechaun = (
  leprechaun: Leprechaun,
  pointer: Point,
  moved: Point,
  seconds: number,
) => {
  const { walker } = leprechaun;
  leprechaun.time += seconds;
  // Petted (a mouse resting on him), he stands for it; doffing his hat, he stands to bow.
  const resting = Math.hypot(moved.x, moved.y) < 3 && isOn(leprechaun, pointer);
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || leprechaun.act === "doff");
  // No faster toward or away from the camera than across: his steps are as long either way.
  keepPace(walker, STEPS.top, seconds);
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  leprechaun.petted = !moving && isOn(leprechaun, pointer) ? leprechaun.petted + seconds : 0;
  const doing = stepActs(leprechaun, moving, idle, seconds);
  stepTalk(leprechaun, doing, idle, seconds);
  stepJig(leprechaun, doing.dancing, seconds);
  const felt = stepBody(leprechaun, pointer, doing, seconds);
  stepLoose(leprechaun, felt, seconds);
  // His feet set down where they land and stay there till they lift: none faster than a person's.
  stepFeet(leprechaun.feet, STEPS, walker, leprechaun.rig.heading.x, seconds);
  stepChains(leprechaun, seconds);
  settleSides(leprechaun);
};

export const pokeLeprechaun = (leprechaun: Leprechaun, at: Point) => {
  leprechaun.walker.still = Math.min(leprechaun.walker.still, 2);
  const doffing = leprechaun.act === "doff";
  if (isOn(leprechaun, at)) {
    say(leprechaun.emotes, DOFF, true);
    // Mid-doff, he carries on with the one he's at.
    if (!doffing) {
      begin(leprechaun, "doff");
    }
    return;
  }
  // A click elsewhere always gets a rise out of him, whether or not he's a word for it.
  say(leprechaun.emotes, CROSS, leprechaun.random.chance(0.5));
  if (doffing) {
    leprechaun.rig.brow.v -= 30;
    return;
  }
  begin(leprechaun, "cross");
  // The stamp shakes his beard.
  flickChain(leprechaun.beard, { x: 0, y: -60 });
};

export const leprechaun: Creature<Leprechaun> = {
  create: createLeprechaun,
  poke: pokeLeprechaun,
  pose: leprechaunPose,
  step: stepLeprechaun,
};
