import type { Point } from "./walk";
import { ellipse, round } from "../art";

export type Vec3 = readonly [number, number, number];

/** Rows. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const add = (a: Vec3, b: Vec3) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]] satisfies Vec3;
export const sub = (a: Vec3, b: Vec3) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] satisfies Vec3;
export const scale = (a: Vec3, k: number) => [a[0] * k, a[1] * k, a[2] * k] satisfies Vec3;
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross = (a: Vec3, b: Vec3) =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] satisfies Vec3;

export const normalize = (a: Vec3) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
export const mix = (a: Vec3, b: Vec3, t: number) => add(a, scale(sub(b, a), t));

export const apply = (m: Mat3, v: Vec3) =>
  [dot(m[0], v), dot(m[1], v), dot(m[2], v)] satisfies Vec3;

export const compose = (a: Mat3, b: Mat3) => {
  const columns: Mat3 = [
    [b[0][0], b[1][0], b[2][0]],
    [b[0][1], b[1][1], b[2][1]],
    [b[0][2], b[1][2], b[2][2]],
  ];

  return [apply(columns, a[0]), apply(columns, a[1]), apply(columns, a[2])] satisfies Mat3;
};

/** A roll about the forward axis: positive tips its top to its left (+z). */
export const rollOf = (angle: number) =>
  [
    [1, 0, 0],
    [0, Math.cos(angle), -Math.sin(angle)],
    [0, Math.sin(angle), Math.cos(angle)],
  ] satisfies Mat3;

/** A turn about the up axis: positive turns its front from +x toward +z, toward the camera. */
export const yawOf = (angle: number) =>
  [
    [Math.cos(angle), 0, -Math.sin(angle)],
    [0, 1, 0],
    [Math.sin(angle), 0, Math.cos(angle)],
  ] satisfies Mat3;

/** A pitch about the side axis: positive lifts its front (+x toward +y), negative bows it. */
export const pitchOf = (angle: number) =>
  [
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1],
  ] satisfies Mat3;

/** How far the camera looks down, radians: a little less than the town's isometric. */
export const PITCH = 0.48;
const SIN = Math.sin(PITCH);
const COS = Math.cos(PITCH);

/** The way to the camera, in the world: what faces it is seen. */
export const TOWARD_CAMERA: Vec3 = [0, SIN, COS];

/** A point of the world on the screen, about the follower's feet: +y down. */
export const toScreen = (v: Vec3) => ({ x: v[0], y: -v[1] * COS + v[2] * SIN }) satisfies Point;

/** How near the camera a point is: what's nearer is drawn over. */
export const depthOf = (v: Vec3) => dot(v, TOWARD_CAMERA);

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Degrees. */
  angle: number;
}

/**
 * The ellipse a solid's seen as: an ellipsoid's three semi-axes, or a flat
 * disc's two, about its center. Seen straight on, any of them is an ellipse
 * whose spread is the sum of its projected semi-axes' outer products.
 */
export const ellipseOf = (center: Vec3, axes: readonly Vec3[]) => {
  let a = 0;
  let b = 0;
  let c = 0;

  for (const axis of axes) {
    const { x, y } = toScreen(axis);
    a += x * x;
    b += x * y;
    c += y * y;
  }

  const mean = (a + c) / 2;
  const root = Math.hypot((a - c) / 2, b);
  const at = toScreen(center);

  return {
    angle: round((Math.atan2(2 * b, a - c) * 90) / Math.PI),
    cx: at.x,
    cy: at.y,
    rx: round(Math.sqrt(Math.max(mean + root, 1e-4))),
    ry: round(Math.sqrt(Math.max(mean - root, 1e-4))),
  } satisfies Ellipse;
};

export const ellipsePath = ({ angle, cx, cy, rx, ry }: Ellipse) => ellipse(cx, cy, rx, ry, angle);

const LIGHT = { x: -0.55, y: -0.83 };

const litOf = (outline: Ellipse, amount = 0.32) => {
  const shift = Math.min(outline.rx, outline.ry) * amount;

  return {
    ...outline,
    cx: outline.cx + LIGHT.x * shift,
    cy: outline.cy + LIGHT.y * shift,
  } satisfies Ellipse;
};

/** A shaded solid's paths: its whole (in the shade color), and its lit part. */
export const solidPaths = (outline: Ellipse) => ({
  lit: ellipsePath(litOf(outline)),
  whole: ellipsePath(outline),
});

/** A line through points seen from the camera: a neck, a leg, a scarf. */
export const linePath = (points: readonly Vec3[]) =>
  points
    .map((v, index) => {
      const { x, y } = toScreen(v);

      return `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
    })
    .join("");

/** How much a surface facing `normal` faces the camera: 0 turned away to 1 straight on. */
export const facing = (normal: Vec3) => Math.max(0, dot(normalize(normal), TOWARD_CAMERA));

/** A value moving on a critically damped spring: smooth to its goal, no overshoot. */
export interface Spring {
  x: number;
  v: number;
}

export const springAt = (x: number) => ({ v: 0, x }) satisfies Spring;

/**
 * Steps a spring `seconds` on toward `goal`, `rate` its quickness (about how
 * many times a second it closes the gap): solved exactly, so it's the same at
 * any frame rate and never overshoots, however long the step.
 */
export const stepSpring = (spring: Spring, goal: number, rate: number, seconds: number) => {
  const t = Math.max(seconds, 0);
  const off = spring.x - goal;
  const pull = spring.v + rate * off;
  const decay = Math.exp(-rate * t);
  spring.x = goal + (off + pull * t) * decay;
  spring.v = (spring.v - rate * pull * t) * decay;
};

/** Steps an angle's spring toward `goal` the short way round. */
export const stepAngle = (spring: Spring, goal: number, rate: number, seconds: number) => {
  const turn = Math.atan2(Math.sin(goal - spring.x), Math.cos(goal - spring.x));
  stepSpring(spring, spring.x + turn, rate, seconds);
  spring.x = Math.atan2(Math.sin(spring.x), Math.cos(spring.x));
};

/**
 * Which way, as a heading, a move across the screen goes: the screen's
 * down is toward the camera, foreshortened by the camera's pitch, so a
 * pixel of it is 1 / sin(PITCH) of the ground. Exactly that, so a body
 * (and its planted feet) points the way it travels.
 */
export const headingOf = (dx: number, dy: number) => Math.atan2(dy / SIN, dx);

/** Eased in and out: 0 to 1 as `t` goes 0 to 1, with no jolt at either end. */
export const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));

  return u * u * u * (u * (u * 6 - 15) + 10);
};

const turnOf = (o: Point, a: Point, b: Point) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

const hullHalf = (from: readonly Point[]) => {
  const kept: Point[] = [];

  for (const p of from) {
    while (kept.length >= 2 && turnOf(kept.at(-2) ?? p, kept.at(-1) ?? p, p) <= 0) {
      kept.pop();
    }

    kept.push(p);
  }

  kept.pop();

  return kept;
};

/** The outline round some points seen from the camera (a beak from any side): their convex hull. */
export const hullPath = (points: readonly Vec3[]) => {
  const seen = points.map(toScreen).toSorted((a, b) => a.x - b.x || a.y - b.y);
  const hull = [...hullHalf(seen), ...hullHalf(seen.toReversed())];

  return `${hull.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;
};

/** Two directions square to `normal` and to each other: the plane a flat disc lies in. */
export const tangentsOf = (normal: Vec3) => {
  const n = normalize(normal);
  const helper: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(n, helper));

  return [u, cross(n, u)] satisfies readonly [Vec3, Vec3];
};

/** An ellipsoid placed in the world: its center, how it's turned (local to world), and its radii. */
export interface Ellipsoid {
  center: Vec3;
  turn: (local: Vec3) => Vec3;
  radii: Vec3;
}

/** Its semi-axes in the world. */
export const axesOf = ({ radii, turn }: Ellipsoid) =>
  [turn([radii[0], 0, 0]), turn([0, radii[1], 0]), turn([0, 0, radii[2]])] satisfies Vec3[];

const onSurface = (body: Ellipsoid, unit: Vec3) => {
  const { radii, turn } = body;
  const at = add(body.center, turn([unit[0] * radii[0], unit[1] * radii[1], unit[2] * radii[2]]));
  const normal = normalize(turn([unit[0] / radii[0], unit[1] / radii[1], unit[2] / radii[2]]));

  return { at: toScreen(at), near: dot(normal, TOWARD_CAMERA) };
};

const RIM_SAMPLES = 48;
const ARC_SAMPLES = 20;

const parameterOf = ({ angle, cx, cy, rx, ry }: Ellipse, p: Point) => {
  const turn = (angle * Math.PI) / 180;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const along = dx * Math.cos(turn) + dy * Math.sin(turn);
  const across = -dx * Math.sin(turn) + dy * Math.cos(turn);

  return Math.atan2(across / ry, along / rx);
};

const pointOf = ({ angle, cx, cy, rx, ry }: Ellipse, t: number) => {
  const turn = (angle * Math.PI) / 180;
  const along = rx * Math.cos(t);
  const across = ry * Math.sin(t);

  return {
    x: cx + along * Math.cos(turn) - across * Math.sin(turn),
    y: cy + along * Math.sin(turn) + across * Math.cos(turn),
  } satisfies Point;
};

const polygonPath = (points: readonly Point[]) =>
  points.length < 3
    ? ""
    : `${points.map((p, index) => `${index === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join("")}Z`;

/**
 * A cap of an ellipsoid as seen (a penguin's white front): the surface past
 * a plane, its `normal` and its distance `offset` (-1 to 1) given as for the
 * unit sphere the ellipsoid is stretched from. What shows of it is the near
 * side of its rim, closed round the ellipsoid's outline on the cap's side;
 * all of the rim when it faces the camera, nothing when it's turned away.
 */
export const capPath = (body: Ellipsoid, normal: Vec3, offset: number) => {
  const n = normalize(normal);
  const rim = Math.sqrt(Math.max(0, 1 - offset * offset));
  const [u, v] = tangentsOf(n);

  const ring = Array.from({ length: RIM_SAMPLES }, (_, index) => {
    const t = (index / RIM_SAMPLES) * Math.PI * 2;

    return onSurface(
      body,
      add(scale(n, offset), add(scale(u, rim * Math.cos(t)), scale(v, rim * Math.sin(t)))),
    );
  });

  const apex = onSurface(body, n);
  const shown = ring.filter(({ near }) => near > 0).length;
  const outline = ellipseOf(body.center, axesOf(body));

  if (shown === RIM_SAMPLES) {
    return polygonPath(ring.map(({ at }) => at));
  }

  if (shown === 0) {
    return apex.near > 0 ? ellipsePath(outline) : "";
  }

  const entering = ring.findIndex(
    ({ near }, index) => near <= 0 && (ring[(index + 1) % RIM_SAMPLES]?.near ?? 0) > 0,
  );

  const crossing = (index: number) => {
    const a = ring[index % RIM_SAMPLES] ?? apex;
    const b = ring[(index + 1) % RIM_SAMPLES] ?? apex;
    const t = a.near / (a.near - b.near);

    return { x: a.at.x + (b.at.x - a.at.x) * t, y: a.at.y + (b.at.y - a.at.y) * t };
  };

  const arc: Point[] = [crossing(entering)];
  let index = entering + 1;

  while ((ring[index % RIM_SAMPLES]?.near ?? 0) > 0 && arc.length <= RIM_SAMPLES) {
    arc.push(ring[index % RIM_SAMPLES]?.at ?? apex.at);
    index += 1;
  }

  const leaving = crossing(index - 1);
  arc.push(leaving);
  const from = parameterOf(outline, leaving);
  const to = parameterOf(outline, arc[0] ?? leaving);
  const forward = (((to - from) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  const ways = [forward, forward - Math.PI * 2].map((sweep) => {
    const points = Array.from({ length: ARC_SAMPLES }, (_, step) =>
      pointOf(outline, from + (sweep * (step + 1)) / (ARC_SAMPLES + 1)),
    );

    const middle = points[ARC_SAMPLES / 2] ?? leaving;

    return { far: Math.hypot(middle.x - apex.at.x, middle.y - apex.at.y), points };
  });

  const way = ways.toSorted((a, b) => a.far - b.far)[0]?.points ?? [];

  return polygonPath([...arc, ...way]);
};

const MOST_AWAY = 0.3;
const ON_IT = 30;
const ON_IT_TALL = 60;

/**
 * Which way a follower on foot should face: its way while it goes; standing,
 * the mouse, a little toward the camera, and never so far round it shows its
 * back; with the mouse on it (petting, clicking it), the camera, leaning
 * toward the mouse's side, so what it does for the mouse is seen.
 */
export const faceGoal = (
  walker: { x: number; y: number; vx: number; vy: number; speed: number },
  pointer: Point,
  current: number,
  moving: number,
) => {
  if (walker.speed > moving) {
    return headingOf(walker.vx, walker.vy);
  }

  const dx = pointer.x - walker.x;
  const dy = pointer.y - walker.y;

  if (Math.abs(dx) < ON_IT && dy < 6 && dy > -ON_IT_TALL) {
    return Math.PI / 2 - (0.5 * Math.max(-ON_IT, Math.min(ON_IT, dx))) / ON_IT;
  }

  if (Math.hypot(dx, dy) < ON_IT) {
    return current;
  }

  const toward = headingOf(dx, dy);

  const biased =
    toward + 0.3 * Math.atan2(Math.sin(Math.PI / 2 - toward), Math.cos(Math.PI / 2 - toward));

  if (Math.sin(biased) >= -MOST_AWAY) {
    return biased;
  }

  return Math.cos(biased) >= 0 ? -Math.asin(MOST_AWAY) : Math.PI + Math.asin(MOST_AWAY);
};

/** Lines through points seen from the camera, each its own stroke: a foot's toes. */
export const linesPath = (lines: readonly (readonly Vec3[])[]) => lines.map(linePath).join("");

/** A quadratic curve through 3D points, as a line of `steps` pieces: a neck, a hanging wattle. */
export const curveOf = (from: Vec3, bend: Vec3, to: Vec3, steps = 6) =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;

    return add(add(scale(from, (1 - t) * (1 - t)), scale(bend, 2 * t * (1 - t))), scale(to, t * t));
  });
