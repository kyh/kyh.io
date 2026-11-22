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
import { faceGoal, headingOf, PITCH, smooth, springAt, stepSpring } from "../follower/solid";
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
  facingOf,
  liftOf,
  SIZE,
  STEPS,
  timeIn,
} from "./leprechaun-acts";
import { leprechaunPose, stepPoseOf } from "./leprechaun-pose";

const GAIT: Gait = { accel: 900, behind: 60 * SIZE, below: 34 * SIZE, stride: 26 * SIZE, top: 200 };

/** A spring that overshoots and settles: what has weight swings on past and comes back. */
interface Wobble {
  x: number;
  v: number;
}

/** Each part's spring: where it's going, and how fast it gets there. */
interface Rig {
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
  /** The jig's beats so far, and how far round it's spun him (radians, on top of his heading). */
  beat: number;
  spin: Spring;
  /** The hand (0 his left) he flips his coin and doffs his hat with: the one nearer the camera. */
  hand: 0 | 1;
  /** His feet, set down and lifted (`../follower/feet.ts`, `STEPS` in `leprechaun-acts.ts`). */
  feet: Feet;
  /**
   * Which side of his body each arm and coat tail is drawn on, which leg's
   * the nearer, whether a raised arm's before his face, and whether his face
   * is toward the camera (over his head) or away (under it): each settled
   * with some give (`settleSides`), so a swing or a sway never flickers it.
   */
  faceFront: boolean;
  armFront: boolean[];
  /** Which hands are behind his back, hiding his gold (`isHidden`). */
  armBehind: boolean[];
  armOverHead: boolean[];
  tailFront: boolean[];
  nearLeg: 0 | 1;
  rig: Rig;
  /** His coat's tails (0 his left) and his beard's point, on the stage, and how each hangs at rest about its root, eased. */
  tails: Chain[];
  beard: Chain;
  rests: Point[][];
  /** Which way round he's committed to a big turn: 1, -1, or 0 for none. */
  turnWay: number;
  /** A point dragged along behind him on a line (`AMBLE` long once he's walked that far), and whether it's taut. */
  trail: Point;
  ambling: boolean;
  /** How fast the mouse has been going, pixels a second, eased. */
  mouseSpeed: number;
  /** Clicked on and greeting whoever it was: how far the mouse has moved on since, and no petting counts till it has. */
  greeted: Point | null;
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
const COIN_IDLE_S = 2.2;
const NAP_S = 32;
const MOVING = 25;
const MOST_STEP = 0.05;
const WOBBLE_STEP = 1 / 240;

const clamp = (n: number, most: number) => Math.max(-most, Math.min(most, n));

const wobbleAt = (x: number) => ({ v: 0, x }) satisfies Wobble;

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

const HAND: readonly [number, number] = [24, 0.55];
const BODY: readonly [number, number] = [9, 0.42];
const HAT: readonly [number, number] = [17, 0.28];
const HAT_TURN: readonly [number, number] = [17, 0.6];

const createLeprechaun = (at: Point) => {
  const seed = Math.round(at.x * 7919 + at.y * 3);
  const unhung = () => createChain({ rest: [], root: at });
  const walker = createWalker(at, GAIT);

  const leprechaun: Leprechaun = {
    act: "none",
    actFor: 0,
    ambling: false,
    armBehind: [false, false],
    armFront: [true, true],
    armOverHead: [false, false],
    beard: unhung(),
    beat: 0,
    blinkIn: 2,
    emotes: createEmotes(seed),
    faceFront: true,
    feet: createFeet(STEPS, walker, Math.PI / 4),
    gait: GAIT,
    greeted: null,
    hand: 0,
    lastLift: 0,
    lastRise: 0,
    lastTurn: 0,
    lastVx: 0,
    lastVy: 0,
    mouseSpeed: 0,
    nearLeg: 0,
    next: 1.5,
    petted: 0,
    random: createRandom(seed + 1),
    rests: [],
    rig: {
      blink: springAt(0),
      brow: springAt(0),
      guard: springAt(0),
      hands: [1, -1].map(
        (side) =>
          [wobbleAt(0.5), wobbleAt(15.4), wobbleAt(side * 6)] satisfies [Wobble, Wobble, Wobble],
      ),
      hatPitch: wobbleAt(0),
      hatRise: wobbleAt(0),
      hatRoll: wobbleAt(0),
      hatYaw: wobbleAt(0),
      heading: springAt(Math.PI / 4),
      jig: springAt(0),
      lean: wobbleAt(0),
      look: springAt(0),
      nap: springAt(0),
      nod: springAt(0),
      tip: wobbleAt(0),
    },
    spin: springAt(0),
    tailFront: [false, false],
    tails: [unhung(), unhung()],
    time: 0,
    trail: { x: walker.x, y: walker.y },
    turnWay: 0,
    walker,
  };

  return leprechaun;
};

const BESIDE = 40;

const towardVisitor = (leprechaun: Leprechaun, pointer: Point) =>
  Math.PI / 2 - 0.5 * clamp((pointer.x - leprechaun.walker.x) / BESIDE, 1);

const businessHeading = (leprechaun: Leprechaun, pointer: Point) =>
  leprechaun.act === "doff"
    ? Math.PI / 2 - 0.7 * (leprechaun.hand === 0 ? 1 : -1)
    : towardVisitor(leprechaun, pointer);

const begin = (leprechaun: Leprechaun, act: Act, pointer: Point) => {
  leprechaun.act = act;
  leprechaun.actFor = 0;
  leprechaun.hand = Math.cos(towardVisitor(leprechaun, pointer)) >= 0 ? 0 : 1;
};

const isOn = (leprechaun: Leprechaun, at: Point) =>
  isOnWalker(leprechaun.walker, at, 14 * SIZE, 54 * SIZE);

const stepActs = (
  leprechaun: Leprechaun,
  pointer: Point,
  { idle, moving }: { idle: number; moving: boolean },
  seconds: number,
) => {
  const napping = idle > NAP_S && leprechaun.petted === 0;

  const dancing =
    !moving && !napping && idle > JIG_S && (leprechaun.petted === 0 || leprechaun.rig.jig.x > 0.5);

  leprechaun.actFor += seconds;
  const left = moving && (timeIn(leprechaun, "coin") ?? 0) > CATCH + 0.04;
  const over = leprechaun.actFor > ACT_S[leprechaun.act] || left;

  if (leprechaun.act !== "none" && over) {
    leprechaun.act = "none";
  }

  if (leprechaun.act !== "none" || moving || napping || dancing || leprechaun.petted > 0) {
    return { dancing, napping };
  }

  leprechaun.next -= seconds;

  if (idle > COIN_IDLE_S && leprechaun.next <= 0) {
    begin(leprechaun, "coin", pointer);
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
    if (reached(leprechaun.petted, seconds, PETTED_S)) {
      say(emotes, PET, true);
    }
  } else if (dancing) {
    if (random.chance(seconds * 0.4)) {
      say(emotes, JIG);
    }
  } else if (idle > 1.5 && random.chance(seconds * 0.1)) {
    say(emotes, CHATTER);
  }
};

const stepJig = (leprechaun: Leprechaun, dancing: boolean, seconds: number) => {
  const { rig, spin } = leprechaun;
  stepSpring(rig.jig, dancing ? 1 : 0, dancing ? 5 : 9, seconds);
  leprechaun.beat += seconds * BEATS_S * rig.jig.x;
  const into = leprechaun.beat % 8;
  const spinning = dancing && rig.jig.x > 0.9 && into >= 6;
  const whole = spin.x > Math.PI ? Math.PI * 2 : 0;
  stepSpring(spin, spinning ? Math.PI * 2 * smooth((into - 6) / 2) : whole, 18, seconds);

  if (!spinning && Math.abs(spin.x - whole) < 0.01 && Math.abs(spin.v) < 0.5) {
    spin.x = 0;
    spin.v = 0;
  }
};

const BIG_TURN = 2.2;

const turnToward = (leprechaun: Leprechaun, goal: number, rate: number, seconds: number) => {
  const { heading } = leprechaun.rig;
  const short = Math.atan2(Math.sin(goal - heading.x), Math.cos(goal - heading.x));
  let turn = short;

  if (Math.abs(short) <= BIG_TURN) {
    leprechaun.turnWay = 0;
  } else {
    if (leprechaun.turnWay === 0) {
      const front = Math.sin(heading.x + short / 2) < 0 ? -Math.sign(short) : Math.sign(short);
      leprechaun.turnWay = Math.abs(heading.v) > 0.5 ? Math.sign(heading.v) : front;
    }

    if (Math.sign(short) !== leprechaun.turnWay) {
      turn = short - Math.sign(short) * Math.PI * 2;
    }
  }

  stepSpring(heading, heading.x + turn, rate, seconds);
  heading.x = Math.atan2(Math.sin(heading.x), Math.cos(heading.x));
};

const AMBLE = 12;
const AMBLE_REST_S = 0.5;

const stepTrail = (leprechaun: Leprechaun) => {
  const { trail, walker } = leprechaun;
  const dx = walker.x - trail.x;
  const dy = walker.y - trail.y;
  const off = Math.hypot(dx, dy);

  if (walker.still >= AMBLE_REST_S || dx * walker.vx + dy * walker.vy < 0) {
    trail.x = walker.x;
    trail.y = walker.y;
    leprechaun.ambling = false;
  } else if (off > AMBLE) {
    trail.x = walker.x - (dx / off) * AMBLE;
    trail.y = walker.y - (dy / off) * AMBLE;
    leprechaun.ambling = true;
  }
};

const goalOf = (leprechaun: Leprechaun, pointer: Point) => {
  const { rig, walker } = leprechaun;

  if (!leprechaun.ambling || walker.speed > MOVING) {
    return faceGoal(walker, pointer, rig.heading.x, MOVING);
  }

  return walker.speed > 1 ? headingOf(walker.vx, walker.vy) : rig.heading.x;
};

const stepBody = (
  leprechaun: Leprechaun,
  pointer: Point,
  { dancing, napping }: { dancing: boolean; napping: boolean },
  seconds: number,
) => {
  const { rig, walker } = leprechaun;
  const dt = Math.min(seconds, MOST_STEP);
  const heading = rig.heading.x;
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

  stepTrail(leprechaun);
  const going = walker.speed > MOVING || leprechaun.ambling;
  const acting = leprechaun.act !== "none" && !(going && leprechaun.act === "coin");
  const busy = acting || leprechaun.petted > 0 || dancing || rig.nap.x > 0.05;
  const goal = busy ? businessHeading(leprechaun, pointer) : goalOf(leprechaun, pointer);
  turnToward(leprechaun, goal, going ? 10 : 7, seconds);
  stepSpring(rig.nap, napping ? 1 : 0, napping ? 1.2 : 8, seconds);
  const guarding = leprechaun.petted > 0.25 && !dancing;
  stepSpring(rig.guard, guarding ? 1 : 0, 7, seconds);

  const leanGoal =
    0.04 * gait.walking + 0.07 * gait.run + 0.42 * doff.bow + 0.08 * rig.nap.x - 0.12 * rig.guard.x;

  stepWobble(rig.lean, clamp(leanGoal, 0.5), BODY, seconds, clamp(along, 1500) * 0.009);
  stepWobble(rig.tip, 0, BODY, seconds, clamp(aside, 1500) * 0.006);
  const shake = Math.sin(leprechaun.actFor * 15) * 0.35 * crossly;
  stepSpring(rig.look, shake, 14, seconds);

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
      const push = axis === 0 ? -along * 0.012 : 0;
      stepWobble(wobble, goal[axis] ?? 0, HAND, seconds, push);
    }
  }

  if (caught !== null && caught >= CATCH && caught - seconds / ACT_S.coin < CATCH) {
    const palm = rig.hands[leprechaun.hand]?.[1];

    if (palm) {
      palm.v -= 40;
    }
  }

  const lift = liftOf(leprechaun);
  const rising = dt > 0 ? (lift - leprechaun.lastLift) / dt : 0;
  const rise = leprechaun.lastRise + (rising - leprechaun.lastRise) * (1 - Math.exp(-dt / 0.03));
  const jolt = dt > 0 ? (rise - leprechaun.lastRise) / dt : 0;
  leprechaun.lastLift = lift;
  leprechaun.lastRise = rise;
  const turnRate = rig.heading.v + leprechaun.spin.v;
  const turning = dt > 0 ? (turnRate - leprechaun.lastTurn) / dt : 0;
  leprechaun.lastTurn = turnRate;
  stepWobble(rig.hatPitch, 0, HAT, seconds, clamp(along, 1500) * 0.09 + rig.lean.v * 18);
  stepWobble(rig.hatRoll, 0, HAT, seconds, clamp(aside, 1500) * 0.06);
  stepWobble(rig.hatYaw, 0, HAT_TURN, seconds, -clamp(turning, 120) * 2);
  rig.hatYaw.x = clamp(rig.hatYaw.x, 0.2);
  stepWobble(rig.hatRise, 0, [22, 0.3], seconds, -clamp(jolt, 4000) * 1.2);
  rig.hatPitch.x = clamp(rig.hatPitch.x, 0.35);
  rig.hatRoll.x = clamp(rig.hatRoll.x, 0.3);
  rig.hatRise.x = Math.max(-0.8, Math.min(2.5, rig.hatRise.x));
};

const TAILS: Stuff = { damp: 2.5, drag: 0.014, keep: 0.012, keepTip: 0.002, rub: 0.6, weight: 380 };
const TAIL_BEND = 0.6;

const holdBend = (most: number) => (chain: Chain) => {
  const { knots } = chain;

  for (let index = 2; index < knots.length; index += 1) {
    const a = knots[index - 2];
    const b = knots[index - 1];
    const c = knots[index];

    if (!a || !b || !c) {
      continue;
    }

    const before = Math.atan2(b.y - a.y, b.x - a.x);
    const length = Math.hypot(c.x - b.x, c.y - b.y);
    const off = Math.atan2(c.y - b.y, c.x - b.x) - before;
    const bent = Math.atan2(Math.sin(off), Math.cos(off));

    if (Math.abs(bent) > most) {
      const angle = before + Math.sign(bent) * most;
      const x = b.x + Math.cos(angle) * length;
      const y = b.y + Math.sin(angle) * length;
      c.px += x - c.x;
      c.py += y - c.y;
      c.x = x;
      c.y = y;
    }
  }
};

const TAIL_HOLD = holdBend(TAIL_BEND);
const BEARD: Stuff = { damp: 4.5, drag: 0.014, keep: 0.025, keepTip: 0.005, rub: 0.5, weight: 260 };

const REST_RATE = 14;

const stepChains = (
  leprechaun: Leprechaun,
  hangs: { beard: Point[]; tails: Point[][] },
  seconds: number,
) => {
  const { walker } = leprechaun;
  const origin = { x: walker.x, y: walker.y };
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
      const hold = index < 2 ? TAIL_HOLD : undefined;
      stepChain(chain, hangOf(hang, origin, SIZE), stuffs[index] ?? TAILS, seconds, hold);
    }
  }
};

const FACE_AWAY = 0.35;

const sideToward = (heading: number, side: number) => side * Math.cos(heading) * Math.cos(PITCH);

const HAND_BACK = -1;
const HAND_OUT = -0.5;
const HAND_AHEAD = 6;

const settled = (was: boolean, value: number, give: number) => (was ? value > -give : value > give);

const isHidden = ({ armBehind, armFront, rig }: Leprechaun, index: number) => {
  const hand = rig.hands[index]?.[0]?.x ?? 0;
  const hiding = rig.guard.v > 0 && (hand < HAND_BACK || !(armFront[index] ?? true));

  return hiding || ((armBehind[index] ?? false) && hand < HAND_OUT);
};

const settleSides = (
  leprechaun: Leprechaun,
  arms: readonly { head: number }[],
  moving: boolean,
) => {
  const heading = facingOf(leprechaun);
  const face = Math.sin(heading + leprechaun.rig.look.x);
  leprechaun.faceFront = settled(leprechaun.faceFront, face + FACE_AWAY, 0.1);
  const left = sideToward(heading, 1);

  if (Math.abs(left) > 0.15) {
    leprechaun.nearLeg = left > 0 ? 0 : 1;
  }

  const back = -Math.sin(heading) * Math.cos(PITCH);
  const goals = handGoals(leprechaun);

  for (const [index, { head }] of arms.entries()) {
    const side = index === 0 ? 1 : -1;
    const ahead = goals[index]?.[0] ?? 0;
    const before = !moving && ahead > HAND_AHEAD && Math.sin(heading) > 0.1;
    const behind = isHidden(leprechaun, index) && Math.sin(heading) > -0.2;
    leprechaun.armBehind[index] = behind;
    const shown = sideToward(heading, side) + 0.35;
    const front = before || settled(leprechaun.armFront[index] ?? true, shown, 0.1);
    leprechaun.armFront[index] = front && !behind;
    leprechaun.armOverHead[index] = settled(leprechaun.armOverHead[index] ?? false, head, 0.3);
    const tail = back * 4.4 + sideToward(heading, side) * 1.9;
    leprechaun.tailFront[index] = settled(leprechaun.tailFront[index] ?? false, tail, 0.5);
  }
};

const MOST_FRAME = 0.1;
const MOUSE_S = 0.02;
const PASSING = 180;
const GREETED = 12;

const stepLeprechaun = (leprechaun: Leprechaun, pointer: Point, moved: Point, elapsed: number) => {
  const { walker } = leprechaun;
  const seconds = Math.min(Math.max(elapsed, 0), MOST_FRAME);
  leprechaun.time += seconds;

  if (seconds > 0) {
    const ease = 1 - Math.exp(-seconds / MOUSE_S);
    const speed = Math.hypot(moved.x, moved.y) / seconds;
    leprechaun.mouseSpeed += (speed - leprechaun.mouseSpeed) * ease;
  }

  const resting = leprechaun.mouseSpeed < PASSING && isOn(leprechaun, pointer);
  const standing = leprechaun.act === "doff" || leprechaun.act === "cross";
  stepWalker(walker, GAIT, pointer, moved, seconds, resting || standing);
  keepPace(walker, STEPS.top, seconds);
  const moving = walker.speed > MOVING;
  const idle = moving ? 0 : walker.still;
  const { greeted } = leprechaun;

  if (greeted) {
    greeted.x += moved.x;
    greeted.y += moved.y;
    leprechaun.greeted = Math.hypot(greeted.x, greeted.y) > GREETED ? null : greeted;
  }

  const petting = !moving && isOn(leprechaun, pointer) && leprechaun.greeted === null;
  leprechaun.petted = petting ? leprechaun.petted + seconds : 0;
  const doing = stepActs(leprechaun, pointer, { idle, moving }, seconds);
  stepTalk(leprechaun, doing, idle, seconds);
  stepJig(leprechaun, doing.dancing, seconds);
  const felt = stepBody(leprechaun, pointer, doing, seconds);
  stepLoose(leprechaun, felt, seconds);
  stepFeet(leprechaun.feet, STEPS, walker, facingOf(leprechaun), seconds);
  const posed = stepPoseOf(leprechaun);
  stepChains(leprechaun, posed, seconds);
  settleSides(leprechaun, posed.arms, moving);
};

const pokeLeprechaun = (leprechaun: Leprechaun, at: Point) => {
  leprechaun.walker.still = Math.min(leprechaun.walker.still, 2);
  const doffing = leprechaun.act === "doff";

  if (isOn(leprechaun, at)) {
    say(leprechaun.emotes, DOFF, true);
    leprechaun.petted = 0;
    leprechaun.greeted = { x: 0, y: 0 };

    if (!doffing) {
      begin(leprechaun, "doff", at);
    }

    return;
  }

  say(leprechaun.emotes, CROSS, leprechaun.random.chance(0.5));

  if (doffing) {
    leprechaun.rig.brow.v -= 30;

    return;
  }

  begin(leprechaun, "cross", at);
  flickChain(leprechaun.beard, { x: 0, y: -60 });
};

export const leprechaun: Creature<Leprechaun> = {
  create: createLeprechaun,
  poke: pokeLeprechaun,
  pose: leprechaunPose,
  step: stepLeprechaun,
};
