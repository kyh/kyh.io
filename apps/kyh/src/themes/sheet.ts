// The ghost that follows a mouse about at Halloween, for `ghost.tsx`, as a
// soft body after saharan's bubbles: its outline is the body, a closed loop
// of points stepped by Verlet, each edge held to its length, the area inside
// held by pressure, and every point pulled back toward the ghost's shape
// (shape matching), hard at the head and barely at the hem. The pointer
// pulls only the head; the air pushes on each bit of the outline along its
// normal, as the square of how fast that bit meets it. So a move flattens
// the face it moves into and streams and billows the hem behind, and the
// drag on the hem tips the head over into the move; stopping, the hem swings
// back under and settles. In the screen's pixels, +y down; the paths are
// about the head. Pure (state is stepped in place, for a frame's sake).
import type { FacePaths, Mood } from "./face";
import { point } from "./art";
import { createMood, facePaths, stepMood } from "./face";

interface Point {
  x: number;
  y: number;
}

/** A point of the outline, where it is and where it was a step ago. */
interface Knot extends Point {
  px: number;
  py: number;
}

/** A point of the outline at rest, about the head's middle, and how hard it keeps to it. */
interface Rest extends Point {
  /** 0 to 1: the head's points 1, the hem's near 0. */
  hold: number;
}

export interface Ghost {
  /** The outline, round clockwise from the left of the head's waist. */
  knots: Knot[];
  /** The head's middle (where the head's points put it), how fast it's going, and how far it's turned. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  /** Which way it floats from the pointer: back along the way the pointer came. */
  back: Point;
  /** Seconds it's been about, for its bob and flutter. */
  time: number;
  /** Seconds not yet stepped. */
  owed: number;
  /** What its face shows (`face.ts`). */
  mood: Mood;
}

/** The head's radius. */
export const HEAD = 15;
/** How far the sheet hangs below the head's middle, to the hem's cusps. */
const DROP = 26;
/** How much wider than the head the hem hangs. */
const FLARE = 2.5;
const LOBES = 4;
/** How far each lobe of the hem hangs below its cusps (drawn, not stepped: too fine for the cloth). */
const LOBE = 4;
/** Pixels between points of the outline. */
const SPACING = 3;

/** How far from the pointer it floats. */
const BEHIND = 42;
/** The head's spring after the pointer: its pull a pixel, and its damping. */
const PULL = 70;
const DAMP = 12;
/** Its hardest pull, pixels a second squared: a ghost, however chased, has a top speed. */
const MOST_PULL = 5000;
/** How hard each point goes back to its place in the shape, a step: the head's, the hem's. */
const KEEP_HEAD = 0.35;
const KEEP_HEM = 0.003;
/** How far it can lean, and how hard it's righted, a step: the head floats, the hem hangs. */
const MAX_LEAN = 0.6;
const UPRIGHT = 0.05;
/** How hard the area inside is kept, a step. */
const PRESSURE = 0.5;
/** The air's push on the outline, per (pixel a second)² met head on; and its rub along it, a second. */
const DRAG = 0.014;
const RUB = 0.6;
/** The speed past which the push grows only as the speed: a fling can't tear the cloth. */
const MOST_MET = 500;
/** The sheet's weight (pixels a second squared down), light: it's a ghost's. */
const WEIGHT = 380;
/** The air's flutter on the hem, pixels a second squared, and its growth with speed. */
const FLUTTER = 160;
const FLUTTER_SPEED = 1.4;
const STEP = 1 / 120;
/** How fast it slows (pixels a second, a second) before it feels brought up short. */
const JOLT = 3000;
/** Seconds caught up at most, after a slow frame or a hidden tab. */
const MOST_OWED = 0.1;
const ITERATIONS = 8;
/** Where its shaded side starts, right of its middle. */
const SPLIT = 4;

const rotate = (x: number, y: number, angle: number): Point => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

/** Each item and the one after it, round: the last with the first. */
const round = <T>(items: readonly T[]) =>
  items.flatMap((item, index) => {
    const next = items[(index + 1) % items.length];
    return next === undefined ? [] : [[item, next] as const];
  });

const sumOf = (numbers: readonly number[]) => {
  let sum = 0;
  for (const n of numbers) {
    sum += n;
  }
  return sum;
};

/** The ghost's outline drawn finely: the dome, down its right side, the hem right to left, up its left. */
const sketch = (): Point[] => {
  const points: Point[] = [];
  for (let step = 0; step <= 48; step += 1) {
    const angle = Math.PI + (step / 48) * Math.PI;
    points.push({ x: HEAD * Math.cos(angle), y: HEAD * Math.sin(angle) });
  }
  const hem = HEAD + FLARE;
  for (let step = 1; step <= 24; step += 1) {
    const t = step / 24;
    points.push({ x: HEAD + FLARE * t * t, y: DROP * t });
  }
  for (let step = 1; step <= 64; step += 1) {
    const t = step / 64;
    points.push({ x: hem - 2 * hem * t, y: DROP });
  }
  for (let step = 1; step < 24; step += 1) {
    const t = 1 - step / 24;
    points.push({ x: -HEAD - FLARE * t * t, y: DROP * t });
  }
  return points;
};

/** The outline at rest, every `SPACING` pixels round it, each point's hold on its place. */
const REST: readonly Rest[] = (() => {
  const fine = sketch();
  const lengths = round(fine).map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y));
  const whole = sumOf(lengths);
  const count = Math.round(whole / SPACING);
  const rest: Rest[] = [];
  let walked = 0;
  let segment = 0;
  for (let index = 0; index < count; index += 1) {
    const at = (index / count) * whole;
    while (walked + (lengths[segment] ?? 0) < at) {
      walked += lengths[segment] ?? 0;
      segment += 1;
    }
    const a = fine[segment] ?? { x: 0, y: 0 };
    const b = fine[(segment + 1) % fine.length] ?? a;
    const t = (at - walked) / (lengths[segment] || 1);
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    // Hard down to just below the waist, then softer and softer to the hem.
    const down = Math.min(1, Math.max(0, (y + 2) / (DROP + 2)));
    rest.push({ hold: (1 - down) ** 3, x, y });
  }
  return rest;
})();

/** Where the head's points sit at rest, about the head's middle: their weighted middle. */
const REST_MIDDLE = (() => {
  let x = 0;
  let y = 0;
  let weight = 0;
  for (const rest of REST) {
    x += rest.x * rest.hold;
    y += rest.y * rest.hold;
    weight += rest.hold;
  }
  return { x: x / weight, y: y / weight };
})();

/** The edges' lengths at rest, each point to the next round, and to the one after that. */
const LINKS = round(REST).map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y));
const SPANS = REST.map((a, index) => {
  const b = REST[(index + 2) % REST.length] ?? a;
  return Math.hypot(b.x - a.x, b.y - a.y);
});

/** The area inside a loop, positive clockwise on the screen. */
const areaOf = (points: readonly Point[]) => {
  let area = 0;
  for (const [a, b] of round(points)) {
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
};
const REST_AREA = areaOf(REST);
const PERIMETER = sumOf(LINKS);
/** The lift on the head's points that floats the hem's weight, so it hangs and doesn't sink. */
const LIFT =
  (WEIGHT * sumOf(REST.map((rest) => 1 - rest.hold))) / sumOf(REST.map((rest) => rest.hold));

export const POINTS = REST.length;

/** The hem's cusps, right to left as the outline runs: the points nearest where each falls at rest. */
const CUSPS = Array.from({ length: LOBES + 1 }, (_, cusp) => {
  const x = (HEAD + FLARE) * (1 - (2 * cusp) / LOBES);
  let nearest = 0;
  for (const [index, rest] of REST.entries()) {
    const best = REST[nearest] ?? rest;
    if (Math.hypot(rest.x - x, rest.y - DROP) < Math.hypot(best.x - x, best.y - DROP)) {
      nearest = index;
    }
  }
  return nearest;
});

export const createGhost = (at: Point): Ghost => {
  const back = { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
  const x = at.x + back.x * BEHIND;
  const y = at.y + back.y * BEHIND;
  const knots = REST.map((rest) => ({
    px: x + rest.x,
    py: y + rest.y,
    x: x + rest.x,
    y: y + rest.y,
  }));
  const mood = createMood(Math.round(at.x * 7919 + at.y));
  return { back, knots, mood, owed: 0, tilt: 0, time: 0, vx: 0, vy: 0, x, y };
};

/** Where the head is and how it's turned, from its points: shape matching's best fit. */
const frameOf = (knots: readonly Knot[]) => {
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let weight = 0;
  for (const [index, knot] of knots.entries()) {
    const hold = REST[index]?.hold ?? 0;
    x += knot.x * hold;
    y += knot.y * hold;
    vx += (knot.x - knot.px) * hold;
    vy += (knot.y - knot.py) * hold;
    weight += hold;
  }
  x /= weight;
  y /= weight;
  // The turn that best lays the rest shape over where the points are (all of them, as they hold).
  let dot = 0;
  let cross = 0;
  for (const [index, knot] of knots.entries()) {
    const rest = REST[index];
    if (rest) {
      const qx = rest.x - REST_MIDDLE.x;
      const qy = rest.y - REST_MIDDLE.y;
      const px = knot.x - x;
      const py = knot.y - y;
      dot += rest.hold * (qx * px + qy * py);
      cross += rest.hold * (qx * py - qy * px);
    }
  }
  return { angle: Math.atan2(cross, dot), vx: vx / weight / STEP, vy: vy / weight / STEP, x, y };
};

/** Pulls two points to `length` apart, `stiffness` of the way. */
const hold = (a: Knot, b: Knot, length: number, stiffness: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const reach = Math.hypot(dx, dy) || 1e-6;
  const off = ((reach - length) / reach / 2) * stiffness;
  a.x += dx * off;
  a.y += dy * off;
  b.x -= dx * off;
  b.y -= dy * off;
};

/** Each point's outward normal, round the loop. */
const normals = (knots: readonly Knot[]) =>
  knots.map((knot, index) => {
    const before = knots[(index + knots.length - 1) % knots.length] ?? knot;
    const after = knots[(index + 1) % knots.length] ?? knot;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    // Clockwise on the screen (+y down), out is to the left of the way round.
    return { x: dy / length, y: -dx / length };
  });

const tick = (ghost: Ghost, pointer: Point) => {
  const dt = STEP;
  ghost.time += dt;
  const t = ghost.time;
  const { knots } = ghost;
  const frame = frameOf(knots);

  // The pull on the head: after its spot behind the pointer, bobbing on the air.
  const goalX = pointer.x + ghost.back.x * BEHIND + Math.sin(t * 1.1) * 2;
  const goalY = pointer.y + ghost.back.y * BEHIND + Math.sin(t * 1.9) * 3.5;
  const wantX = PULL * (goalX - frame.x) - DAMP * frame.vx;
  const wantY = PULL * (goalY - frame.y) - DAMP * frame.vy;
  const want = Math.hypot(wantX, wantY);
  const pullX = want > MOST_PULL ? (wantX / want) * MOST_PULL : wantX;
  const pullY = want > MOST_PULL ? (wantY / want) * MOST_PULL : wantY;
  const speed = Math.hypot(frame.vx, frame.vy);

  // Each point: carried on, pulled if it's the head's, pushed by the air, weighed down, fluttering.
  const outs = normals(knots);
  for (const [index, knot] of knots.entries()) {
    const out = outs[index];
    const rest = REST[index];
    if (!rest || !out) {
      continue;
    }
    const vx = (knot.x - knot.px) / dt;
    const vy = (knot.y - knot.py) / dt;
    const met = vx * out.x + vy * out.y;
    // Head on, the air pushes back as the square of the speed; along, it only rubs.
    const push = -DRAG * met * Math.min(Math.abs(met), MOST_MET);
    const alongX = vx - met * out.x;
    const alongY = vy - met * out.y;
    const loose = 1 - rest.hold;
    const flutter =
      (FLUTTER + speed * FLUTTER_SPEED) *
      loose *
      Math.sin(t * 8 - index * 0.55 + Math.sin(t * 2.3));
    const ax = rest.hold * pullX + (push + flutter) * out.x - RUB * alongX;
    const ay =
      rest.hold * (pullY - LIFT) + (push + flutter) * out.y - RUB * alongY + WEIGHT * loose;
    knot.px = knot.x;
    knot.py = knot.y;
    knot.x += vx * dt + ax * dt * dt;
    knot.y += vy * dt + ay * dt * dt;
  }

  // Back toward its shape, laid where the points best fit it, turned a little back upright.
  const fit = frameOf(knots);
  const upright = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, fit.angle)) * (1 - UPRIGHT);
  for (const [index, knot] of knots.entries()) {
    const rest = REST[index];
    if (rest) {
      const at = rotate(rest.x - REST_MIDDLE.x, rest.y - REST_MIDDLE.y, upright);
      const stiffness = KEEP_HEM + (KEEP_HEAD - KEEP_HEM) * rest.hold;
      knot.x += (fit.x + at.x - knot.x) * stiffness;
      knot.y += (fit.y + at.y - knot.y) * stiffness;
    }
  }
  // Its area kept, pushing every point out (or in) along its normal.
  const swell = ((REST_AREA - areaOf(knots)) / PERIMETER) * PRESSURE;
  for (const [index, out] of normals(knots).entries()) {
    const knot = knots[index];
    if (knot) {
      knot.x += out.x * swell;
      knot.y += out.y * swell;
    }
  }
  // The cloth held to its length, and stiff enough not to crease sharp.
  for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
    for (const [index, [a, b]] of round(knots).entries()) {
      hold(a, b, LINKS[index] ?? SPACING, 1);
    }
    for (const [index, a] of knots.entries()) {
      const b = knots[(index + 2) % knots.length];
      if (b) {
        hold(a, b, SPANS[index] ?? SPACING, 0.08);
      }
    }
  }

  const settled = frameOf(knots);
  const head = rotate(-REST_MIDDLE.x, -REST_MIDDLE.y, settled.angle);
  ghost.x = settled.x + head.x;
  ghost.y = settled.y + head.y;
  ghost.vx = settled.vx;
  ghost.vy = settled.vy;
  ghost.tilt = settled.angle;
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
  const before = Math.hypot(ghost.vx, ghost.vy);
  ghost.owed = Math.min(MOST_OWED, ghost.owed + seconds);
  while (ghost.owed >= STEP) {
    ghost.owed -= STEP;
    tick(ghost, pointer);
  }
  // Its face: hurried by the pointer, poked when the pointer's on its head,
  // jolted when it's brought up short.
  const slowing = seconds > 0 ? (before - Math.hypot(ghost.vx, ghost.vy)) / seconds : 0;
  stepMood(ghost.mood, seconds, {
    jolt: Math.min(1, Math.max(0, (slowing - JOLT) / JOLT)),
    moved: reach,
    poked: Math.hypot(pointer.x - ghost.x, pointer.y - ghost.y) < HEAD,
  });
};

/** The hem's points: the loosest of the outline. */
export const hemOf = (ghost: Ghost) =>
  ghost.knots.filter((_, index) => (REST[index]?.hold ?? 1) < 0.05);

export interface GhostPaths extends FacePaths {
  /** The whole of it: its face and its outline. */
  body: string;
  /** Its side turned from the light: right of its middle, as it's turned. */
  shade: string;
  /** Folds up the sheet from the hem's cusps, in ink. */
  creases: string;
}

/** A smooth closed curve through a loop of points, about `at`. */
const loop = (points: readonly Point[], at: Point) => {
  const p = (q: Point) => point(q.x - at.x, q.y - at.y);
  const middle = (a: Point, b: Point) => p({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const pairs = round(points);
  const [first] = pairs;
  if (!first) {
    return "";
  }
  return `M${middle(...first)}${pairs
    .slice(1)
    .map(([a, b]) => `Q${p(a)} ${middle(a, b)}`)
    .join("")}Q${p(first[0])} ${middle(...first)}Z`;
};

/** The part of a loop on the far side of a line through `on` facing `across` (one edge of Sutherland–Hodgman). */
const beyond = (points: readonly Point[], on: Point, across: Point) => {
  const side = (q: Point) => (q.x - on.x) * across.x + (q.y - on.y) * across.y;
  const kept: Point[] = [];
  for (const [a, b] of round(points)) {
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) {
      kept.push(a);
    }
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      kept.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return kept;
};

/** The outline to draw: the stepped points, with a lobe hung between each pair of the hem's cusps. */
const scalloped = (knots: readonly Knot[]) => {
  const drawn: Point[] = [];
  let skip = -1;
  for (const [index, knot] of knots.entries()) {
    if (index < skip) {
      continue;
    }
    drawn.push(knot);
    const cusp = CUSPS.indexOf(index);
    const next = knots[CUSPS[cusp + 1] ?? -1];
    if (cusp === -1 || !next) {
      continue;
    }
    // Out from the line between the cusps (round clockwise, out is to its left), a curve's depth twice over.
    const dx = next.x - knot.x;
    const dy = next.y - knot.y;
    const length = Math.hypot(dx, dy) || 1;
    const control = {
      x: (knot.x + next.x) / 2 + (dy / length) * 2 * LOBE,
      y: (knot.y + next.y) / 2 - (dx / length) * 2 * LOBE,
    };
    for (let step = 1; step < 6; step += 1) {
      const t = step / 6;
      const u = 1 - t;
      drawn.push({
        x: u * u * knot.x + 2 * u * t * control.x + t * t * next.x,
        y: u * u * knot.y + 2 * u * t * control.y + t * t * next.y,
      });
    }
    skip = CUSPS[cusp + 1] ?? skip;
  }
  return drawn;
};

/** Its paths about the head's middle, for an <svg> moved there. */
export const ghostPaths = (ghost: Ghost): GhostPaths => {
  const at = { x: ghost.x, y: ghost.y };
  const inFrame = (x: number, y: number) => {
    const turned = rotate(x, y, ghost.tilt);
    return { x: at.x + turned.x, y: at.y + turned.y };
  };
  const outline = scalloped(ghost.knots);
  const body = loop(outline, at);

  const shaded = beyond(outline, inFrame(SPLIT, 0), rotate(1, 0, ghost.tilt));
  const shade = shaded.length > 2 ? loop(shaded, at) : "";

  // From each cusp between the lobes, a fold up toward the waist, bowed as the cloth below it is.
  const creases = CUSPS.slice(1, -1)
    .map((index) => {
      const cusp = ghost.knots[index];
      const rest = REST[index];
      if (!cusp || !rest) {
        return "";
      }
      const top = inFrame(rest.x * 0.6, DROP * 0.4);
      const end = { x: cusp.x + (top.x - cusp.x) * 0.12, y: cusp.y + (top.y - cusp.y) * 0.12 };
      const mid = inFrame(rest.x * 0.85, DROP * 0.75);
      const bow = { x: (mid.x + end.x) / 2, y: (mid.y + end.y) / 2 };
      return `M${point(top.x - at.x, top.y - at.y)}Q${point(bow.x - at.x, bow.y - at.y)} ${point(end.x - at.x, end.y - at.y)}`;
    })
    .join("");

  // Its face looks where it's going: the eyes lead the head.
  const look = {
    x: Math.max(-2.4, Math.min(2.4, ghost.vx / 140)),
    y: Math.max(-1.6, Math.min(1.6, ghost.vy / 140)),
  };
  return { body, creases, shade, ...facePaths(ghost.mood, look, ghost.tilt) };
};
