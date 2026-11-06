// How the bunny gets about, for `bunny.ts`: a hop at a time, each one planned
// as it lands from the last. A hop runs from where it is to where it'll land,
// its heading from the way it faces to the way it'll face; it gathers, pushes
// off its hind feet, flies (the only time it turns, and at one speed, as a
// thing in the air does), lands on its forepaws, one just before the other,
// and brings its hind feet down ahead of them. Each foot is set down on a spot
// of the ground chosen when the hop's planned and stays there until it lifts,
// so however it turns or stops, no foot ever slides. Its last hop lands it
// just where it was going; to turn about where it stands it takes little hops
// round. On the ground: x across the screen, z toward the camera (the screen's
// down stretched back out of its foreshortening, as `../follower/solid.ts`
// has the world), in the bunny's own pixels. Pure (state is stepped in place,
// for a frame's sake).
import { smooth } from "../follower/solid";

/** A spot on the ground. */
export interface Spot {
  x: number;
  z: number;
}

/** A foot set down: where (its toe, or its paw), and which way it points. */
export interface Pin extends Spot {
  turn: number;
}

/** A pair of feet: its left, its right. */
export type Pair = readonly [Pin, Pin];

export interface Leap {
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
export const FORE_REST = { side: 2.3, x: 7.6 } as const;

/** When in a hop: its forepaws lift (left, right), its hind feet push off, its forepaws land, its hind feet land. */
export const FORE_LIFT = [0.04, 0.08] as const;
export const HIND_LIFT = 0.26;
export const FORE_LAND = [0.58, 0.62] as const;
export const HIND_LAND = 0.84;
/** Its body's rise: from as it straightens to push off, till its forepaws have taken it. */
const RISE = [0.1, 0.6] as const;
/** Its speed through a hop, as a share of its speed in the air: slow gathered, fastest flying. */
const PACE: readonly (readonly [number, number])[] = [
  [0.12, 0.3],
  [HIND_LIFT, 1],
  [FORE_LAND[0], 1],
  // Its forepaws down, it brakes on them hard.
  [0.66, 0.2],
  [HIND_LAND, 0.1],
];
/** Its speed, between hops it goes straight on into, as a share of its speed in the air. */
const ON = 0.08;

/**
 * Its longest hop over the ground across the screen, and toward or away from
 * the camera (foreshortened, so a longer hop that way looks no longer); its
 * shortest worth hopping; and nearer than this, it's there.
 */
export const MOST_LEAP = 60;
const MOST_LEAP_DEEP = 70;
const LEAST_LEAP = 5;
const ARRIVED = 9;
/** Its hops a second: a little hop, a long bound. */
const LEAST_HOPS = 2.8;
const MOST_HOPS = 4.2;
/** The most it turns in a hop, going, and hopping round where it stands; and the least worth a hop round. */
const MOST_TURN = 1.2;
const MOST_PIVOT = 1.1;
export const LEAST_PIVOT = 0.5;
const PIVOT_S = 0.3;
/** Turning right round (what it's after is behind it), how far it turns in one hop, and the hop's length in seconds. */
const BEHIND = (2 * Math.PI) / 3;
const MOST_REVERSE = 1.7;
const REVERSE_S = 0.36;
/** How far off it must be to set off from a stand: nearer, it waits, then goes in one hop. */
export const SET_OFF = 25;
const PIVOT_HEIGHT = 2.5;

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** A point about the bunny (x forward, z to its left) on the ground, it at `at` heading `turn`. */
export const groundAt = (at: Spot, turn: number, forward: number, left: number): Spot => ({
  x: at.x + forward * Math.cos(turn) - left * Math.sin(turn),
  z: at.z + forward * Math.sin(turn) + left * Math.cos(turn),
});

/** A pair of feet set down about `at` heading `turn`, `forward` of it and `side` out to either side. */
const pairAt = (at: Spot, turn: number, forward: number, side: number): Pair => [
  { ...groundAt(at, turn, forward, side), turn },
  { ...groundAt(at, turn, forward, -side), turn },
];

/** Its feet at rest about where it stands. */
const standing = (at: Spot, turn: number) => ({
  fore: pairAt(at, turn, FORE_REST.x, FORE_REST.side),
  hind: pairAt(at, turn, HIND_REST.x, HIND_REST.side),
});

export const createHopper = (at: Spot, heading: number): Hopper => ({
  ...standing(at, heading),
  at,
  heading,
  leap: null,
  turned: 0,
  u: 0,
});

/** The ground a hop covers, and how fast it sets off and lands. */
type Way = Pick<Leap, "end" | "from" | "start" | "to">;

/** The share of a hop's way it's gone by `u`: its speed's run, added up. */
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

/** Where its body is on the ground `u` through a hop. */
export const bodyAt = (leap: Way, u: number): Spot => {
  const gone = goneBy(leap, u);
  return {
    x: leap.from.x + (leap.to.x - leap.from.x) * gone,
    z: leap.from.z + (leap.to.z - leap.from.z) * gone,
  };
};

/** When in a hop it turns: from the end of its push, on its toes, till its forepaws land. */
export const TURNING = [0.18, FORE_LAND[0]] as const;

/** Its heading `u` through a hop: it turns only with its forepaws up, pushing off on its toes and flying. */
export const turnAt = (leap: Leap, u: number) =>
  leap.turnFrom +
  wrap(leap.turnTo - leap.turnFrom) * smooth((u - TURNING[0]) / (TURNING[1] - TURNING[0]));

/** How high its body is `u` through a hop: crouched to push off, up in an arc, down taking the landing. */
export const liftAt = (leap: Pick<Leap, "height">, u: number) => {
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

/**
 * Where its forepaws land (`at`, and how far `ahead` of it, along its way):
 * within reach of its shoulders as they come down, and, as its body goes on
 * over them, as far ahead of them landing as they're left behind lifting. A
 * last hop's land as near where they'll stand as they reach.
 */
const foreLandingOf = (leap: Way & Pick<Leap, "height" | "turnTo">, way: Spot, length: number) => {
  const landing = bodyAt(leap, FORE_LAND[0]);
  const high = SHOULDER.y + Math.max(0, liftAt(leap, FORE_LAND[0]));
  const reach = Math.sqrt(Math.max(0, FORE_REACH ** 2 - high ** 2)) - 0.4;
  // Going on, half its way on the ground; stopping, where its paws will stand.
  const gone = Math.hypot(leap.to.x - landing.x, leap.to.z - landing.z);
  const want = length > 0 ? gone / 2 : gone + FORE_REST.x - SHOULDER.x;
  return { ahead: SHOULDER.x + Math.max(-reach, Math.min(reach, want)), at: landing };
};

/** Where it'd land its feet, a hop from `from` to `to` heading `turn`: just as it stands, a last hop; else its hind feet ahead, bounding. */
const landingOf = (leap: Way & Pick<Leap, "height" | "turnTo">, last: boolean) => {
  const { to, turnTo } = leap;
  if (last) {
    // Its hind feet just as it'll stand; its forepaws as near that as they reach, landing.
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
  // Each foot set down where its body will be halfway through its time on the ground (so it's as far
  // ahead landing as it's left behind lifting): its forepaws from their landing to the end of the hop,
  // its hind feet into the next, as far again as this one's push; its hind feet a little ahead besides, bounding.
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

/** Its turn and hop toward what's `off` it (x, z): turning more than it hops, right round the way it's been turning. */
/**
 * How far it turns this hop toward `want` (radians from its heading), at most
 * `most`: what it's after behind it, it turns right round, further, and the way
 * it's been turning, not back and forth.
 */
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

/** How long a hop takes: a hop round where it stands, longer turning right round; a hop on, quicker the longer. */
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
export const planLeap = (hopper: Hopper, target: Spot | null, face: number | null): Leap | null => {
  const { at, heading } = hopper;
  const going = hopper.leap !== null && hopper.leap.end > 0;
  const offX = target ? target.x - at.x : 0;
  const offZ = target ? target.z - at.z : 0;
  const away = Math.hypot(offX, offZ);
  let { length, turn } = { length: 0, turn: 0 };
  // Setting off from a stand it waits till it's a hop's worth away; going, it goes on till it's there.
  if (target && away > (going ? ARRIVED : SET_OFF)) {
    ({ length, turn } = towardOf(hopper, offX, offZ));
  } else if (face !== null && isPivot(heading, face)) {
    turn = turnOf(hopper, face - heading, MOST_PIVOT);
  }
  if (length === 0 && turn === 0) {
    return null;
  }
  const size = Math.min(1, length / MOST_LEAP);
  // It goes on into another hop unless this one gets it there.
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
  return { ...leap, ...landingOf(leap, last) };
};

/** What happened over a step: it took off, its forepaws or hind feet landed (how big the hop was). */
export interface Beats {
  tookOff: number;
  foreLanded: number;
  hindLanded: number;
}

const crossed = (from: number, to: number, mark: number) => from < mark && to >= mark;

/**
 * Steps it `seconds` on through its hops. `plan` plans the hop after (from
 * the hopper as it stands, landed), or says it stays (null).
 */
export const stepHopper = (hopper: Hopper, seconds: number, plan: () => Leap | null): Beats => {
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
    // Landed: it stands where it came down, and plans on.
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

/** A foot `u` through a hop, from where it was set down to where it lands, lifting between. */
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
    // Lifted and set down softly: no speed up or down as it leaves the ground or touches it.
    height: height * 16 * w * w * (1 - w) * (1 - w),
    swing: w,
    turn: pin.turn + wrap(landing.turn - pin.turn) * e,
    x: pin.x + (landing.x - pin.x) * e,
    z: pin.z + (landing.z - pin.z) * e,
  };
};

/** A pair's each foot, made something else. */
const pairOf = <T>(pair: Pair, each: (pin: Pin, index: number) => T): readonly [T, T] => [
  each(pair[0], 0),
  each(pair[1], 1),
];

/** How much of its body's rise a swinging foot is carried up by: all of it, coming down to none as it touches down. */
const settling = (swing: number) => 1 - smooth((swing - 0.55) / 0.45);

/** Its feet now: its hind feet together, its forepaws one just after the other. */
export const feetOf = (hopper: Hopper) => {
  const { leap, u } = hopper;
  if (!leap) {
    const still = (pin: Pin): Footing => ({ ...pin, height: 0, swing: -1 });
    return { fore: pairOf(hopper.fore, still), hind: pairOf(hopper.hind, still) };
  }
  // Swinging, they're carried up with its body as it flies, and lifted clear besides.
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
