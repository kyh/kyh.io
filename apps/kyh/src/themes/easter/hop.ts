import { smooth } from "../follower/solid";

/** A spot on the ground. */
export interface Spot {
  x: number;
  z: number;
}

/** A foot set down: where (its toe, or its paw), and which way it points. */
interface Pin extends Spot {
  turn: number;
}

/** A pair of feet: its left, its right. */
type Pair = readonly [Pin, Pin];

interface Leap {
  from: Spot;
  to: Spot;
  /** Its heading as it sets off and as it lands. */
  turnFrom: number;
  turnTo: number;
  seconds: number;
  /** Its body's rise at the top of the hop, pixels. */
  height: number;
  /** 0 to 1: a little hop to a long bound, for how far it stretches and pitches. */
  size: number;
  /** Its speed setting off and landing, as a share of its speed in the air: 0 from or to a stand. */
  start: number;
  end: number;
  /** Where its feet land. */
  hind: Pair;
  fore: Pair;
}

export interface Hopper {
  /** The hop it's in, and how far through it, 0 to 1; null standing. */
  leap: Leap | null;
  u: number;
  /** Where it stands (or set off from), and its heading. */
  at: Spot;
  heading: number;
  /** Where its feet were last set down. */
  hind: Pair;
  fore: Pair;
  /** Which way it last turned (1 its left, -1 its right): turning right round, it keeps on that way. */
  turned: number;
}

/** Its shoulders, forward of its feet and up; and how far a forepaw reaches from one. */
export const SHOULDER = { side: 2.3, x: 5, y: 4.6 } as const;
export const FORE_REACH = 9;

/** Where its feet stand about it, at rest: its hind toes under its belly, its forepaws under its chest. */
export const HIND_REST = { side: 3.9, x: 0.6 } as const;
const FORE_REST = { side: 2.3, x: 7.6 } as const;

const FORE_LIFT = [0.04, 0.08] as const;
export const HIND_LIFT = 0.26;
const FORE_LAND = [0.58, 0.62] as const;
const HIND_LAND = 0.84;
const RISE = [0.1, 0.6] as const;

const PACE: readonly (readonly [number, number])[] = [
  [0.12, 0.3],
  [HIND_LIFT, 1],
  [FORE_LAND[0], 1],
  [0.66, 0.2],
  [HIND_LAND, 0.1],
];

const ON = 0.08;

const MOST_LEAP = 60;
const MOST_LEAP_DEEP = 70;
const LEAST_LEAP = 5;
const ARRIVED = 9;
const LEAST_HOPS = 2.8;
const MOST_HOPS = 4.2;
const MOST_TURN = 1.2;
const MOST_PIVOT = 1.1;
const LEAST_PIVOT = 0.5;
const PIVOT_S = 0.3;
const BEHIND = (2 * Math.PI) / 3;
const MOST_REVERSE = 1.7;
const REVERSE_S = 0.36;

/** How far off it must be to set off from a stand: nearer, it waits, then goes in one hop. */
export const SET_OFF = 25;
const PIVOT_HEIGHT = 2.5;

export const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

const groundAt = (at: Spot, turn: number, forward: number, left: number) =>
  ({
    x: at.x + forward * Math.cos(turn) - left * Math.sin(turn),
    z: at.z + forward * Math.sin(turn) + left * Math.cos(turn),
  }) satisfies Spot;

const pairAt = (at: Spot, turn: number, forward: number, side: number) =>
  [
    { ...groundAt(at, turn, forward, side), turn },
    { ...groundAt(at, turn, forward, -side), turn },
  ] satisfies Pair;

const standing = (at: Spot, turn: number) => ({
  fore: pairAt(at, turn, FORE_REST.x, FORE_REST.side),
  hind: pairAt(at, turn, HIND_REST.x, HIND_REST.side),
});

export const createHopper = (at: Spot, heading: number) =>
  ({
    ...standing(at, heading),
    at,
    heading,
    leap: null,
    turned: 0,
    u: 0,
  }) satisfies Hopper;

type Way = Pick<Leap, "end" | "from" | "start" | "to">;

const goneBy = (leap: Way, u: number) => {
  const marks: readonly (readonly [number, number])[] = [[0, leap.start], ...PACE, [1, leap.end]];
  let gone = 0;
  let whole = 0;

  for (let index = 1; index < marks.length; index += 1) {
    const [a = 0, va = 0] = marks[index - 1] ?? [];
    const [b = 1, vb = 0] = marks[index] ?? [];
    const piece = ((va + vb) / 2) * (b - a);
    whole += piece;

    if (u >= b) {
      gone += piece;
    } else if (u > a) {
      const t = (u - a) / (b - a);
      gone += (va + ((vb - va) * t) / 2) * t * (b - a);
    }
  }

  return whole > 0 ? gone / whole : 1;
};

const bodyAt = (leap: Way, u: number) => {
  const gone = goneBy(leap, u);

  return {
    x: leap.from.x + (leap.to.x - leap.from.x) * gone,
    z: leap.from.z + (leap.to.z - leap.from.z) * gone,
  } satisfies Spot;
};

const TURNING = [0.18, FORE_LAND[0]] as const;

const turnAt = (leap: Leap, u: number) =>
  leap.turnFrom +
  wrap(leap.turnTo - leap.turnFrom) * smooth((u - TURNING[0]) / (TURNING[1] - TURNING[0]));

const liftAt = (leap: Pick<Leap, "height">, u: number) => {
  const [up, down] = RISE;

  if (u < up) {
    return -0.15 * leap.height * Math.sin((Math.PI * u) / up);
  }

  if (u < down) {
    const w = (u - up) / (down - up);

    return 4 * leap.height * w * (1 - w);
  }

  return -0.2 * leap.height * Math.sin((Math.PI * (u - down)) / (1 - down));
};

/** Whether all its feet are off the ground `u` through a hop. */
export const isAirborne = (u: number) => u > HIND_LIFT && u < FORE_LAND[0];

const foreLandingOf = (leap: Way & Pick<Leap, "height" | "turnTo">, way: Spot, length: number) => {
  const landing = bodyAt(leap, FORE_LAND[0]);
  const high = SHOULDER.y + Math.max(0, liftAt(leap, FORE_LAND[0]));
  const reach = Math.sqrt(Math.max(0, FORE_REACH ** 2 - high ** 2)) - 0.4;
  const gone = Math.hypot(leap.to.x - landing.x, leap.to.z - landing.z);
  const want = length > 0 ? gone / 2 : gone + FORE_REST.x - SHOULDER.x;

  return { ahead: SHOULDER.x + Math.max(-reach, Math.min(reach, want)), at: landing };
};

const landingOf = (leap: Way & Pick<Leap, "height" | "turnTo">, last: boolean) => {
  const { to, turnTo } = leap;

  if (last) {
    const fore = foreLandingOf(leap, { x: Math.cos(turnTo), z: Math.sin(turnTo) }, 0);

    return {
      fore: pairAt(fore.at, turnTo, fore.ahead, FORE_REST.side),
      hind: standing(to, turnTo).hind,
    };
  }

  const length = Math.hypot(to.x - leap.from.x, to.z - leap.from.z);

  const way =
    length > 0
      ? { x: (to.x - leap.from.x) / length, z: (to.z - leap.from.z) / length }
      : { x: 0, z: 0 };

  const fore = foreLandingOf(leap, way, length);
  const hindLanding = bodyAt(leap, HIND_LAND);
  const push = goneBy(leap, HIND_LIFT) * length;

  const hind = {
    x: (hindLanding.x + to.x + way.x * push) / 2,
    z: (hindLanding.z + to.z + way.z * push) / 2,
  };

  return {
    fore: pairAt(fore.at, turnTo, fore.ahead, FORE_REST.side),
    hind: pairAt(hind, turnTo, HIND_REST.x + 0.06 * length, HIND_REST.side),
  };
};

const turnOf = (hopper: Hopper, want: number, most: number) => {
  let toward = wrap(want);
  const behind = Math.abs(toward) > BEHIND;

  if (behind && hopper.turned !== 0 && Math.sign(toward) !== hopper.turned) {
    toward += hopper.turned * Math.PI * 2;
  }

  const limit = behind ? MOST_REVERSE : most;

  return Math.max(-limit, Math.min(limit, toward));
};

const towardOf = (hopper: Hopper, offX: number, offZ: number) => {
  const { heading } = hopper;
  const turn = turnOf(hopper, Math.atan2(offZ, offX) - heading, MOST_TURN);
  const along = offX * Math.cos(heading + turn) + offZ * Math.sin(heading + turn);
  const longest = MOST_LEAP + (MOST_LEAP_DEEP - MOST_LEAP) * Math.abs(Math.sin(heading + turn));
  const length = Math.max(0, Math.min(longest, along));

  return length < LEAST_LEAP && Math.abs(turn) < LEAST_PIVOT
    ? { length: 0, turn: 0 }
    : { length, turn };
};

const secondsOf = (length: number, turn: number) =>
  length === 0
    ? PIVOT_S +
      (REVERSE_S - PIVOT_S) * smooth((Math.abs(turn) - MOST_PIVOT) / (MOST_REVERSE - MOST_PIVOT))
    : 1 / (LEAST_HOPS + (MOST_HOPS - LEAST_HOPS) * smooth(Math.min(1, length / MOST_LEAP)));

/** Whether `face` is far enough round from `heading` that it'd hop round to it. */
export const isPivot = (heading: number, face: number) =>
  Math.abs(wrap(face - heading)) > LEAST_PIVOT;

/**
 * Its next hop toward `target` (null, it's to stay), or, there already, round
 * to `face` (null, whichever way it faces): or null, no hop at all.
 */
export const planLeap = (hopper: Hopper, target: Spot | null, face: number | null) => {
  const { at, heading } = hopper;
  const going = hopper.leap !== null && hopper.leap.end > 0;
  const offX = target ? target.x - at.x : 0;
  const offZ = target ? target.z - at.z : 0;
  const away = Math.hypot(offX, offZ);
  let { length, turn } = { length: 0, turn: 0 };

  if (target && away > (going ? ARRIVED : SET_OFF)) {
    ({ length, turn } = towardOf(hopper, offX, offZ));
  } else if (face !== null && isPivot(heading, face)) {
    turn = turnOf(hopper, face - heading, MOST_PIVOT);
  }

  if (length === 0 && turn === 0) {
    return null;
  }

  const size = Math.min(1, length / MOST_LEAP);
  const last = length >= away - ARRIVED || length === 0;
  const way = { x: Math.cos(heading + turn), z: Math.sin(heading + turn) };

  const leap = {
    end: last ? 0 : ON,
    from: at,
    height: length === 0 ? PIVOT_HEIGHT : PIVOT_HEIGHT + 7 * smooth(size),
    seconds: secondsOf(length, turn),
    size,
    start: going ? ON : 0,
    to: { x: at.x + way.x * length, z: at.z + way.z * length },
    turnFrom: heading,
    turnTo: heading + turn,
  };

  return { ...leap, ...landingOf(leap, last) } satisfies Leap | null;
};

const crossed = (from: number, to: number, mark: number) => from < mark && to >= mark;

/**
 * Steps it `seconds` on through its hops. `plan` plans the hop after (from
 * the hopper as it stands, landed), or says it stays (null).
 */
export const stepHopper = (hopper: Hopper, seconds: number, plan: () => Leap | null) => {
  const beats = { foreLanded: 0, hindLanded: 0, tookOff: 0 };

  if (hopper.leap === null) {
    hopper.leap = plan();
    hopper.u = 0;
  }

  let left = Math.max(0, seconds);

  while (hopper.leap && left > 0) {
    const { leap } = hopper;
    const u = Math.min(1, hopper.u + left / leap.seconds);
    left -= (u - hopper.u) * leap.seconds;

    if (crossed(hopper.u, u, HIND_LIFT)) {
      beats.tookOff = Math.max(beats.tookOff, leap.size + 0.2);
    }

    if (crossed(hopper.u, u, FORE_LAND[0])) {
      beats.foreLanded = Math.max(beats.foreLanded, leap.size + 0.2);
    }

    if (crossed(hopper.u, u, HIND_LAND)) {
      beats.hindLanded = Math.max(beats.hindLanded, leap.size + 0.2);
    }

    hopper.u = u;

    if (u < 1) {
      break;
    }

    hopper.at = leap.to;
    hopper.heading = wrap(leap.turnTo);
    const turned = wrap(leap.turnTo - leap.turnFrom);

    if (Math.abs(turned) > 0.2) {
      hopper.turned = Math.sign(turned);
    }

    hopper.hind = leap.hind;
    hopper.fore = leap.fore;
    hopper.leap = plan();
    hopper.u = 0;
  }

  return beats;
};

/** A foot now: where on the ground, how high off it, which way it points, and how far through its swing (-1 down). */
export interface Footing extends Pin {
  height: number;
  swing: number;
}

const footAt = (pin: Pin, landing: Pin, lift: number, land: number, u: number, height: number) => {
  if (u <= lift) {
    return { ...pin, height: 0, swing: -1 };
  }

  if (u >= land) {
    return { ...landing, height: 0, swing: -1 };
  }

  const w = (u - lift) / (land - lift);
  const e = smooth(w);

  return {
    height: height * 16 * w * w * (1 - w) * (1 - w),
    swing: w,
    turn: pin.turn + wrap(landing.turn - pin.turn) * e,
    x: pin.x + (landing.x - pin.x) * e,
    z: pin.z + (landing.z - pin.z) * e,
  };
};

const pairOf = <T>(pair: Pair, each: (pin: Pin, index: number) => T) =>
  [each(pair[0], 0), each(pair[1], 1)] satisfies readonly [T, T];

const settling = (swing: number) => 1 - smooth((swing - 0.55) / 0.45);

/** Its feet now: its hind feet together, its forepaws one just after the other. */
export const feetOf = (hopper: Hopper) => {
  const { leap, u } = hopper;

  if (!leap) {
    const still = (pin: Pin) => ({ ...pin, height: 0, swing: -1 }) satisfies Footing;

    return { fore: pairOf(hopper.fore, still), hind: pairOf(hopper.hind, still) };
  }

  const body = Math.max(0, liftAt(leap, u));
  const clear = 1 + 1.5 * Math.min(1, leap.size * 3);

  return {
    fore: pairOf(hopper.fore, (pin, index) => {
      const swung = footAt(
        pin,
        leap.fore[index] ?? pin,
        FORE_LIFT[index] ?? 0,
        FORE_LAND[index] ?? 1,
        u,
        clear,
      );

      return {
        ...swung,
        height: swung.swing >= 0 ? swung.height + body * 0.75 * settling(swung.swing) : 0,
      };
    }),
    hind: pairOf(hopper.hind, (pin, index) => {
      const swung = footAt(pin, leap.hind[index] ?? pin, HIND_LIFT, HIND_LAND, u, clear * 1.2);

      return {
        ...swung,
        height: swung.swing >= 0 ? swung.height + body * 0.85 * settling(swung.swing) : 0,
      };
    }),
  };
};

/** Where it is now on the ground, its heading, and its body's rise. */
export const placeOf = (hopper: Hopper) => {
  const { leap, u } = hopper;

  if (!leap) {
    return { at: hopper.at, heading: hopper.heading, lift: 0, size: 0, u: 0 };
  }

  return {
    at: bodyAt(leap, u),
    heading: turnAt(leap, u),
    lift: liftAt(leap, u),
    size: leap.size,
    u,
  };
};
