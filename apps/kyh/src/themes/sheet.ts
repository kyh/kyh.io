// The ghost that follows a mouse about at Halloween, for `ghost.tsx`: a
// dome of a head on a spring that floats after the pointer, bobbing, and
// leans into where it's going, and a sheet hung from it as cloth, strands of
// points stepped by Verlet, held to their lengths and to each other, pulled
// down a little and slowed by the air, so moving it streams the sheet out
// behind and stopping lets it swing back and settle. Drawn in the town's
// hand: a flat face, its side turned from the light shaded, its creases and
// outline in ink. In the screen's pixels, +y down; the paths are about the
// head. Pure (state is stepped in place, for a frame's sake).
import { ellipse, point } from "./art";

interface Point {
  x: number;
  y: number;
}

/** A point of the sheet, where it is and where it was a step ago. */
interface Knot extends Point {
  px: number;
  py: number;
}

export interface Ghost {
  /** The head's middle, and how fast it's going. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** How far it leans, radians clockwise, and how fast that's changing. */
  tilt: number;
  spin: number;
  /** Which way it floats from the pointer: back along the way the pointer came. */
  back: Point;
  /** Strands of the sheet, left to right, each from the head's waist to the hem. */
  sheet: Knot[][];
  /** Seconds it's been about, for its bob and flutter. */
  time: number;
  /** Seconds not yet stepped. */
  owed: number;
}

/** The head's radius. */
export const HEAD = 15;
const STRANDS = 7;
const KNOTS = 5;
/** Pixels between knots down a strand. */
const LINK = 7;
/** Pixels between strands at the waist. */
const SPACING = (2 * HEAD) / (STRANDS - 1);
/** How far from the pointer it floats. */
const BEHIND = 42;
/** The head's spring after the pointer: its pull a pixel, and its damping. */
const PULL = 26;
const DAMP = 7.5;
/** How far it leans into its speed, its most, and its spring. */
const LEAN = 1 / 600;
const MAX_LEAN = 0.5;
const LEAN_PULL = 70;
const LEAN_DAMP = 11;
/** The sheet's weight (pixels a second squared down), light: it's a ghost's. */
const WEIGHT = 620;
/** The air's drag on the sheet, a second: what streams it out behind. */
const AIR = 2.6;
/** The air's flutter on the sheet, pixels a second squared, and its growth with speed. */
const FLUTTER = 90;
const FLUTTER_SPEED = 0.9;
const STEP = 1 / 120;
/** Seconds caught up at most, after a slow frame or a hidden tab. */
const MOST_OWED = 0.1;
const ITERATIONS = 4;
/** How much wider the sheet hangs a knot further down. */
const FLARE = 0.07;
/** Where its shaded side starts, across from its middle. */
const SPLIT = 5;

const rotate = (x: number, y: number, angle: number): Point => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

/** Where strand `index` is tied to the head's waist. */
const waist = (ghost: Ghost, index: number): Point => {
  const at = rotate(-HEAD + index * SPACING, 0, ghost.tilt);
  return { x: ghost.x + at.x, y: ghost.y + at.y };
};

export const createGhost = (at: Point): Ghost => {
  const back = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
  const x = at.x + back.x * BEHIND;
  const y = at.y + back.y * BEHIND;
  const ghost: Ghost = { back, owed: 0, sheet: [], spin: 0, tilt: 0, time: 0, vx: 0, vy: 0, x, y };
  ghost.sheet = Array.from({ length: STRANDS }, (_, index) => {
    const top = waist(ghost, index);
    return Array.from({ length: KNOTS }, (_unused, knot) => {
      const ky = top.y + knot * LINK;
      return { px: top.x, py: ky, x: top.x, y: ky };
    });
  });
  return ghost;
};

/** Each item and the one after it. */
const pairs = <T>(items: readonly T[]) =>
  items.flatMap((item, index) => {
    const next = items[index + 1];
    return next === undefined ? [] : [[item, next] as const];
  });

/** Pulls two knots to `length` apart, or within `[short, long]`; a pinned one doesn't move. */
const hold = (a: Knot, b: Knot, short: number, long: number, pinned: boolean) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = Math.hypot(dx, dy) || 1e-6;
  const length = Math.min(long, Math.max(short, reach));
  if (length === reach) {
    return;
  }
  const off = (reach - length) / reach;
  if (pinned) {
    b.x -= dx * off;
    b.y -= dy * off;
    return;
  }
  b.x -= (dx * off) / 2;
  b.y -= (dy * off) / 2;
  a.x += (dx * off) / 2;
  a.y += (dy * off) / 2;
};

const tick = (ghost: Ghost, pointer: Point) => {
  const dt = STEP;
  ghost.time += dt;
  const t = ghost.time;
  // The head: after its spot behind the pointer, bobbing on the air.
  const goalX = pointer.x + ghost.back.x * BEHIND + Math.sin(t * 1.1) * 2;
  const goalY = pointer.y + ghost.back.y * BEHIND + Math.sin(t * 1.9) * 3.5;
  ghost.vx += (PULL * (goalX - ghost.x) - DAMP * ghost.vx) * dt;
  ghost.vy += (PULL * (goalY - ghost.y) - DAMP * ghost.vy) * dt;
  ghost.x += ghost.vx * dt;
  ghost.y += ghost.vy * dt;
  // Leaning into it, a rising head tipping back less than a sideways one.
  const lean = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, ghost.vx * LEAN)) + Math.sin(t * 1.3) * 0.05;
  ghost.spin += (LEAN_PULL * (lean - ghost.tilt) - LEAN_DAMP * ghost.spin) * dt;
  ghost.tilt += ghost.spin * dt;

  // The sheet: carried on, slowed by the air, weighed down, fluttering across.
  const speed = Math.hypot(ghost.vx, ghost.vy);
  const across = rotate(1, 0, ghost.tilt);
  const keep = 1 - AIR * dt;
  for (const [index, strand] of ghost.sheet.entries()) {
    for (const [knot, k] of strand.entries()) {
      if (knot === 0) {
        continue;
      }
      const flutter =
        (FLUTTER + speed * FLUTTER_SPEED) *
        (knot / KNOTS) *
        Math.sin(t * 7 - knot * 0.9 + index * 0.75);
      const vx = (k.x - k.px) * keep;
      const vy = (k.y - k.py) * keep;
      k.px = k.x;
      k.py = k.y;
      k.x += vx + across.x * flutter * dt * dt;
      k.y += vy + (WEIGHT + across.y * flutter) * dt * dt;
    }
  }
  for (let round = 0; round < ITERATIONS; round += 1) {
    let before: Knot[] | null = null;
    for (const [index, strand] of ghost.sheet.entries()) {
      const top = waist(ghost, index);
      for (const [knot, [a, b]] of pairs(strand).entries()) {
        if (knot === 0) {
          Object.assign(a, { px: top.x, py: top.y, x: top.x, y: top.y });
        }
        hold(a, b, LINK, LINK, knot === 0);
      }
      // Neighbouring strands keep to the sheet, flaring toward the hem: they bunch, but don't part.
      for (const [knot, k] of strand.entries()) {
        const beside = before?.[knot];
        if (knot > 0 && beside) {
          const flare = 1 + FLARE * knot;
          hold(beside, k, SPACING * 0.8 * flare, SPACING * 1.25 * flare, false);
        }
      }
      before = strand;
    }
  }
};

/**
 * Steps it `seconds` on, in fixed steps, after the pointer; the pointer's
 * own move (`moved`, pixels) turns which side of it the ghost floats.
 */
export const stepGhost = (ghost: Ghost, pointer: Point, moved: Point, seconds: number) => {
  const reach = Math.hypot(moved.x, moved.y);
  if (reach > 0.5) {
    // Back along the way the pointer came, turning a little at a time.
    const turn = Math.min(1, reach / 60);
    const x = ghost.back.x * (1 - turn) - (moved.x / reach) * turn;
    const y = ghost.back.y * (1 - turn) - (moved.y / reach) * turn;
    const length = Math.hypot(x, y) || 1;
    ghost.back = { x: x / length, y: y / length };
  }
  ghost.owed = Math.min(MOST_OWED, ghost.owed + seconds);
  while (ghost.owed >= STEP) {
    ghost.owed -= STEP;
    tick(ghost, pointer);
  }
};

/** The hem's ends: the last knot of each strand. */
export const hemOf = (ghost: Ghost) => ghost.sheet.flatMap((strand) => strand.slice(-1));

export interface GhostPaths {
  /** The whole of it, head and sheet: its face and its outline. */
  body: string;
  /** Its side turned from the light: the right of the head and of the sheet. */
  shade: string;
  /** Folds down the sheet, in ink. */
  creases: string;
  /** Its eyes and its mouth. */
  face: string;
}

/** A smooth line on through points (from wherever the path is), about `at`. */
const through = (points: readonly Point[], at: Point) => {
  const p = (q: Point) => point(q.x - at.x, q.y - at.y);
  const curves = pairs(points).map(([a, b], index) => {
    const middle = p({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    return index === 0 ? `L${middle}` : `Q${p(a)} ${middle}`;
  });
  const last = points.at(-1);
  return curves.join("") + (last ? `L${p(last)}` : "");
};

/** How far a lobe of the hem hangs between its tips. */
const SAG = 4.5;

/** The hem, scalloped: a rounded lobe hanging between each pair of tips, run right to left. */
const hem = (tips: readonly Point[], at: Point) =>
  pairs(tips)
    .map(([a, b]) => {
      // Out from the line of the hem, away from the head.
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const control = point(
        (a.x + b.x) / 2 + (dy / length) * SAG - at.x,
        (a.y + b.y) / 2 - (dx / length) * SAG - at.y,
      );
      return `Q${control} ${point(b.x - at.x, b.y - at.y)}`;
    })
    .join("");

/** How open its eyes are, now: a blink every few seconds. */
const blink = (time: number) => (time % 4.3 < 0.14 ? 0.15 : 1);

/** Its paths about the head's middle, for an <svg> moved there. */
export const ghostPaths = (ghost: Ghost): GhostPaths => {
  const at = { x: ghost.x, y: ghost.y };
  const local = (x: number, y: number) => {
    const turned = rotate(x, y, ghost.tilt);
    return point(turned.x, turned.y);
  };
  const strands = ghost.sheet;
  const [left = []] = strands;
  const right = strands.at(-1) ?? [];
  const middle = Math.floor(STRANDS / 2);
  const tips = hemOf(ghost);
  const arc = `A${HEAD} ${HEAD} 0 0 1`;

  const body =
    `M${local(-HEAD, 0)}${arc} ${local(HEAD, 0)}${through(right, at)}` +
    `${hem(tips.toReversed(), at)}${through(left.toReversed(), at)}Z`;
  const splitX = SPLIT * SPACING - HEAD;
  const shade =
    `M${local(splitX, -Math.sqrt(HEAD ** 2 - splitX ** 2))}${arc} ${local(HEAD, 0)}${through(right, at)}` +
    `${hem(tips.slice(SPLIT).toReversed(), at)}` +
    `${through((strands[SPLIT] ?? []).toReversed(), at)}Z`;
  // The folds either side of the middle, from just below the waist to above the hem.
  const creases = strands
    .filter((_, index) => index > 0 && index < STRANDS - 1 && index !== middle)
    .map((strand) => `M${through(strand.slice(1, -1), at).slice(1)}`)
    .join("");

  // Looking where it's going, and blinking now and then.
  const lookX = Math.max(-2, Math.min(2, ghost.vx / 150));
  const lookY = Math.max(-1.5, Math.min(1.5, ghost.vy / 150));
  const open = blink(ghost.time);
  const degrees = (ghost.tilt * 180) / Math.PI;
  const eye = (x: number) => {
    const c = rotate(x + lookX, -3.5 + lookY, ghost.tilt);
    return ellipse(c.x, c.y, 1.9, 3 * open, degrees);
  };
  const mouth = rotate(lookX * 0.6, 4 + lookY * 0.6, ghost.tilt);
  const face = eye(-5) + eye(5) + ellipse(mouth.x, mouth.y, 1.6, 2.2, degrees);
  return { body, creases, face, shade };
};
