// The followers in the round (the penguin, the turkey): their parts built as
// solids in 3D and seen from a little above, as the showcase town is, so a
// follower turns through its front, three-quarter, side and back views
// rather than flipping. An ellipsoid seen this way is an ellipse (`ellipseOf`
// works it out from the solid's semi-axes), a flat disc (an eye, a foot, a
// feather) is one too, and a tube (a neck, a leg) is a thick line. Each
// part's depth says what's drawn over what. And the springs everything moves
// on, critically damped so nothing overshoots or jumps: positions, angles, a
// heading turning the short way round. In a follower's own pixels: x forward
// along its heading, y up, z to its left, its feet at the origin. Pure.
import type { Point } from "./walk";
import { ellipse, round } from "../art";

export type Vec3 = readonly [number, number, number];
/** Rows. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a: Vec3): Vec3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
export const mix = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));

export const apply = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
export const compose = (a: Mat3, b: Mat3): Mat3 => {
  const columns: Mat3 = [
    [b[0][0], b[1][0], b[2][0]],
    [b[0][1], b[1][1], b[2][1]],
    [b[0][2], b[1][2], b[2][2]],
  ];
  return [apply(columns, a[0]), apply(columns, a[1]), apply(columns, a[2])];
};

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** A roll about the forward axis: positive tips its top to its left (+z). */
export const rollOf = (angle: number): Mat3 => [
  [1, 0, 0],
  [0, Math.cos(angle), -Math.sin(angle)],
  [0, Math.sin(angle), Math.cos(angle)],
];

/** A turn about the up axis: positive turns its front from +x toward +z, toward the camera. */
export const yawOf = (angle: number): Mat3 => [
  [Math.cos(angle), 0, -Math.sin(angle)],
  [0, 1, 0],
  [Math.sin(angle), 0, Math.cos(angle)],
];

/** A pitch about the side axis: positive lifts its front (+x toward +y), negative bows it. */
export const pitchOf = (angle: number): Mat3 => [
  [Math.cos(angle), -Math.sin(angle), 0],
  [Math.sin(angle), Math.cos(angle), 0],
  [0, 0, 1],
];

/** How far the camera looks down, radians: a little less than the town's isometric. */
export const PITCH = 0.48;
const SIN = Math.sin(PITCH);
const COS = Math.cos(PITCH);

/** The way to the camera, in the world: what faces it is seen. */
export const TOWARD_CAMERA: Vec3 = [0, SIN, COS];

/** A point of the world on the screen, about the follower's feet: +y down. */
export const toScreen = (v: Vec3): Point => ({ x: v[0], y: -v[1] * COS + v[2] * SIN });

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
export const ellipseOf = (center: Vec3, axes: readonly Vec3[]): Ellipse => {
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
  };
};

export const ellipsePath = ({ angle, cx, cy, rx, ry }: Ellipse) => ellipse(cx, cy, rx, ry, angle);

/** Up and to the left, where the town's light comes from: the far side is shaded. */
const LIGHT = { x: -0.55, y: -0.83 };

/** The ellipse moved toward the light: drawn over the shaded whole, it leaves the shade a crescent. */
export const litOf = (outline: Ellipse, amount = 0.32): Ellipse => {
  const shift = Math.min(outline.rx, outline.ry) * amount;
  return { ...outline, cx: outline.cx + LIGHT.x * shift, cy: outline.cy + LIGHT.y * shift };
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

export const springAt = (x: number): Spring => ({ v: 0, x });

/** The longest step a spring takes: past it, it would come apart. */
const MOST_STEP = 0.05;

/**
 * Steps a spring `seconds` on toward `goal`, `rate` its quickness (about how
 * many times a second it closes the gap): solved exactly, so it's the same at
 * any frame rate.
 */
export const stepSpring = (spring: Spring, goal: number, rate: number, seconds: number) => {
  const t = Math.min(Math.max(seconds, 0), MOST_STEP);
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
 * down is toward the camera, foreshortened, so it counts for more.
 */
export const headingOf = (dx: number, dy: number) => Math.atan2(dy / SIN / 1.4, dx);

/** Eased in and out: 0 to 1 as `t` goes 0 to 1, with no jolt at either end. */
export const smooth = (t: number) => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

/** Which way three points turn: positive counterclockwise on the screen. */
const turnOf = (o: Point, a: Point, b: Point) =>
  (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** One half of a convex hull, along points sorted left to right. */
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
export const tangentsOf = (normal: Vec3): readonly [Vec3, Vec3] => {
  const n = normalize(normal);
  const helper: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(n, helper));
  return [u, cross(n, u)];
};

/** An ellipsoid placed in the world: its center, how it's turned (local to world), and its radii. */
export interface Ellipsoid {
  center: Vec3;
  turn: (local: Vec3) => Vec3;
  radii: Vec3;
}

/** Its semi-axes in the world. */
export const axesOf = ({ radii, turn }: Ellipsoid): Vec3[] => [
  turn([radii[0], 0, 0]),
  turn([0, radii[1], 0]),
  turn([0, 0, radii[2]]),
];

/** A point of a unit sphere mapped onto it, and how much the surface there faces the camera. */
const onSurface = (body: Ellipsoid, unit: Vec3) => {
  const { radii, turn } = body;
  const at = add(body.center, turn([unit[0] * radii[0], unit[1] * radii[1], unit[2] * radii[2]]));
  const normal = normalize(turn([unit[0] / radii[0], unit[1] / radii[1], unit[2] / radii[2]]));
  return { at: toScreen(at), near: dot(normal, TOWARD_CAMERA) };
};

const RIM_SAMPLES = 48;
const ARC_SAMPLES = 20;

/** Where a screen point sits round an ellipse, as the angle of its parameter. */
const parameterOf = ({ angle, cx, cy, rx, ry }: Ellipse, p: Point) => {
  const turn = (angle * Math.PI) / 180;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const along = dx * Math.cos(turn) + dy * Math.sin(turn);
  const across = -dx * Math.sin(turn) + dy * Math.cos(turn);
  return Math.atan2(across / ry, along / rx);
};

const pointOf = ({ angle, cx, cy, rx, ry }: Ellipse, t: number): Point => {
  const turn = (angle * Math.PI) / 180;
  const along = rx * Math.cos(t);
  const across = ry * Math.sin(t);
  return {
    x: cx + along * Math.cos(turn) - across * Math.sin(turn),
    y: cy + along * Math.sin(turn) + across * Math.cos(turn),
  };
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
  // The near arc: from where the rim comes round into view to where it goes out of it.
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
  // Back round the outline, the way that passes the cap's side.
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

/**
 * Which way a follower on foot should face: its way while it goes; standing,
 * the mouse, a little toward the camera so it shows its face; and where it
 * faces already when the mouse is on it.
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
  if (Math.hypot(dx, dy) < 30) {
    return current;
  }
  const toward = headingOf(dx, dy);
  return toward + 0.3 * Math.atan2(Math.sin(Math.PI / 2 - toward), Math.cos(Math.PI / 2 - toward));
};

/** Lines through points seen from the camera, each its own stroke: a foot's toes. */
export const linesPath = (lines: readonly (readonly Vec3[])[]) => lines.map(linePath).join("");

/** A quadratic curve through 3D points, as a line of `steps` pieces: a neck, a hanging wattle. */
export const curveOf = (from: Vec3, bend: Vec3, to: Vec3, steps = 6): Vec3[] =>
  Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    return add(add(scale(from, (1 - t) * (1 - t)), scale(bend, 2 * t * (1 - t))), scale(to, t * t));
  });
