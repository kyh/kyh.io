// What the leprechaun (`leprechaun.ts`) does over time, for its rig and its
// pose (`leprechaun-pose.ts`) both: how long each bit of business lasts; the
// coin's flight, up off his thumb and spinning end over end, back down into
// the hand that flicked it; the doff, his hand to his brim, the hat lifted and
// swept out low as he bows, then back on; his arms crossed and a foot
// stamped; and where each hand's going this moment, swinging against his legs
// as he walks, one up and one on his hip in his jig, folded as he naps,
// hidden behind his back from a mouse after his gold. And his gait: on short
// legs he steps no faster than a person does, so past a stroll his strides
// lengthen into a skipping run with both feet off the ground between. In his
// body's own pixels: x forward, y up, z to his left, his feet at the origin.
// Pure.
import type { Vec3 } from "../follower/solid";
import type { Leprechaun } from "./leprechaun";
import type { Steps } from "../follower/feet";
import { groundSpeedOf } from "../follower/feet";
import { add, mix, PITCH, smooth } from "../follower/solid";

/** A moment's business: a coin flipped, his hat doffed, a cross word with his arms folded. */
export type Act = "none" | "coin" | "doff" | "cross";
export const ACT_S: Record<Act, number> = { coin: 1.9, cross: 1.4, doff: 1.9, none: 0 };

/** Where his head sits, and its radius: the hat's choreography is about it. */
export const HEAD: Vec3 = [0.9, 34.6, 0];
export const HEAD_R = 6.4;
/** His shoulder (on his left; z flipped for his right), and his hand hanging at rest. */
export const SHOULDER: Vec3 = [0, 26, 5.7];
const HANG: Vec3 = [0.5, 14.4, 7.2];

/** The coin leaves his thumb and lands back in his hand at these points of the flip, this high between. */
export const LAUNCH = 0.22;
export const CATCH = 0.74;
const COIN_UP = 42;
const COIN_TURNS = 6;

/** The jig: beats a second, and how high he hops on each. */
export const BEATS_S = 2.4;
export const HOP = 3.2;

/** 0 to 1 as `t` goes `from` to `to`, eased. */
export const ramp = (t: number, from: number, to: number) => smooth((t - from) / (to - from));

/** Up over `from` to `top`, held, and down over `fall` to `to`. */
export const bump = (t: number, [from, top, fall, to]: readonly [number, number, number, number]) =>
  ramp(t, from, top) * (1 - ramp(t, fall, to));

/** How far through `act` he is, 0 to 1; null when he's not at it. */
export const timeIn = (leprechaun: Leprechaun, act: Act) =>
  leprechaun.act === act ? Math.min(1, leprechaun.actFor / ACT_S[act]) : null;

/** Its side, from a hand's index: 1 his left, -1 his right. */
export const sideOf = (index: number) => (index === 0 ? 1 : -1);

/** The coin: how high over his hand, how far it's turned end over end (radians), and whether it's out. */
export const coinOf = (leprechaun: Leprechaun) => {
  const t = timeIn(leprechaun, "coin");
  if (t === null) {
    return { height: 0, shown: 0, spin: 0 };
  }
  const flight = Math.min(1, Math.max(0, (t - LAUNCH) / (CATCH - LAUNCH)));
  return {
    height: 4 * COIN_UP * flight * (1 - flight),
    shown: bump(t, [0.03, 0.1, 0.9, 0.97]),
    spin: flight * COIN_TURNS * Math.PI * 2,
  };
};

/**
 * How he steps (`../follower/feet.ts`): his feet under his hips; a planted
 * foot gets no farther from its place than his legs reach. On such short legs
 * he steps no faster than a person does (under three strides a second at his
 * top pace over the ground), so past a stroll a foot's down less and less of
 * each stride, and his steps lengthen into a skipping run, both feet off the
 * ground between.
 */
export const STEPS: Steps = {
  cadence: [1.4, 2.8],
  duty: [0.62, 0.14],
  homes: [
    { ahead: 0.3, left: 2.6 },
    { ahead: 0.3, left: -2.6 },
  ],
  lift: [2, 4.5],
  offsets: [0, 0.5],
  reach: 6,
  top: 190,
};

/**
 * His gait at the pace he's going: how much of a stride a foot's down, and 0
 * to 1 how much he's walking (stepping at all) and running (off the ground
 * between steps).
 */
export const gaitOf = (leprechaun: Leprechaun) => {
  const speed = groundSpeedOf(leprechaun.walker) * (1 - leprechaun.rig.jig.x);
  const t = Math.min(1, speed / STEPS.top);
  const duty = STEPS.duty[0] + (STEPS.duty[1] - STEPS.duty[0]) * t;
  return { duty, run: smooth((0.5 - duty) / 0.3), walking: Math.min(1, speed / 40) };
};

/** How far ahead of his hips a foot is, along the way he faces (ground pixels): his hips and arms turn with it. */
export const aheadOf = (leprechaun: Leprechaun, index: number) => {
  const { feet, rig, walker } = leprechaun;
  const foot = feet.feet[index];
  if (!foot) {
    return 0;
  }
  const heading = rig.heading.x;
  const toward = (foot.y - walker.y) / Math.sin(PITCH);
  return (foot.x - walker.x) * Math.cos(heading) + toward * Math.sin(heading);
};

/**
 * How high his body's lifted: walking, riding up over each leg as it
 * straightens under him; running, crouched, sinking on each landing and
 * flying between; hopping in his jig; breathing as he naps.
 */
export const liftOf = (leprechaun: Leprechaun) => {
  const { rig } = leprechaun;
  const { duty, run, walking } = gaitOf(leprechaun);
  // Half a stride: one step, from one foot landing to the other.
  const step = (((leprechaun.feet.phase * 2) % 1) + 1) % 1;
  const down = Math.min(0.95, 2 * duty);
  const flight =
    step < down
      ? -0.6 * Math.sin((step / down) * Math.PI)
      : 2 * Math.sin(((step - down) / (1 - down)) * Math.PI);
  const walk = 1 * Math.sin(step * Math.PI) ** 2 - 0.7;
  const beat = leprechaun.beat % 1;
  const breath = Math.sin(leprechaun.time * 1.6) * 0.35 * rig.nap.x;
  return (
    walking * (walk * (1 - run) + (flight - 1.1) * run) +
    4 * beat * (1 - beat) * HOP * rig.jig.x +
    breath
  );
};

/** The doff, through the act: the hand's way (brim, lifted, swept out low, back), and how much it holds the hat. */
const BRIM_SIDE: Vec3 = [HEAD[0] + 1.6, HEAD[1] + 4.2, 6.6];
const DOFF_WAY: readonly (readonly [number, Vec3])[] = [
  [0, BRIM_SIDE],
  [0.2, BRIM_SIDE],
  // Up off his head and out to his side, clear of his face; then swept down low at his side as he bows.
  [0.36, [2, 37.4, 10.4]],
  [0.6, [3.6, 22.5, 11.2]],
  [0.8, [3.4, 21.8, 11]],
  [0.92, BRIM_SIDE],
  [1, BRIM_SIDE],
];

/** Along a way of points at times, eased between. */
const along = (way: readonly (readonly [number, Vec3])[], t: number): Vec3 => {
  const next = way.findIndex(([at]) => at >= t);
  const [toAt, to] = way[Math.max(0, next)] ?? [0, HEAD];
  const [fromAt, from] = way[Math.max(0, next - 1)] ?? [toAt, to];
  return toAt > fromAt ? mix(from, to, ramp(t, fromAt, toAt)) : to;
};

export const doffOf = (leprechaun: Leprechaun) => {
  const t = timeIn(leprechaun, "doff");
  if (t === null) {
    return { bow: 0, grip: 0, hand: HEAD, reach: 0, sweep: 0, t: 0 };
  }
  return {
    bow: bump(t, [0.34, 0.52, 0.78, 0.92]),
    grip: bump(t, [0.13, 0.2, 0.86, 0.92]),
    hand: along(DOFF_WAY, t),
    reach: bump(t, [0, 0.13, 0.9, 1]),
    // Swept out, the hat's turned crown out from his side, its brim to the ground.
    sweep: bump(t, [0.38, 0.6, 0.8, 0.92]),
    t,
  };
};

/** A foot stamped, crossly: lifted slowly, brought down hard. */
export const stampOf = (leprechaun: Leprechaun) => {
  const t = timeIn(leprechaun, "cross");
  return t === null ? 0 : bump(t, [0.1, 0.24, 0.26, 0.3]);
};

/** A hand walking: swinging against the opposite foot, arcing up at either end, pumped as he runs. */
const walkHand = (leprechaun: Leprechaun, index: number): Vec3 => {
  const side = sideOf(index);
  const { run } = gaitOf(leprechaun);
  const swing = Math.max(-5, Math.min(5, 0.55 * aheadOf(leprechaun, 1 - index)));
  return [
    HANG[0] + swing * (1 + run * 0.3) + 1.6 * run,
    HANG[1] + 0.08 * swing * swing + 3.2 * run,
    side * (HANG[2] - 0.5 * run),
  ];
};

/** A hand dancing: one up, one on his hip, changing over every other beat. */
const jigHand = (leprechaun: Leprechaun, index: number): Vec3 => {
  const side = sideOf(index);
  const up = Math.floor(leprechaun.beat / 2) % 2 === index;
  // Up and out over his shoulder, clear of his head and hat; or on his hip, elbow out.
  return up ? [0.6, 35.8, side * 12] : [-0.6, 18, side * 8.4];
};

/** A hand at a moment's business: the coin flipped off the thumb and caught; arms folded crossly. */
const actHand = (leprechaun: Leprechaun, index: number, rest: Vec3): Vec3 => {
  const side = sideOf(index);
  const own = index === leprechaun.hand;
  const coin = timeIn(leprechaun, "coin");
  if (coin !== null && own) {
    const flick = 1.8 * bump(coin, [LAUNCH - 0.05, LAUNCH, LAUNCH, LAUNCH + 0.06]);
    const meet = 1.2 * bump(coin, [CATCH - 0.14, CATCH - 0.02, CATCH, CATCH + 0.02]);
    const dip = -2 * bump(coin, [CATCH, CATCH + 0.03, CATCH + 0.06, CATCH + 0.2]);
    return mix(rest, [8.4, 20.4 + flick + meet + dip, side * 3], bump(coin, [0, 0.14, 0.88, 1]));
  }
  const doff = doffOf(leprechaun);
  if (doff.reach > 0 && own) {
    return mix(rest, [doff.hand[0], doff.hand[1], side * doff.hand[2]], doff.reach);
  }
  const cross = timeIn(leprechaun, "cross");
  if (cross !== null) {
    const folded: Vec3 = [8, 22.4 + (index === 0 ? 0 : 1.4), -side * 3.2];
    return mix(rest, folded, bump(cross, [0, 0.16, 0.82, 1]));
  }
  return rest;
};

/** Where each hand's going now, in his body's own pixels. */
export const handGoals = (leprechaun: Leprechaun): Vec3[] =>
  [0, 1].map((index) => {
    const side = sideOf(index);
    const { guard, jig, nap } = leprechaun.rig;
    let rest = walkHand(leprechaun, index);
    rest = mix(rest, jigHand(leprechaun, index), jig.x);
    // Folded on his belly as he naps.
    rest = mix(rest, [7.8, 17.6, side * 1.6], nap.x);
    // Hidden behind his back: a mouse is after his gold.
    rest = mix(rest, [-7.2, 18.6, side * 2.4], guard.x);
    return actHand(leprechaun, index, rest);
  });

/**
 * Which way an elbow points: back and out, the farther out the more the
 * hand's ahead of him; out to his side as the hand's raised over his shoulder.
 */
export const elbowPole = (goal: Vec3, index: number): Vec3 => {
  const side = sideOf(index);
  const low = add([-0.7, -0.5, 0], [0, 0, side * (0.5 + 0.1 * Math.max(0, goal[0]))]);
  return mix(low, [-0.15, -0.3, side], ramp(goal[1], SHOULDER[1], SHOULDER[1] + 8));
};
