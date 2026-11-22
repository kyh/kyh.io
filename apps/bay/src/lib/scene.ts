export type Point = [number, number];

export type Ring = Point[];

export type AreaKind = "water" | "park" | "grass" | "wood" | "sand" | "pitch" | "pier";

export interface Area {
  kind: AreaKind;
  rings: Ring[];
}

export type RoadKind = "major" | "street" | "service" | "path" | "rail";

export interface Road {
  kind: RoadKind;
  width: number;
  line: Point[];
  bridge: boolean;
}

export type BuildingLook = "house" | "block" | "tower";

export interface Building {
  id: string;
  rings: Ring[];
  base: number;
  top: number;
  look: BuildingLook;
  tone: number;
  spire?: Spire;
}

export interface Spire {
  e: number;
  n: number;
  side: number;
  top: number;
}

export interface Tree {
  e: number;
  n: number;
  r: number;
  tone: number;
}

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

export interface Crossing {
  e: number;
  n: number;
  angle: number;
  width: number;
}

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

const MODULUS = 2_147_483_647;

export const seeded = (seed: number) => {
  let state = Math.abs(Math.floor(seed)) % MODULUS || 1;

  return () => {
    state = (state * 48_271) % MODULUS;

    return (state - 1) / (MODULUS - 1);
  };
};

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

export const touches = (box: Box, points: Point[], pad = 0) => {
  const es = points.map((p) => p[0]);
  const ns = points.map((p) => p[1]);

  return (
    points.length > 0 &&
    Math.max(...es) >= box.e0 - pad &&
    Math.min(...es) <= box.e1 + pad &&
    Math.max(...ns) >= box.n0 - pad &&
    Math.min(...ns) <= box.n1 + pad
  );
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

export const inArea = (rings: Ring[], e: number, n: number) => {
  const [outer, ...holes] = rings;

  return outer !== undefined && inRing(outer, e, n) && !holes.some((h) => inRing(h, e, n));
};

export const lookOf: (footprint: number, height: number) => BuildingLook = (footprint, height) => {
  if (height >= 45) {
    return "tower";
  }

  return footprint < 300 && height < 15 ? "house" : "block";
};

export const canopyOf = (dbh: number) => Math.min(6, Math.max(1.6, 1.4 + dbh * 0.13));

const SPACING: Partial<Record<AreaKind, number>> = { park: 16, wood: 7 };

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

export const roadOf: (cls: string) => { kind: RoadKind; width: number } | null = (cls) => {
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

export const areaOf: (layer: string, cls: string) => AreaKind | null = (layer, cls) => {
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

export const centroid: (ring: Ring) => Point | null = (ring) => {
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

const SPIRE_RISE = 15;

export const spireOf: (rings: Ring[], top: number, peak: number) => Spire | null = (
  rings,
  top,
  peak,
) => {
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

const SAME = 6;

const JUNCTION = Math.sin((30 * Math.PI) / 180);

const squareness = (a: Point, b: Point, c: Point, d: Point) => {
  const u = [b[0] - a[0], b[1] - a[1]];
  const v = [d[0] - c[0], d[1] - c[1]];
  const length = Math.hypot(u[0] ?? 0, u[1] ?? 0) * Math.hypot(v[0] ?? 0, v[1] ?? 0);

  return length === 0
    ? 0
    : Math.abs((u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0)) / length;
};

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

          const t =
            a && b && c && d && squareness(a, b, c, d) >= JUNCTION ? meet(a, b, c, d) : null;

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

const BORROWED = 25;

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
