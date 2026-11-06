// A follower's floppy bits, after the ghost's sheet (`halloween/sheet.ts`): a
// chain of points stepped by Verlet from a root pinned to the body, each link
// held to its length, each point pulled back toward where it hangs at rest
// (shape matching, hard at the root and soft at the tip), its weight, and the
// air pushing on each link along its normal as the square of how fast the
// link meets it (and rubbing along it, gently). So a bunny's ears, a scarf's
// end, a snood, a coat's tails or a tail stream out behind a move, billow
// and swing back when it stops, and settle where they hang. In the screen's
// pixels, +y down, absolute (so the body's own move is what the air meets).
// Stepped at a fixed rate whatever the frame rate. Pure (state is stepped in
// place, for a frame's sake).

export interface Point {
  x: number;
  y: number;
}

/** A point of the chain, where it is and where it was a step ago. */
interface Knot extends Point {
  px: number;
  py: number;
}

export interface Chain {
  /** The root first, pinned; then each knot out to the tip. */
  knots: Knot[];
  /** Seconds not yet stepped. */
  owed: number;
}

/** Where a chain hangs this frame: its root, and each knot after it at rest, from the root. */
export interface Hang {
  root: Point;
  /** One per knot after the root, root to tip; their count fixes the chain's. */
  rest: readonly Point[];
}

/** What a chain's made of. */
export interface Stuff {
  /** How hard a knot goes back to its rest, a step: at the root's end, and at the tip. */
  keep: number;
  keepTip: number;
  /** Its weight, pixels a second squared down. */
  weight: number;
  /** The air's push per (pixel a second)² met head on; and its rub along the links, a second. */
  drag: number;
  rub: number;
  /** How fast its own swinging dies away, a second: the stuff's give, not the air's. */
  damp: number;
}

/** Stiff, flicking back quickly: a bunny's ear, a beak's wattle. */
export const SPRINGY: Stuff = {
  damp: 14,
  drag: 0.006,
  keep: 0.05,
  keepTip: 0.015,
  rub: 0.4,
  weight: 0,
};
/** Cloth: a scarf's end, a coat's tails, a ribbon. */
export const CLOTH: Stuff = {
  damp: 5,
  drag: 0.012,
  keep: 0.06,
  keepTip: 0.004,
  rub: 0.6,
  weight: 420,
};
/** Flesh that hangs and jiggles: a snood, a beard. */
export const FLOPPY: Stuff = {
  damp: 9,
  drag: 0.006,
  keep: 0.1,
  keepTip: 0.02,
  rub: 0.5,
  weight: 300,
};

const STEP = 1 / 120;
/** Seconds caught up at most, after a slow frame or a hidden tab. */
const MOST_OWED = 0.1;
/** The speed past which the push grows only as the speed: a fling can't tear it. */
const MOST_MET = 500;
const ITERATIONS = 4;
/** The farthest its root goes in one frame before it's laid out afresh: a leap, not a move. */
const MOST_LEAP = 120;

const restAt = (hang: Hang, index: number): Point => {
  const rest = index === 0 ? { x: 0, y: 0 } : (hang.rest[index - 1] ?? { x: 0, y: 0 });
  return { x: hang.root.x + rest.x, y: hang.root.y + rest.y };
};

export const createChain = (hang: Hang): Chain => ({
  knots: Array.from({ length: hang.rest.length + 1 }, (_, index) => {
    const { x, y } = restAt(hang, index);
    return { px: x, py: y, x, y };
  }),
  owed: 0,
});

/** The chain's link lengths at rest this frame, root to tip. */
const linksOf = (hang: Hang) =>
  hang.rest.map((rest, index) => {
    const before = index === 0 ? { x: 0, y: 0 } : (hang.rest[index - 1] ?? rest);
    return Math.hypot(rest.x - before.x, rest.y - before.y);
  });

/** One Verlet step: the root to its place, the rest moved on, then pulled to their rest and held to their lengths. */
const stepOnce = (
  chain: Chain,
  hang: Hang,
  stuff: Stuff,
  root: Point,
  links: readonly number[],
) => {
  const { knots } = chain;
  const last = knots.length - 1;
  const [first] = knots;
  // How fast the root goes this step: its swinging about the root is what dies away.
  let rvx = 0;
  let rvy = 0;
  if (first) {
    rvx = (root.x - first.x) / STEP;
    rvy = (root.y - first.y) / STEP;
    first.px = first.x;
    first.py = first.y;
    first.x = root.x;
    first.y = root.y;
  }
  const give = Math.min(1, stuff.damp * STEP);
  for (let index = 1; index <= last; index += 1) {
    const knot = knots[index];
    const before = knots[index - 1];
    if (!knot || !before) {
      continue;
    }
    const vx = (knot.x - knot.px) / STEP - ((knot.x - knot.px) / STEP - rvx) * give;
    const vy = (knot.y - knot.py) / STEP - ((knot.y - knot.py) / STEP - rvy) * give;
    // The air on this knot's link: pushed along the link's normal as the square of how fast it meets it.
    const length = Math.hypot(knot.x - before.x, knot.y - before.y) || 1;
    const tx = (knot.x - before.x) / length;
    const ty = (knot.y - before.y) / length;
    const along = vx * tx + vy * ty;
    const nx = vx - along * tx;
    const ny = vy - along * ty;
    const met = Math.hypot(nx, ny);
    const push = stuff.drag * Math.min(met, MOST_MET);
    const ax = -push * nx - stuff.rub * along * tx;
    const ay = -push * ny - stuff.rub * along * ty + stuff.weight;
    knot.px = knot.x;
    knot.py = knot.y;
    knot.x += vx * STEP + ax * STEP * STEP;
    knot.y += vy * STEP + ay * STEP * STEP;
    // Back toward where it hangs at rest about the root: hard near the root, soft at the tip.
    const keep = stuff.keep + (stuff.keepTip - stuff.keep) * (index / last);
    // About where the root is this step, not where it ends the frame: else the tip's pulled ahead.
    const rest = restAt({ rest: hang.rest, root }, index);
    knot.x += (rest.x - knot.x) * keep;
    knot.y += (rest.y - knot.y) * keep;
  }
  // Each link to its length, root outward: the root is pinned, so the outer knot moves.
  for (let round = 0; round < ITERATIONS; round += 1) {
    for (let index = 1; index <= last; index += 1) {
      const knot = knots[index];
      const before = knots[index - 1];
      const length = links[index - 1] ?? 0;
      if (!knot || !before) {
        continue;
      }
      const dx = knot.x - before.x;
      const dy = knot.y - before.y;
      const distance = Math.hypot(dx, dy) || 1;
      const off = (distance - length) / distance;
      if (index === 1) {
        knot.x -= dx * off;
        knot.y -= dy * off;
      } else {
        knot.x -= dx * off * 0.5;
        knot.y -= dy * off * 0.5;
        before.x += dx * off * 0.5;
        before.y += dy * off * 0.5;
      }
    }
  }
};

/**
 * Steps a chain `seconds` on, its root carried to `hang.root` over them (so a
 * long frame's move isn't one jump). A hang with a different number of knots
 * starts the chain afresh.
 */
export const stepChain = (chain: Chain, hang: Hang, stuff: Stuff, seconds: number) => {
  if (chain.knots.length !== hang.rest.length + 1) {
    Object.assign(chain, createChain(hang));
    return;
  }
  // Carried farther in one frame than it could swing (back from a hidden tab), it's laid out afresh, not whipped.
  const [was] = chain.knots;
  if (was && Math.hypot(hang.root.x - was.x, hang.root.y - was.y) > MOST_LEAP) {
    Object.assign(chain, createChain(hang));
    return;
  }
  chain.owed = Math.min(chain.owed + Math.max(0, seconds), MOST_OWED);
  const steps = Math.floor(chain.owed / STEP);
  if (steps === 0) {
    return;
  }
  chain.owed -= steps * STEP;
  const from = chain.knots[0] ?? hang.root;
  const start = { x: from.x, y: from.y };
  const links = linksOf(hang);
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const root = {
      x: start.x + (hang.root.x - start.x) * t,
      y: start.y + (hang.root.y - start.y) * t,
    };
    stepOnce(chain, hang, stuff, root, links);
  }
};

/** The chain's points, root to tip, about `origin` (the stage's, so a pose can draw them), in a drawing scaled by `size`. */
export const chainAbout = (chain: Chain, origin: Point, size = 1): Point[] =>
  chain.knots.map((knot) => ({ x: (knot.x - origin.x) / size, y: (knot.y - origin.y) / size }));

/** How far, and which way, the tip's been carried from where it hangs at rest: for a part drawn as one piece (an ear's swing). */
export const swayOf = (chain: Chain, hang: Hang): Point => {
  const tip = chain.knots.at(-1);
  if (!tip) {
    return { x: 0, y: 0 };
  }
  const rest = restAt(hang, chain.knots.length - 1);
  return { x: tip.x - rest.x, y: tip.y - rest.y };
};

/**
 * A hang from where a chain lies at rest this frame, root first, about the
 * stage's `origin`: as a pose projects it. `size` is the stage's, for a
 * follower drawn scaled: the chain itself lives in the screen's pixels.
 */
export const hangOf = (points: readonly Point[], origin: Point, size = 1): Hang => {
  const [root = { x: 0, y: 0 }, ...rest] = points;
  return {
    rest: rest.map((point) => ({ x: (point.x - root.x) * size, y: (point.y - root.y) * size })),
    root: { x: origin.x + root.x * size, y: origin.y + root.y * size },
  };
};

/** A knock to a chain, pixels a second, felt more toward its tip: a gobble's shake, a poke. */
export const flickChain = (chain: Chain, by: Point) => {
  const last = chain.knots.length - 1;
  for (const [index, knot] of chain.knots.entries()) {
    if (index > 0) {
      const share = index / last;
      knot.px -= by.x * share * STEP;
      knot.py -= by.y * share * STEP;
    }
  }
};

const fixed = (n: number) => Math.round(n * 100) / 100;

/** The chain as a smooth path about `origin` (in a drawing scaled by `size`): through the middle of each pair of links, root to tip. */
export const chainPath = (chain: Chain, origin: Point, size = 1) => {
  const points = chainAbout(chain, origin, size);
  const [first, ...others] = points;
  if (!first) {
    return "";
  }
  let d = `M${fixed(first.x)} ${fixed(first.y)}`;
  for (const [index, point] of others.entries()) {
    const next = others[index + 1];
    d += next
      ? `Q${fixed(point.x)} ${fixed(point.y)} ${fixed((point.x + next.x) / 2)} ${fixed((point.y + next.y) / 2)}`
      : `L${fixed(point.x)} ${fixed(point.y)}`;
  }
  return d;
};
