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
