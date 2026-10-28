// A drawing in the town's own hand, flattened to a picture for pages outside
// the showcase: its faces and ink as the town's camera sees them, projected
// to 2D so an <svg> draws it without three.js. With no depth buffer, the
// faces go on in order instead, a patch at a time: each solid drawn (a cone,
// a ball) is its flat caps and its curved side, none of which covers another
// of the same solid. Wherever patches of two solids overlap on screen, the
// one mostly farther there goes first. Each stroke of ink goes on with the
// last patch along it, so a nearer patch covers the ink behind it. Pure.
import type { Time, Token } from "./palette";
import type { Placed, Sketch, Vec3, Weight } from "./sketch";
import { PALETTE, SHADE } from "./palette";
import {
  ballTriangles,
  createSketch,
  line,
  mapTriangles,
  rodTriangles,
  roundTriangles,
  solid,
  VIEW,
} from "./sketch";

/** Ink as `render.ts` draws it, in screen pixels at the size it's shown. */
const WEIGHTS: Record<Weight, number> = { bold: 1.6, fine: 1, hair: 0.6 };
/** Picture units to a grid cell. */
const SCALE = 100;
/** Facets facing one way make a flat cap once there are this many (a side's quad is two). */
const CAP = 3;

export interface Picture {
  /** Its bounds, in picture units: the drawing's origin is at (0, 0), a cell 100 across. */
  box: readonly [left: number, top: number, width: number, height: number];
  /** Back to front. */
  layers: readonly PictureLayer[];
}

export type PictureLayer =
  /** `shaded` faces are turned from the light and take the town's shade dots. */
  | { kind: "faces"; d: string; fill: string; shaded: boolean }
  | { kind: "ink"; d: string; stroke: string; width: number };

type Point = readonly [number, number];

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// The camera's own axes: across the screen, and up it.
const RIGHT = ((): Vec3 => {
  const [x, , z] = VIEW;
  const size = Math.hypot(x, z);
  return [z / size, 0, -x / size];
})();
const UP = cross(VIEW, RIGHT);

const project = (point: Vec3): Point => [dot(point, RIGHT) * SCALE, -dot(point, UP) * SCALE];

interface Facet {
  token: Token;
  /** On screen, counterclockwise. */
  corners: readonly Point[];
  /** Nearer the camera is larger. */
  depths: readonly number[];
  /** Its edges in the drawing's own space, to find the ink drawn along them. */
  edges: readonly (readonly [Vec3, Vec3])[];
  /** Which way it faces, rounded: facets of a flat cap share it. */
  facing: string;
}

const cross2 = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

const facetOf = (token: Token, [a, b, c]: readonly Vec3[]): Facet | null => {
  if (!a || !b || !c) {
    return null;
  }
  const corners = [project(a), project(b), project(c)] as const;
  const depths = [dot(a, VIEW), dot(b, VIEW), dot(c, VIEW)] as const;
  const area = cross2(...corners);
  const normal = cross(
    [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
  );
  const size = Math.hypot(...normal);
  if (Math.abs(area) < 1e-6 || size < 1e-12) {
    return null;
  }
  const facing = normal.map((n) => Math.round((n / size) * 100)).join(",");
  const edges = [
    [a, b],
    [b, c],
    [c, a],
  ] as const;
  return area > 0
    ? { corners, depths, edges, facing, token }
    : { corners: corners.toReversed(), depths: depths.toReversed(), edges, facing, token };
};

/** A facet's depth at a point on screen, from its plane. */
const depthAt = ({ corners: [a, b, c], depths }: Facet, p: Point) => {
  if (!a || !b || !c) {
    return 0;
  }
  const area = cross2(a, b, c);
  const u = cross2(b, c, p) / area;
  const v = cross2(c, a, p) / area;
  return u * (depths[0] ?? 0) + v * (depths[1] ?? 0) + (1 - u - v) * (depths[2] ?? 0);
};

/** One convex polygon clipped to another's inside (Sutherland–Hodgman); both counterclockwise. */
const clip = (subject: readonly Point[], by: readonly Point[]) => {
  let out: Point[] = [...subject];
  for (const [index, from] of by.entries()) {
    const to = by[(index + 1) % by.length] ?? from;
    const input = out;
    out = [];
    for (const [at, current] of input.entries()) {
      const previous = input[(at + input.length - 1) % input.length] ?? current;
      const now = cross2(from, to, current);
      const before = cross2(from, to, previous);
      if (now >= 0 !== before >= 0) {
        const t = before / (before - now);
        out.push([
          previous[0] + (current[0] - previous[0]) * t,
          previous[1] + (current[1] - previous[1]) * t,
        ]);
      }
      if (now >= 0) {
        out.push(current);
      }
    }
  }
  return out;
};

/** Where two facets overlap on screen: how much, and a point inside both. */
const overlapOf = (a: Facet, b: Facet) => {
  const shared = clip(a.corners, b.corners);
  let area = 0;
  let x = 0;
  let y = 0;
  for (const [index, p] of shared.entries()) {
    const q = shared[(index + 1) % shared.length] ?? p;
    const step = p[0] * q[1] - q[0] * p[1];
    area += step;
    x += (p[0] + q[0]) * step;
    y += (p[1] + q[1]) * step;
  }
  return area > 0.1 ? { area: area / 2, at: [x / (3 * area), y / (3 * area)] as const } : null;
};

const triplesOf = (positions: readonly number[], size: number) =>
  Array.from({ length: Math.floor(positions.length / (size * 3)) }, (_, index) =>
    Array.from({ length: size }, (__, corner): Vec3 => {
      const at = (index * size + corner) * 3;
      return [positions[at] ?? 0, positions[at + 1] ?? 0, positions[at + 2] ?? 0];
    }),
  );

const groupBy = <T, K>(items: readonly T[], keyOf: (item: T) => K) => {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return groups;
};

/** Part of one solid that never covers itself: a flat cap, or the curved rest. */
interface Patch {
  solid: number;
  facets: readonly Facet[];
  /** Its middle's depth, for breaking a tie. */
  depth: number;
}

const patchesOf = (sketch: Sketch, solidIndex: number): Patch[] => {
  const facets = [...sketch.faces].flatMap(([token, positions]) =>
    triplesOf(positions, 3).flatMap((points) => facetOf(token, points) ?? []),
  );
  const facings = groupBy(facets, (facet) => facet.facing);
  const caps = [...facings.values()].filter((group) => group.length >= CAP);
  const side = facets.filter((facet) => (facings.get(facet.facing)?.length ?? 0) < CAP);
  return [...caps, side]
    .filter((group) => group.length > 0)
    .map((group) => {
      const depths = group.flatMap((facet) => facet.depths);
      let depth = 0;
      for (const value of depths) {
        depth += value / depths.length;
      }
      return { depth, facets: group, solid: solidIndex };
    });
};

/** How much more of `a` lies behind `b` than in front of it on screen: above zero, `a` goes first. */
const behind = (a: Patch, b: Patch) => {
  let votes = 0;
  for (const facetA of a.facets) {
    for (const facetB of b.facets) {
      const overlap = overlapOf(facetA, facetB);
      if (overlap) {
        const gap = depthAt(facetB, overlap.at) - depthAt(facetA, overlap.at);
        votes += Math.sign(gap) * overlap.area;
      }
    }
  }
  return votes;
};

/** The patch to draw next: the farthest nothing still waits under, or if a cycle leaves none, the farthest left. */
const nextOf = (patches: readonly Patch[], left: ReadonlySet<number>, waiting: number[]) => {
  let next = -1;
  let nextFree = false;
  for (const index of left) {
    const free = (waiting[index] ?? 0) === 0;
    const farther = (patches[index]?.depth ?? 0) < (patches[next]?.depth ?? 0);
    if (next < 0 || (free && !nextFree) || (free === nextFree && farther)) {
      next = index;
      nextFree = free;
    }
  }
  return next;
};

/** Patches back to front: each before every patch of another solid mostly in front of it. */
const ordered = (patches: readonly Patch[]) => {
  const after = patches.map((): number[] => []);
  const waiting = patches.map(() => 0);
  for (const [i, a] of patches.entries()) {
    for (const [j, b] of patches.entries()) {
      const votes = j > i && a.solid !== b.solid ? behind(a, b) : 0;
      if (votes !== 0) {
        const [far, near] = votes > 0 ? [i, j] : [j, i];
        after[far]?.push(near);
        waiting[near] = (waiting[near] ?? 0) + 1;
      }
    }
  }
  const left = new Set(patches.keys());
  const order: Patch[] = [];
  while (left.size > 0) {
    const next = nextOf(patches, left, waiting);
    left.delete(next);
    const patch = patches[next];
    if (patch) {
      order.push(patch);
    }
    for (const near of after[next] ?? []) {
      waiting[near] = (waiting[near] ?? 0) - 1;
    }
  }
  return order;
};

const keyOf = (point: Vec3) => point.map((n) => Math.round(n * 1e4)).join(",");
const edgeKey = (a: Vec3, b: Vec3) => [keyOf(a), keyOf(b)].toSorted().join("|");

const round = (n: number) => Math.round(n * 10) / 10;
const pathOf = (points: readonly Point[], closed: boolean) =>
  `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}${closed ? "Z" : ""}`;

/** A pen like the town's (`placed` in sketch.ts) that keeps each solid in a sketch of its own. */
const recorder = (sketches: Sketch[], place: (point: Vec3) => Vec3): Placed => {
  const fresh = () => {
    const sketch = createSketch();
    sketches.push(sketch);
    return sketch;
  };
  // Faces drawn straight onto the sketch (a buckle) share one, as the flat bits they are.
  const loose = fresh();
  const solidOf: Placed["solid"] = (triangles, weight, crease) =>
    solid(fresh(), mapTriangles(triangles, place), weight ?? "fine", crease);
  return {
    ball: (spec, weight) => solidOf(ballTriangles(spec), weight, 70),
    line: (points, weight, token) => line(fresh(), points.map(place), weight, token),
    moved: (move) => recorder(sketches, (point) => place(move(point))),
    place,
    rod: (from, to, r, colors) => solidOf(rodTriangles(from, to, r, colors)),
    round: (spec, weight) => solidOf(roundTriangles(spec), weight),
    sketch: loose,
    solid: solidOf,
  };
};

interface Stroke {
  d: string;
  stroke: string;
  width: number;
}

/** Each patch's ink: each stroke with the last patch drawn along it; one along none goes last. */
const inkOf = (sketches: readonly Sketch[], order: readonly Patch[], time: Time) => {
  const slot = new Map<string, number>();
  for (const [place, patch] of order.entries()) {
    for (const facet of patch.facets) {
      for (const [from, to] of facet.edges) {
        slot.set(edgeKey(from, to), place);
      }
    }
  }
  const strokes = new Map<number, Stroke[]>();
  for (const sketch of sketches) {
    for (const { positions, token, weight } of sketch.lines.values()) {
      for (const [from, to] of triplesOf(positions, 2)) {
        if (from && to) {
          const place = slot.get(edgeKey(from, to)) ?? order.length;
          const list = strokes.get(place) ?? [];
          list.push({
            d: pathOf([project(from), project(to)], false),
            stroke: PALETTE[token][time],
            width: WEIGHTS[weight],
          });
          strokes.set(place, list);
        }
      }
    }
  }
  return strokes;
};

/** Adds a layer, joining it to the last when it's the same color: one path, no seams. */
const addTo = (layers: PictureLayer[], layer: PictureLayer) => {
  const last = layers.at(-1);
  if (last?.kind === "faces" && layer.kind === "faces" && last.fill === layer.fill) {
    last.d += layer.d;
  } else if (
    last?.kind === "ink" &&
    layer.kind === "ink" &&
    last.stroke === layer.stroke &&
    last.width === layer.width
  ) {
    last.d += layer.d;
  } else {
    layers.push(layer);
  }
};

/** What `draw` draws, from the town's camera, in the colors of the time of day. */
export const pictureOf = (draw: (pen: Placed) => void, time: Time): Picture => {
  const sketches: Sketch[] = [];
  draw(recorder(sketches, (point) => point));
  const order = ordered(sketches.flatMap(patchesOf));
  const strokes = inkOf(sketches, order, time);

  const layers: PictureLayer[] = [];
  const inkAt = (place: number) => {
    for (const { d, stroke, width } of strokes.get(place) ?? []) {
      addTo(layers, { d, kind: "ink", stroke, width });
    }
  };
  for (const [place, patch] of order.entries()) {
    const byColor = groupBy(patch.facets, (facet) => facet.token);
    for (const [token, facets] of byColor) {
      const d = facets.map((facet) => pathOf(facet.corners, true)).join("");
      addTo(layers, { d, fill: PALETTE[token][time], kind: "faces", shaded: SHADE.has(token) });
    }
    inkAt(place);
  }
  inkAt(order.length);

  const corners = order.flatMap((patch) => patch.facets.flatMap((facet) => facet.corners));
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const pad = 4;
  const left = Math.min(...xs) - pad;
  const top = Math.min(...ys) - pad;
  const width = Math.max(...xs) + pad - left;
  const height = Math.max(...ys) + pad - top;
  return { box: [round(left), round(top), round(width), round(height)], layers };
};
