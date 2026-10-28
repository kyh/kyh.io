// What a frame shows, built from open data and nothing else: the ground's heights, what covers it
// (water, parks, sand), the roads, every building with its measured roof, and the trees. All in
// local metres (grid.ts). Pure: the pipeline builds it, the render page draws it.

export type Point = [number, number];
export type Ring = Point[];

export type AreaKind = "water" | "park" | "grass" | "wood" | "sand" | "pitch" | "pier";

export interface Area {
  kind: AreaKind;
  // the outer ring first, then its holes
  rings: Ring[];
}

export type RoadKind = "major" | "street" | "service" | "path" | "rail";

export interface Road {
  kind: RoadKind;
  // full width of the carriageway, metres
  width: number;
  line: Point[];
  bridge: boolean;
}

export type BuildingLook = "house" | "block" | "tower";

export interface Building {
  id: string;
  rings: Ring[];
  // the ground under it and its roof, metres up in local terms
  base: number;
  top: number;
  look: BuildingLook;
  // which of its look's colours it wears
  tone: number;
  // a tower standing above the roof (a clock tower, a spire, a stepped top), where it has one
  spire?: Spire;
}

export interface Spire {
  e: number;
  n: number;
  // the side of its square, metres
  side: number;
  top: number;
}

export interface Tree {
  e: number;
  n: number;
  // canopy radius, metres
  r: number;
  tone: number;
}

// the ground's heights on a regular grid, local metres up, row by row from the south-west
export interface Terrain {
  e0: number;
  n0: number;
  step: number;
  cols: number;
  rows: number;
  heights: number[];
}

export interface Box {
  e0: number;
  n0: number;
  e1: number;
  n1: number;
}

export interface Scene {
  box: Box;
  terrain: Terrain;
  areas: Area[];
  roads: Road[];
  buildings: Building[];
  trees: Tree[];
  crossings: Crossing[];
}

// a zebra crossing: where its middle is, which way the road it crosses runs, and how wide it is
export interface Crossing {
  e: number;
  n: number;
  angle: number;
  width: number;
}

// the ground's height at a point, bilinear between the grid's, held at its edges
export const heightAt = (t: Terrain, e: number, n: number) => {
  const x = Math.min(t.cols - 1, Math.max(0, (e - t.e0) / t.step));
  const y = Math.min(t.rows - 1, Math.max(0, (n - t.n0) / t.step));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(t.cols - 1, x0 + 1);
  const y1 = Math.min(t.rows - 1, y0 + 1);
  const h = (cx: number, cy: number) => t.heights[cy * t.cols + cx] ?? 0;
  const fx = x - x0;
  const fy = y - y0;
  return (
    (h(x0, y0) * (1 - fx) + h(x1, y0) * fx) * (1 - fy) +
    (h(x0, y1) * (1 - fx) + h(x1, y1) * fx) * fy
  );
};

// Park–Miller, as kyh's town seeds itself: the same scene every time a frame is drawn
const MODULUS = 2_147_483_647;

export const seeded = (seed: number) => {
  let state = Math.abs(Math.floor(seed)) % MODULUS || 1;
  return () => {
    state = (state * 48_271) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
};

// a string's seed, so a building or a park always draws the same
export const hash = (text: string) => {
  let h = 7;
  for (const char of text) {
    h = (h * 31 + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return h;
};

export const area = (ring: Ring) => {
  let s = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (a && b) {
      s += a[0] * b[1] - b[0] * a[1];
    }
  }
  return Math.abs(s) / 2;
};

export const inRing = (ring: Ring, e: number, n: number) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (
      a &&
      b &&
      a[1] > n !== b[1] > n &&
      e < ((b[0] - a[0]) * (n - a[1])) / (b[1] - a[1]) + a[0]
    ) {
      inside = !inside;
    }
  }
  return inside;
};

// inside the outer ring and out of every hole
export const inArea = (rings: Ring[], e: number, n: number) => {
  const [outer, ...holes] = rings;
  return outer !== undefined && inRing(outer, e, n) && !holes.some((h) => inRing(h, e, n));
};

// what a building looks like from its size: small and low a house, tall a tower, else a block
export const lookOf = (footprint: number, height: number): BuildingLook => {
  if (height >= 45) {
    return "tower";
  }
  return footprint < 300 && height < 15 ? "house" : "block";
};

// a canopy's radius from the trunk's diameter at breast height (inches), as DataSF counts it
export const canopyOf = (dbh: number) => Math.min(6, Math.max(1.6, 1.4 + dbh * 0.13));

// the spacing of the trees a park or a wood grows, metres; none on plain grass
const SPACING: Partial<Record<AreaKind, number>> = { park: 16, wood: 7 };

// trees for the parks and woods that have none on record: a jittered grid, the same every time
export const scatterTrees = (areas: Area[], box: Box) => {
  const trees: Tree[] = [];
  for (const a of areas) {
    const gap = SPACING[a.kind];
    const [outer] = a.rings;
    if (!(gap && outer)) {
      continue;
    }
    const es = outer.map((p) => p[0]);
    const ns = outer.map((p) => p[1]);
    const e0 = Math.max(box.e0, Math.min(...es));
    const e1 = Math.min(box.e1, Math.max(...es));
    const n0 = Math.max(box.n0, Math.min(...ns));
    const n1 = Math.min(box.n1, Math.max(...ns));
    for (let n = Math.floor(n0 / gap) * gap; n < n1; n += gap) {
      for (let e = Math.floor(e0 / gap) * gap; e < e1; e += gap) {
        // seeded by the cell, not the area, so a park cut across two frames grows the same trees
        const rand = seeded(hash(`${Math.round(e)}:${Math.round(n)}:${a.kind}`));
        const te = e + rand() * gap;
        const tn = n + rand() * gap;
        if (rand() < 0.8 && inArea(a.rings, te, tn)) {
          trees.push({
            e: te,
            n: tn,
            r: gap * (0.35 + rand() * 0.25),
            tone: Math.floor(rand() * 4),
          });
        }
      }
    }
  }
  return trees;
};

// a road's width from its class in the OpenMapTiles schema, and what kind of road it draws as
export const roadOf = (cls: string): { kind: RoadKind; width: number } | null => {
  switch (cls) {
    case "motorway":
    case "trunk": {
      return { kind: "major", width: 18 };
    }
    case "primary": {
      return { kind: "major", width: 15 };
    }
    case "secondary":
    case "tertiary": {
      return { kind: "street", width: 12 };
    }
    case "minor": {
      return { kind: "street", width: 9 };
    }
    case "service": {
      return { kind: "service", width: 5 };
    }
    case "path":
    case "track": {
      return { kind: "path", width: 2.5 };
    }
    case "rail":
    case "transit": {
      return { kind: "rail", width: 3 };
    }
    default: {
      return null;
    }
  }
};

// what a ground polygon covers, from its OpenMapTiles layer and class
export const areaOf = (layer: string, cls: string): AreaKind | null => {
  if (layer === "water") {
    return "water";
  }
  if (layer === "park") {
    return "park";
  }
  if (layer === "landcover") {
    switch (cls) {
      case "grass": {
        return "grass";
      }
      case "wood": {
        return "wood";
      }
      case "sand": {
        return "sand";
      }
      case "wetland": {
        return "grass";
      }
      default: {
        return null;
      }
    }
  }
  if (layer === "landuse") {
    switch (cls) {
      case "pitch":
      case "stadium": {
        return "pitch";
      }
      case "cemetery": {
        return "grass";
      }
      default: {
        return null;
      }
    }
  }
  return null;
};

// the middle of a ring by area (the shoelace centroid), or null for a ring with no area
export const centroid = (ring: Ring): Point | null => {
  let a = 0;
  let e = 0;
  let n = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    if (p && q) {
      const cross = p[0] * q[1] - q[0] * p[1];
      a += cross;
      e += (p[0] + q[0]) * cross;
      n += (p[1] + q[1]) * cross;
    }
  }
  return Math.abs(a) < 1e-9 ? null : [e / (3 * a), n / (3 * a)];
};

// how far the highest point must stand above the roof to be a tower, metres: less is chimneys,
// plant and the odd overhanging tree in the LiDAR
const SPIRE_RISE = 15;

// a building's tower from its LiDAR peak: where its footprint's middle is, a square a sixth of the
// footprint across (4 to 12 m), up to the peak. The data has no place for the peak, so it stands
// in the middle, as the Ferry Building's clock tower does.
export const spireOf = (rings: Ring[], top: number, peak: number): Spire | null => {
  const [outer] = rings;
  if (!outer || peak - top < SPIRE_RISE || area(outer) < 400) {
    return null;
  }
  const middle = centroid(outer);
  if (!(middle && inArea(rings, middle[0], middle[1]))) {
    return null;
  }
  const side = Math.min(12, Math.max(4, Math.sqrt(area(outer)) / 6));
  return { e: middle[0], n: middle[1], side, top: peak };
};

// where two segments cross, as the distance along the first (0 to 1), or null
const meet = (a: Point, b: Point, c: Point, d: Point) => {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = (r[0] ?? 0) * (s[1] ?? 0) - (r[1] ?? 0) * (s[0] ?? 0);
  if (Math.abs(den) < 1e-9) {
    return null;
  }
  const t = ((c[0] - a[0]) * (s[1] ?? 0) - (c[1] - a[1]) * (s[0] ?? 0)) / den;
  const u = ((c[0] - a[0]) * (r[1] ?? 0) - (c[1] - a[1]) * (r[0] ?? 0)) / den;
  const slack = 1e-6;
  return t >= -slack && t <= 1 + slack && u >= -slack && u <= 1 + slack ? t : null;
};

// how far a point is from a polyline, metres
const distanceTo = (line: Point[], e: number, n: number) => {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < line.length; i += 1) {
    const a = line[i];
    const b = line[i + 1];
    if (a && b) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = Math.max(
        0,
        Math.min(1, ((e - a[0]) * dx + (n - a[1]) * dy) / (dx * dx + dy * dy || 1)),
      );
      best = Math.min(best, Math.hypot(a[0] + dx * t - e, a[1] + dy * t - n));
    }
  }
  return best;
};

// crossings closer than this to one already placed are the same junction's, metres
const SAME = 6;

// zebra crossings at every junction of streets: across each road, a step back from the junction
// on each side (half the other road's width, plus a sidewalk), wherever the road goes on there
export const crossingsOf = (roads: Road[]) => {
  const streets = roads.filter((r) => (r.kind === "street" || r.kind === "major") && !r.bridge);
  const crossings: Crossing[] = [];
  const place = (road: Road, other: Road, at: Point, a: Point, b: Point) => {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const step = other.width / 2 + 2.5;
    for (const side of [-1, 1]) {
      const e = at[0] + Math.cos(angle) * step * side;
      const n = at[1] + Math.sin(angle) * step * side;
      const near = crossings.some((c) => Math.hypot(c.e - e, c.n - n) < SAME);
      if (!near && distanceTo(road.line, e, n) < 1) {
        crossings.push({ angle, e, n, width: road.width });
      }
    }
  };
  for (const [x, one] of streets.entries()) {
    for (const two of streets.slice(x + 1)) {
      for (let i = 0; i + 1 < one.line.length; i += 1) {
        for (let j = 0; j + 1 < two.line.length; j += 1) {
          const [a, b, c, d] = [one.line[i], one.line[i + 1], two.line[j], two.line[j + 1]];
          const t = a && b && c && d ? meet(a, b, c, d) : null;
          if (a && b && c && d && t !== null) {
            const at: Point = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            place(one, two, at, a, b);
            place(two, one, at, c, d);
          }
        }
      }
    }
  }
  return crossings;
};

// the gap between two footprints' bounding boxes, metres (0 when they overlap)
const gapBetween = (a: Ring, b: Ring) => {
  const box = (r: Ring) => ({
    e0: Math.min(...r.map((p) => p[0])),
    e1: Math.max(...r.map((p) => p[0])),
    n0: Math.min(...r.map((p) => p[1])),
    n1: Math.max(...r.map((p) => p[1])),
  });
  const p = box(a);
  const q = box(b);
  return Math.hypot(Math.max(0, p.e0 - q.e1, q.e0 - p.e1), Math.max(0, p.n0 - q.n1, q.n0 - p.n1));
};

// how near a building as tall as a tower's peak makes the peak its, metres
const BORROWED = 25;

// towers taken off buildings whose peak a taller neighbour lent them: a tower's facade leaning
// into the LiDAR of the block beside it reads as that block's peak
export const withoutBorrowedSpires = (buildings: Building[]) =>
  buildings.map((b) => {
    const [outer] = b.rings;
    const { spire } = b;
    if (!(spire && outer)) {
      return b;
    }
    const lent = buildings.some((o) => {
      const [other] = o.rings;
      return (
        o !== b &&
        other !== undefined &&
        o.top >= spire.top - 8 &&
        gapBetween(outer, other) < BORROWED
      );
    });
    return lent ? { ...b, spire: undefined } : b;
  });
