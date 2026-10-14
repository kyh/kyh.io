// The city is drawn the way Inkline Town draws its island: flat, unlit faces
// in a handful of colors, outlined in ink. A sketch collects both, measured in
// grid cells (x east, y up, z south), batched per color so the whole town
// renders in a few dozen draw calls.
//
// The camera never turns, so which faces show and which edges outline a solid
// are worked out once, here: faces turned away are dropped, and ink goes on
// silhouettes (a visible face meets a hidden one), creases and open edges.
import type { Paint, Token } from "./palette";

export type Vec3 = readonly [x: number, y: number, z: number];
export type Weight = "hair" | "fine" | "bold";

/** Toward the camera: a 45° heading and a 30° elevation, as in Inkline Town. */
export const VIEW: Vec3 = [
  Math.SQRT1_2 * Math.cos(Math.PI / 6),
  Math.sin(Math.PI / 6),
  Math.SQRT1_2 * Math.cos(Math.PI / 6),
];

export interface LineBatch {
  token: Token;
  weight: Weight;
  positions: number[];
}

/** Text on a flat board: `origin` is its lower-left corner. */
export interface Sign {
  text: string;
  origin: Vec3;
  across: Vec3;
  up: Vec3;
  token: Token;
}

/** A piece drawn around its own origin so it can move: a dish, a rocket. */
export interface Part {
  name: string;
  origin: Vec3;
  sketch: Sketch;
}

export interface Sketch {
  faces: Map<Token, number[]>;
  lines: Map<string, LineBatch>;
  signs: Sign[];
  screens: Screen[];
  parts: Part[];
  /** Null for parts that turn: they keep every face and ink only creases. */
  view: Vec3 | null;
}

export interface Triangle {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  token: Token;
}

export const createSketch = (view: Vec3 | null = VIEW): Sketch => ({
  faces: new Map(),
  lines: new Map(),
  parts: [],
  screens: [],
  signs: [],
  view,
});

export const part = (sketch: Sketch, name: string, origin: Vec3, turns = false) => {
  const child = createSketch(turns ? null : sketch.view);
  sketch.parts.push({ name, origin, sketch: child });
  return child;
};

// Vector math, on tuples so a sketch stays plain data.

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

const normalOf = (a: Vec3, b: Vec3, c: Vec3): Vec3 | null => {
  const n = cross(sub(b, a), sub(c, a));
  const size = length(n);
  return size < 1e-9 ? null : scale(n, 1 / size);
};

const faceBatch = (sketch: Sketch, token: Token) => {
  const existing = sketch.faces.get(token);
  if (existing) {
    return existing;
  }
  const created: number[] = [];
  sketch.faces.set(token, created);
  return created;
};

const lineBatch = (sketch: Sketch, token: Token, weight: Weight) => {
  const key = `${token}|${weight}`;
  const existing = sketch.lines.get(key);
  if (existing) {
    return existing;
  }
  const created: LineBatch = { positions: [], token, weight };
  sketch.lines.set(key, created);
  return created;
};

const pushTriangle = (target: number[], a: Vec3, b: Vec3, c: Vec3) => {
  target.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
};

/** A polyline of ink. */
export const line = (
  sketch: Sketch,
  points: readonly Vec3[],
  weight: Weight = "fine",
  token: Token = "ink",
) => {
  const { positions } = lineBatch(sketch, token, weight);
  let previous: Vec3 | null = null;
  for (const point of points) {
    if (previous) {
      positions.push(...previous, ...point);
    }
    previous = point;
  }
};

export const loop = (
  sketch: Sketch,
  points: readonly Vec3[],
  weight: Weight = "fine",
  token: Token = "ink",
) => {
  const [first] = points;
  if (first) {
    line(sketch, [...points, first], weight, token);
  }
};

/** A flat convex polygon, always drawn, outlined unless `outline` is null. */
export const face = (
  sketch: Sketch,
  token: Token,
  points: readonly Vec3[],
  outline: Weight | null = "fine",
) => {
  const [first, ...rest] = points;
  if (!first) {
    return;
  }
  const target = faceBatch(sketch, token);
  let previous: Vec3 | null = null;
  for (const point of rest) {
    if (previous) {
      pushTriangle(target, first, previous, point);
    }
    previous = point;
  }
  if (outline) {
    loop(sketch, points, outline);
  }
};

export type Point2 = readonly [number, number];

const signedArea = (points: readonly Point2[]) => {
  let area = 0;
  for (const [index, [x0, z0]] of points.entries()) {
    const next = points[(index + 1) % points.length];
    if (next) {
      area += x0 * next[1] - next[0] * z0;
    }
  }
  return area / 2;
};

const turn = (a: Point2, b: Point2, c: Point2) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

const inTriangle = (p: Point2, a: Point2, b: Point2, c: Point2) =>
  turn(a, b, p) >= 0 && turn(b, c, p) >= 0 && turn(c, a, p) >= 0;

const isEar = (points: readonly Point2[], ring: readonly number[], at: number) => {
  const count = ring.length;
  const a = points[ring[(at + count - 1) % count] ?? -1];
  const b = points[ring[at] ?? -1];
  const c = points[ring[(at + 1) % count] ?? -1];
  if (!a || !b || !c || turn(a, b, c) <= 0) {
    return false;
  }
  return ring.every((index) => {
    const p = points[index];
    return !p || p === a || p === b || p === c || !inTriangle(p, a, b, c);
  });
};

/** Ear clipping, for the simple outlines of coasts, lots and footprints. */
const triangulate = (points: readonly Point2[]): [number, number, number][] => {
  const forward = points.map((_, index) => index);
  const ring = signedArea(points) > 0 ? forward : forward.toReversed();
  const triangles: [number, number, number][] = [];
  while (ring.length > 3) {
    const at = ring.findIndex((_, index) => isEar(points, ring, index));
    if (at === -1) {
      break;
    }
    const count = ring.length;
    triangles.push([
      ring[(at + count - 1) % count] ?? 0,
      ring[at] ?? 0,
      ring[(at + 1) % count] ?? 0,
    ]);
    ring.splice(at, 1);
  }
  const [a, b, c] = ring;
  if (ring.length === 3 && a !== undefined && b !== undefined && c !== undefined) {
    triangles.push([a, b, c]);
  }
  return triangles;
};

/** A flat polygon of any outline (no holes) lying at height `y`. */
export const ground = (
  sketch: Sketch,
  token: Token,
  outline: readonly (readonly [number, number])[],
  y: number,
  ink: Weight | null = "fine",
) => {
  const target = faceBatch(sketch, token);
  for (const [i, j, k] of triangulate(outline)) {
    const a = outline[i];
    const b = outline[j];
    const c = outline[k];
    if (a && b && c) {
      pushTriangle(target, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]]);
    }
  }
  if (ink) {
    loop(
      sketch,
      outline.map(([x, z]) => [x, y, z]),
      ink,
    );
  }
};

interface EdgeRecord {
  a: Vec3;
  b: Vec3;
  normals: Vec3[];
  fronts: boolean[];
}

// Corners are keyed by position, quantized to a 500th of a cell and packed
// into one exact integer, so a shared edge is found without building strings.
const QUANTUM = 500;
const AXIS = 2 ** 17;
const pointKey = (p: Vec3) =>
  (Math.round((p[0] + 128) * QUANTUM) * AXIS + Math.round((p[1] + 128) * QUANTUM)) * AXIS +
  Math.round((p[2] + 128) * QUANTUM);

type EdgeMap = Map<number, Map<number, EdgeRecord>>;

const recordEdge = (edges: EdgeMap, a: Vec3, b: Vec3, normal: Vec3, isFront: boolean) => {
  const ka = pointKey(a);
  const kb = pointKey(b);
  const low = Math.min(ka, kb);
  const high = Math.max(ka, kb);
  let row = edges.get(low);
  if (!row) {
    row = new Map();
    edges.set(low, row);
  }
  let edge = row.get(high);
  if (!edge) {
    edge = { a, b, fronts: [], normals: [] };
    row.set(high, edge);
  }
  edge.normals.push(normal);
  edge.fronts.push(isFront);
};

const isInked = (edge: EdgeRecord, creaseCos: number) => {
  const visible = edge.fronts.filter(Boolean).length;
  if (visible === 0) {
    return false;
  }
  // An open edge of a visible face, or a visible face meeting a hidden one.
  if (edge.fronts.length === 1 || visible < edge.fronts.length) {
    return true;
  }
  const [first, second] = edge.normals;
  return first !== undefined && second !== undefined && dot(first, second) < creaseCos;
};

/**
 * A closed solid from outward-wound triangles. Hidden faces are dropped and
 * ink traces the silhouette and every crease sharper than `crease` degrees.
 */
export const solid = (
  sketch: Sketch,
  triangles: readonly Triangle[],
  weight: Weight = "fine",
  crease = 38,
) => {
  const edges: EdgeMap = new Map();
  for (const { a, b, c, token } of triangles) {
    const normal = normalOf(a, b, c);
    if (normal) {
      const isFront = sketch.view === null || dot(normal, sketch.view) > 1e-4;
      if (isFront) {
        pushTriangle(faceBatch(sketch, token), a, b, c);
      }
      recordEdge(edges, a, b, normal, isFront);
      recordEdge(edges, b, c, normal, isFront);
      recordEdge(edges, c, a, normal, isFront);
    }
  }
  const creaseCos = Math.cos((crease * Math.PI) / 180);
  const { positions } = lineBatch(sketch, "ink", weight);
  for (const row of edges.values()) {
    for (const edge of row.values()) {
      if (isInked(edge, creaseCos)) {
        positions.push(...edge.a, ...edge.b);
      }
    }
  }
};

// Building blocks. Each returns outward-wound triangles: pass several to one
// `solid` call when they form one closed shape.

/** Which token a face takes: flat tops, faces toward +z (lit) or +x (shade). */
const tokenFor = (colors: Paint, outward: Vec3): Token => {
  if (outward[1] > 0.86 * length(outward)) {
    return colors.top;
  }
  return outward[2] >= outward[0] ? colors.left : colors.right;
};

/** A planar polygon, wound to face `outward`, split into triangles. */
export const polygon = (points: readonly Vec3[], outward: Vec3, colors: Paint): Triangle[] => {
  const [first, second, third] = points;
  if (!first || !second || !third) {
    return [];
  }
  const normal = normalOf(first, second, third);
  const ordered = normal && dot(normal, outward) < 0 ? points.toReversed() : points;
  const [origin, ...rest] = ordered;
  if (!origin) {
    return [];
  }
  const token = tokenFor(colors, outward);
  const triangles: Triangle[] = [];
  let previous: Vec3 | null = null;
  for (const point of rest) {
    if (previous) {
      triangles.push({ a: origin, b: previous, c: point, token });
    }
    previous = point;
  }
  return triangles;
};

export interface BoxSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  y?: number;
  h: number;
  colors: Paint;
}

export const boxTriangles = ({ x, z, w, d, y = 0, h, colors }: BoxSpec): Triangle[] => {
  const [x1, y1, z1] = [x + w, y + h, z + d];
  return [
    ...polygon(
      [
        [x, y1, z],
        [x1, y1, z],
        [x1, y1, z1],
        [x, y1, z1],
      ],
      [0, 1, 0],
      colors,
    ),
    ...polygon(
      [
        [x, y, z1],
        [x1, y, z1],
        [x1, y1, z1],
        [x, y1, z1],
      ],
      [0, 0, 1],
      colors,
    ),
    ...polygon(
      [
        [x1, y, z],
        [x1, y, z1],
        [x1, y1, z1],
        [x1, y1, z],
      ],
      [1, 0, 0],
      colors,
    ),
    ...polygon(
      [
        [x, y, z],
        [x1, y, z],
        [x1, y1, z],
        [x, y1, z],
      ],
      [0, 0, -1],
      colors,
    ),
    ...polygon(
      [
        [x, y, z],
        [x, y, z1],
        [x, y1, z1],
        [x, y1, z],
      ],
      [-1, 0, 0],
      colors,
    ),
    ...polygon(
      [
        [x, y, z],
        [x1, y, z],
        [x1, y, z1],
        [x, y, z1],
      ],
      [0, -1, 0],
      colors,
    ),
  ];
};

export const box = (sketch: Sketch, spec: BoxSpec, weight: Weight = "fine") => {
  solid(sketch, boxTriangles(spec), weight);
};

export interface RoundSpec {
  x: number;
  z: number;
  y?: number;
  h: number;
  /** Radius at the bottom and at the top; 0 at the top makes a cone. */
  r: number;
  top?: number;
  /** Squash along z, for ovals. */
  squash?: number;
  segments?: number;
  colors: Paint;
}

const ring = (spec: RoundSpec, y: number, radius: number): Vec3[] => {
  const segments = spec.segments ?? 16;
  const squash = spec.squash ?? 1;
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2 + Math.PI / segments;
    return [
      spec.x + Math.cos(angle) * radius,
      y,
      spec.z + Math.sin(angle) * radius * squash,
    ] satisfies Vec3;
  });
};

/** A cylinder, cone or frustum standing on its base. */
export const roundTriangles = (spec: RoundSpec): Triangle[] => {
  const y0 = spec.y ?? 0;
  const y1 = y0 + spec.h;
  const top = spec.top ?? spec.r;
  const bottomRing = ring(spec, y0, spec.r);
  const topRing = ring(spec, y1, top);
  const triangles: Triangle[] = [];
  for (const [index, a] of bottomRing.entries()) {
    const b = bottomRing[(index + 1) % bottomRing.length];
    const c = topRing[(index + 1) % topRing.length];
    const d = topRing[index];
    if (b && c && d) {
      const mid = scale(add(a, b), 0.5);
      const outward: Vec3 = [mid[0] - spec.x, (spec.r - top) * 0.5, mid[2] - spec.z];
      triangles.push(...polygon(top > 0 ? [a, b, c, d] : [a, b, d], outward, spec.colors));
    }
  }
  if (top > 0) {
    triangles.push(...polygon(topRing, [0, 1, 0], spec.colors));
  }
  triangles.push(...polygon(bottomRing, [0, -1, 0], spec.colors));
  return triangles;
};

export const round = (sketch: Sketch, spec: RoundSpec, weight: Weight = "fine") => {
  solid(sketch, roundTriangles(spec), weight);
};

export interface BallSpec {
  x: number;
  y: number;
  z: number;
  r: number;
  /** Radii multipliers, for eggs, blimps and bushes. */
  ry?: number;
  rx?: number;
  rz?: number;
  colors: Paint;
  detail?: number;
}

export const ballTriangles = (spec: BallSpec): Triangle[] => {
  const detail = spec.detail ?? 10;
  const rings = Math.max(4, Math.round(detail * 0.7));
  const center: Vec3 = [spec.x, spec.y, spec.z];
  const radii: Vec3 = [spec.r * (spec.rx ?? 1), spec.r * (spec.ry ?? 1), spec.r * (spec.rz ?? 1)];
  const at = (lat: number, lon: number): Vec3 => {
    const phi = (lat / rings) * Math.PI;
    const theta = (lon / detail) * Math.PI * 2;
    return [
      center[0] + Math.sin(phi) * Math.cos(theta) * radii[0],
      center[1] + Math.cos(phi) * radii[1],
      center[2] + Math.sin(phi) * Math.sin(theta) * radii[2],
    ];
  };
  const triangles: Triangle[] = [];
  for (let lat = 0; lat < rings; lat += 1) {
    for (let lon = 0; lon < detail; lon += 1) {
      const a = at(lat, lon);
      const b = at(lat, lon + 1);
      const c = at(lat + 1, lon + 1);
      const d = at(lat + 1, lon);
      const mid = scale(add(add(a, b), add(c, d)), 0.25);
      const outward = sub(mid, center);
      let corners = [a, b, c, d];
      if (lat === 0) {
        corners = [a, c, d];
      } else if (lat === rings - 1) {
        corners = [a, b, c];
      }
      triangles.push(...polygon(corners, outward, spec.colors));
    }
  }
  return triangles;
};

export const ball = (sketch: Sketch, spec: BallSpec, weight: Weight = "fine") => {
  solid(sketch, ballTriangles(spec), weight, 70);
};

export interface RoofSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Eave height. */
  y: number;
  rise: number;
  /** The ridge runs along x or along z. */
  ridge: "x" | "z";
  colors: Paint;
  /** The gable ends are wall. */
  ends?: Paint;
  overhang?: number;
}

/** A pitched roof with gable ends. */
const gableTriangles = (spec: RoofSpec): Triangle[] => {
  const over = spec.overhang ?? 0.06;
  const x0 = spec.x - over;
  const z0 = spec.z - over;
  const x1 = spec.x + spec.w + over;
  const z1 = spec.z + spec.d + over;
  const { y } = spec;
  const top = y + spec.rise;
  const ends = spec.ends ?? spec.colors;
  if (spec.ridge === "x") {
    const zm = (z0 + z1) / 2;
    return [
      ...polygon(
        [
          [x0, y, z1],
          [x1, y, z1],
          [x1, top, zm],
          [x0, top, zm],
        ],
        [0, 1, 1],
        spec.colors,
      ),
      ...polygon(
        [
          [x0, y, z0],
          [x1, y, z0],
          [x1, top, zm],
          [x0, top, zm],
        ],
        [0, 1, -1],
        spec.colors,
      ),
      ...polygon(
        [
          [x1, y, z0],
          [x1, y, z1],
          [x1, top, zm],
        ],
        [1, 0, 0],
        ends,
      ),
      ...polygon(
        [
          [x0, y, z0],
          [x0, y, z1],
          [x0, top, zm],
        ],
        [-1, 0, 0],
        ends,
      ),
      ...polygon(
        [
          [x0, y, z0],
          [x1, y, z0],
          [x1, y, z1],
          [x0, y, z1],
        ],
        [0, -1, 0],
        ends,
      ),
    ];
  }
  const xm = (x0 + x1) / 2;
  return [
    ...polygon(
      [
        [x1, y, z0],
        [x1, y, z1],
        [xm, top, z1],
        [xm, top, z0],
      ],
      [1, 1, 0],
      spec.colors,
    ),
    ...polygon(
      [
        [x0, y, z0],
        [x0, y, z1],
        [xm, top, z1],
        [xm, top, z0],
      ],
      [-1, 1, 0],
      spec.colors,
    ),
    ...polygon(
      [
        [x0, y, z1],
        [x1, y, z1],
        [xm, top, z1],
      ],
      [0, 0, 1],
      ends,
    ),
    ...polygon(
      [
        [x0, y, z0],
        [x1, y, z0],
        [xm, top, z0],
      ],
      [0, 0, -1],
      ends,
    ),
    ...polygon(
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
      ],
      [0, -1, 0],
      ends,
    ),
  ];
};

export const gable = (sketch: Sketch, spec: RoofSpec, weight: Weight = "fine") => {
  solid(sketch, gableTriangles(spec), weight);
};

/** A hipped roof; with `peak` at 0 the ridge shrinks to a point (a pyramid). */
const hipTriangles = (spec: RoofSpec & { peak?: number }): Triangle[] => {
  const over = spec.overhang ?? 0.06;
  const x0 = spec.x - over;
  const z0 = spec.z - over;
  const x1 = spec.x + spec.w + over;
  const z1 = spec.z + spec.d + over;
  const { y } = spec;
  const top = y + spec.rise;
  const xm = (x0 + x1) / 2;
  const zm = (z0 + z1) / 2;
  const half = ((spec.ridge === "x" ? x1 - x0 : z1 - z0) / 2) * (spec.peak ?? 0.45);
  const ridgeA: Vec3 = spec.ridge === "x" ? [xm - half, top, zm] : [xm, top, zm - half];
  const ridgeB: Vec3 = spec.ridge === "x" ? [xm + half, top, zm] : [xm, top, zm + half];
  const corners: Vec3[] = [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ];
  const [c00, c10, c11, c01] = corners;
  if (!c00 || !c10 || !c11 || !c01) {
    return [];
  }
  const sides: [Vec3[], Vec3][] =
    spec.ridge === "x"
      ? [
          [
            [c01, c11, ridgeB, ridgeA],
            [0, 1, 1],
          ],
          [
            [c00, c10, ridgeB, ridgeA],
            [0, 1, -1],
          ],
          [
            [c10, c11, ridgeB],
            [1, 1, 0],
          ],
          [
            [c00, c01, ridgeA],
            [-1, 1, 0],
          ],
        ]
      : [
          [
            [c10, c11, ridgeB, ridgeA],
            [1, 1, 0],
          ],
          [
            [c00, c01, ridgeB, ridgeA],
            [-1, 1, 0],
          ],
          [
            [c01, c11, ridgeB],
            [0, 1, 1],
          ],
          [
            [c00, c10, ridgeA],
            [0, 1, -1],
          ],
        ];
  const triangles: Triangle[] = [];
  for (const [points, outward] of sides) {
    const unique = points.filter(
      (point, index) => points.findIndex((other) => pointKey(other) === pointKey(point)) === index,
    );
    triangles.push(...polygon(unique, outward, spec.colors));
  }
  triangles.push(...polygon(corners, [0, -1, 0], spec.colors));
  return triangles;
};

export const hip = (
  sketch: Sketch,
  spec: RoofSpec & { peak?: number },
  weight: Weight = "fine",
) => {
  solid(sketch, hipTriangles(spec), weight);
};

// Details that sit on a wall: windows, doors, signs. A wall is named by the
// way it faces, and only the two the camera sees carry details.

export type Side = "front" | "side";

/** A point on a building's visible wall: `along` runs left to right as seen. */
export const onWall = (
  spec: { x: number; z: number; w: number; d: number },
  side: Side,
  along: number,
  y: number,
  out = 0.004,
): Vec3 =>
  side === "front"
    ? [spec.x + along, y, spec.z + spec.d + out]
    : [spec.x + spec.w + out, y, spec.z + spec.d - along];

export const wallLength = (spec: { w: number; d: number }, side: Side) =>
  side === "front" ? spec.w : spec.d;

export interface PaneSpec {
  side: Side;
  along: number;
  y: number;
  w: number;
  h: number;
}

/** A flat rectangle on a wall: a window, a door, a poster. */
export const pane = (
  sketch: Sketch,
  wall: { x: number; z: number; w: number; d: number },
  spec: PaneSpec,
  token: Token,
  weight: Weight | null = "hair",
  out = 0.004,
) => {
  face(
    sketch,
    token,
    [
      onWall(wall, spec.side, spec.along, spec.y, out),
      onWall(wall, spec.side, spec.along + spec.w, spec.y, out),
      onWall(wall, spec.side, spec.along + spec.w, spec.y + spec.h, out),
      onWall(wall, spec.side, spec.along, spec.y + spec.h, out),
    ],
    weight,
  );
};

/** A frame for flat outlines standing anywhere: `u` and `v` span the plane. */
export interface Frame {
  origin: Vec3;
  u: Vec3;
  v: Vec3;
}

const inFrame = (frame: Frame, [a, b]: Point2): Vec3 =>
  add(frame.origin, add(scale(frame.u, a), scale(frame.v, b)));

/**
 * A slab cut to any outline in a frame and pushed out along `depth`: hearts,
 * arrows, speech bubbles, boards. The outline may be wound either way.
 */
const extrudeTriangles = (
  outline: readonly Point2[],
  frame: Frame,
  depth: Vec3,
  colors: Paint,
): Triangle[] => {
  const ccw = signedArea(outline) > 0;
  const back = outline.map((point) => inFrame(frame, point));
  const front = back.map((point) => add(point, depth));
  const triangles: Triangle[] = [];
  for (const [index, [x0, y0]] of outline.entries()) {
    const next = outline[(index + 1) % outline.length];
    const a = back[index];
    const b = back[(index + 1) % back.length];
    const c = front[(index + 1) % front.length];
    const d = front[index];
    if (next && a && b && c && d) {
      const [x1, y1] = next;
      const edgeNormal2: Point2 = ccw ? [y1 - y0, x0 - x1] : [y0 - y1, x1 - x0];
      const outward = add(scale(frame.u, edgeNormal2[0]), scale(frame.v, edgeNormal2[1]));
      triangles.push(...polygon([a, b, c, d], outward, colors));
    }
  }
  for (const [i, j, k] of triangulate(outline)) {
    const fa = front[i];
    const fb = front[j];
    const fc = front[k];
    const ba = back[i];
    const bb = back[j];
    const bc = back[k];
    if (fa && fb && fc && ba && bb && bc) {
      triangles.push(
        ...polygon([fa, fb, fc], scale(depth, 1), colors),
        ...polygon([ba, bb, bc], scale(depth, -1), colors),
      );
    }
  }
  return triangles;
};

export const extrude = (
  sketch: Sketch,
  outline: readonly Point2[],
  frame: Frame,
  depth: Vec3,
  colors: Paint,
  weight: Weight = "fine",
) => {
  solid(sketch, extrudeTriangles(outline, frame, depth, colors), weight);
};

/** Points around an ellipse, for round outlines in a frame. */
export const ellipse = (rx: number, ry: number, segments = 20, cx = 0, cy = 0): Point2[] =>
  Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry] satisfies Point2;
  });

/** A screen whose picture the animations redraw (a TV, a ticker). */
export interface Screen {
  name: string;
  origin: Vec3;
  across: Vec3;
  up: Vec3;
}

/** Turn a point about an axis through `pivot`, by `angle` radians. */
export const rotate = (point: Vec3, pivot: Vec3, axis: "x" | "y" | "z", angle: number): Vec3 => {
  const [x, y, z] = sub(point, pivot);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  let turned: Vec3 = [x * c - y * s, x * s + y * c, z];
  if (axis === "x") {
    turned = [x, y * c - z * s, y * s + z * c];
  } else if (axis === "y") {
    turned = [x * c + z * s, y, -x * s + z * c];
  }
  return add(turned, pivot);
};

/** Move every corner of some triangles: tilt a capsule, lay a cylinder down. */
export const mapTriangles = (
  triangles: readonly Triangle[],
  move: (point: Vec3) => Vec3,
): Triangle[] =>
  triangles.map(({ a, b, c, token }) => ({ a: move(a), b: move(b), c: move(c), token }));
