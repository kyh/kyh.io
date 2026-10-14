// Where everything in the city goes, worked out once and deterministically:
// the island's coast, the road grid, what each block holds, and which lot
// each project's building stands on. Pure data, no drawing, so it can be
// tested without a browser.
import { createRandom, hashString } from "./random";

/** Cells along each side of the square the island lies in. */
const GRID = 72;
/** Roads run every `PERIOD` cells: a one-cell road, then a six-cell block. */
const PERIOD = 7;
const FIRST_ROAD = 4;
const ROAD_LINES = Array.from({ length: 10 }, (_, index) => FIRST_ROAD + index * PERIOD);
const CENTER = GRID / 2;
/** The island's radii along the screen's width (u) and depth (v), in cells. */
const RADIUS_U = 34.5;
const RADIUS_V = 25.5;

export type Point2 = readonly [number, number];

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** How big a lot a building needs. */
export type LotSize = "large" | "half" | "quarter" | "template" | "launch";

export type BlockUse =
  | "landmark"
  | "halves"
  | "quarters"
  | "templates"
  | "offices"
  | "apartments"
  | "houses"
  | "park"
  | "plaza";

export interface Block extends Rect {
  bx: number;
  bz: number;
  use: BlockUse;
  /** Rings out from the center block: 0 downtown, larger toward the coast. */
  ring: number;
  seed: number;
}

export interface Lot extends Rect {
  slug: string;
  size: LotSize;
}

export interface Junction {
  id: string;
  x: number;
  z: number;
}

/** A stretch of road between two junctions, along x or along z. */
export interface Road {
  from: string;
  to: string;
  axis: "x" | "z";
}

const toGrid = (u: number, v: number): Point2 => [
  CENTER + (u + v) * Math.SQRT1_2,
  CENTER + (v - u) * Math.SQRT1_2,
];

const toScreenAxes = (x: number, z: number): Point2 => [
  (x - CENTER - (z - CENTER)) * Math.SQRT1_2,
  (x - CENTER + (z - CENTER)) * Math.SQRT1_2,
];

/** How far the coast reaches at polar angle `angle`, as a multiple of the ellipse. */
const reach = (angle: number) =>
  1 +
  0.07 * Math.sin(3 * angle + 0.6) +
  0.045 * Math.sin(5 * angle + 2.1) +
  0.028 * Math.sin(8 * angle + 4.2) +
  0.016 * Math.sin(13 * angle + 1.3);

/** Signed distance (in cells, roughly) from the coast: positive on land. */
export const inland = (x: number, z: number) => {
  const [u, v] = toScreenAxes(x, z);
  const nu = u / RADIUS_U;
  const nv = v / RADIUS_V;
  const rho = Math.hypot(nu, nv);
  const angle = Math.atan2(nv, nu);
  const radius = Math.hypot(Math.cos(angle) * RADIUS_U, Math.sin(angle) * RADIUS_V);
  return (reach(angle) - rho) * radius;
};

/** The coast, or a line `offset` cells out to sea (negative: inland). */
export const coastline = (offset = 0, samples = 240): Point2[] =>
  Array.from({ length: samples }, (_, index) => {
    const angle = (index / samples) * Math.PI * 2;
    const r = reach(angle);
    const u = Math.cos(angle) * RADIUS_U;
    const v = Math.sin(angle) * RADIUS_V;
    const out = offset / Math.hypot(u, v);
    return toGrid(u * (r + out), v * (r + out));
  });

const junctionId = (i: number, j: number) => `${i}:${j}`;

const isCityBlock = (bx: number, bz: number) => {
  const x0 = ROAD_LINES[bx];
  const z0 = ROAD_LINES[bz];
  if (x0 === undefined || z0 === undefined) {
    return false;
  }
  const x1 = x0 + PERIOD + 1;
  const z1 = z0 + PERIOD + 1;
  const corners: Point2[] = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  return corners.every(([x, z]) => inland(x, z) > 1.2);
};

const centerBlock = (FIRST_ROAD + CENTER) / PERIOD;

const findBlocks = () => {
  const found: { bx: number; bz: number; ring: number }[] = [];
  for (let bx = 0; bx < ROAD_LINES.length - 1; bx += 1) {
    for (let bz = 0; bz < ROAD_LINES.length - 1; bz += 1) {
      if (isCityBlock(bx, bz)) {
        const ring = Math.max(
          Math.abs(bx - Math.floor(centerBlock) + 1),
          Math.abs(bz - Math.floor(centerBlock) + 1),
        );
        found.push({ bx, bz, ring });
      }
    }
  }
  return found;
};

const findRoads = (blocks: readonly { bx: number; bz: number }[]) => {
  const roads = new Map<string, Road>();
  const add = (i0: number, j0: number, i1: number, j1: number) => {
    const from = junctionId(i0, j0);
    const to = junctionId(i1, j1);
    roads.set(`${from}>${to}`, { axis: i0 === i1 ? "z" : "x", from, to });
  };
  for (const { bx, bz } of blocks) {
    add(bx, bz, bx + 1, bz);
    add(bx, bz + 1, bx + 1, bz + 1);
    add(bx, bz, bx, bz + 1);
    add(bx + 1, bz, bx + 1, bz + 1);
  }
  const junctions = new Map<string, Junction>();
  for (const road of roads.values()) {
    for (const id of [road.from, road.to]) {
      const [i = 0, j = 0] = id.split(":").map(Number);
      junctions.set(id, {
        id,
        x: (ROAD_LINES[i] ?? 0) + 0.5,
        z: (ROAD_LINES[j] ?? 0) + 0.5,
      });
    }
  }
  return { junctions: [...junctions.values()], roads: [...roads.values()] };
};

const planGrid = () => {
  const blocks = findBlocks();
  return { blocks, coast: coastline(), ...findRoads(blocks) };
};

const blockRect = (bx: number, bz: number): Rect => ({
  d: PERIOD - 1,
  w: PERIOD - 1,
  x: (ROAD_LINES[bx] ?? 0) + 1,
  z: (ROAD_LINES[bz] ?? 0) + 1,
});

/**
 * What each block holds, art-directed for the flyover: Founding's tower at
 * the center with the other big projects around it, the smaller ones spread
 * left to right. Blocks missing here (a different coast) fall back to homes.
 */
const BLOCK_USES = {
  "1,4": "houses",
  "1,5": "houses",
  "1,6": "houses",
  "2,2": "park",
  "2,3": "houses",
  "2,4": "landmark",
  "2,5": "apartments",
  "2,6": "landmark",
  "2,7": "templates",
  "3,2": "apartments",
  "3,3": "offices",
  "3,4": "landmark",
  "3,5": "offices",
  "3,6": "halves",
  "3,7": "park",
  "4,2": "houses",
  "4,3": "landmark",
  "4,4": "landmark",
  "4,5": "offices",
  "4,6": "plaza",
  "4,7": "houses",
  "5,2": "park",
  "5,3": "landmark",
  "5,4": "offices",
  "5,5": "landmark",
  "5,6": "apartments",
  "6,1": "houses",
  "6,2": "apartments",
  "6,3": "halves",
  "6,4": "quarters",
  "6,5": "halves",
  "7,1": "park",
  "7,2": "landmark",
  "7,3": "houses",
  "7,4": "houses",
} satisfies Record<string, BlockUse>;

const blockUses = new Map<string, BlockUse>(Object.entries(BLOCK_USES));

interface Slot extends Rect {
  key: string;
  size: LotSize;
  ring: number;
}

const slotsFor = (block: Block): Slot[] => {
  const base = `${block.bx},${block.bz}`;
  const { ring, x, z } = block;
  const slot = (key: string, size: LotSize, rect: Rect): Slot => ({ ...rect, key, ring, size });
  switch (block.use) {
    case "landmark": {
      return [slot(base, "large", block)];
    }
    case "halves": {
      return [
        slot(`${base}:back`, "half", { d: 3, w: 6, x, z }),
        slot(`${base}:front`, "half", { d: 3, w: 6, x, z: z + 3 }),
      ];
    }
    case "quarters": {
      return [
        slot(`${base}:nw`, "quarter", { d: 3, w: 3, x, z }),
        slot(`${base}:ne`, "quarter", { d: 3, w: 3, x: x + 3, z }),
        slot(`${base}:sw`, "quarter", { d: 3, w: 3, x, z: z + 3 }),
        slot(`${base}:se`, "quarter", { d: 3, w: 3, x: x + 3, z: z + 3 }),
      ];
    }
    case "templates": {
      return [
        slot(`${base}:t0`, "template", { d: 3, w: 2, x, z: z + 3 }),
        slot(`${base}:t1`, "template", { d: 3, w: 2, x: x + 2, z: z + 3 }),
        slot(`${base}:t2`, "template", { d: 3, w: 2, x: x + 4, z: z + 3 }),
        slot(`${base}:t3`, "template", { d: 3, w: 3, x, z }),
        slot(`${base}:t4`, "template", { d: 3, w: 3, x: x + 3, z }),
      ];
    }
    default: {
      return [];
    }
  }
};

/** Smaller lots a project can fall back to when its own size is taken. */
const FALLBACK: Record<LotSize, LotSize[]> = {
  half: ["half", "quarter", "large"],
  large: ["large", "half", "quarter"],
  launch: ["launch", "large", "half", "quarter"],
  quarter: ["quarter", "half", "template", "large"],
  template: ["template", "quarter", "half"],
};

const byRing = (a: Slot, b: Slot) => a.ring - b.ring || a.key.localeCompare(b.key);

/**
 * Every project gets a lot: its preferred one if free, else the nearest
 * free lot of its size, then of a fallback size. When the city runs out, the
 * outermost homes make way for a block of small lots.
 */
const assignLots = (entries: readonly PlanEntry[], blocks: Block[], launch: Slot | null): Lot[] => {
  const slots = blocks.flatMap(slotsFor);
  if (launch) {
    slots.push(launch);
  }
  const free = new Map(slots.map((slot) => [slot.key, slot]));
  const lots: Lot[] = [];
  const take = (slot: Slot, slug: string) => {
    free.delete(slot.key);
    lots.push({ d: slot.d, size: slot.size, slug, w: slot.w, x: slot.x, z: slot.z });
  };
  const pending: PlanEntry[] = [];
  for (const entry of entries) {
    const preferred = entry.home === undefined ? undefined : free.get(entry.home);
    if (preferred) {
      take(preferred, entry.slug);
    } else {
      pending.push(entry);
    }
  }
  for (const entry of pending) {
    const candidates = FALLBACK[entry.size]
      .map((size) => [...free.values()].filter((candidate) => candidate.size === size))
      .find((sized) => sized.length > 0);
    let [slot] = candidates?.toSorted(byRing) ?? [];
    if (!slot) {
      const [spare] = blocks
        .filter((block) => block.use === "houses")
        .toSorted((a, b) => b.ring - a.ring || a.seed - b.seed);
      if (spare) {
        spare.use = "quarters";
        const created = slotsFor(spare);
        for (const extra of created) {
          free.set(extra.key, extra);
        }
        [slot] = created;
      }
    }
    if (slot) {
      take(slot, entry.slug);
    }
  }
  // Lots nobody claimed still get a building: an unnamed one.
  for (const slot of free.values()) {
    lots.push({ d: slot.d, size: slot.size, slug: "", w: slot.w, x: slot.x, z: slot.z });
  }
  return lots;
};

// Countryside: everything on the island outside the grid.

export type TreeKind = "round" | "pine" | "poplar";

export interface Tree {
  x: number;
  z: number;
  kind: TreeKind;
  size: number;
}

export type Crop = "wheat" | "green" | "soil";

export interface Field extends Rect {
  crop: Crop;
  rows: "x" | "z";
}

export interface Spot {
  x: number;
  z: number;
  seed: number;
}

export interface Countryside {
  trees: Tree[];
  fields: Field[];
  barns: Spot[];
  windmills: Spot[];
  turbines: Spot[];
  lighthouse: Spot | null;
  pier: Rect | null;
  launch: Slot | null;
}

const FREE = 0;
const WATER = 1;
const TAKEN = 2;

const createOccupancy = (blocks: readonly { bx: number; bz: number }[]) => {
  const cells = Array.from({ length: GRID * GRID }, (_, index): number => {
    const x = index % GRID;
    const z = Math.floor(index / GRID);
    return inland(x + 0.5, z + 0.5) > 0.6 ? FREE : WATER;
  });
  const mark = (rect: Rect, value: number) => {
    for (let z = Math.floor(rect.z); z < Math.ceil(rect.z + rect.d); z += 1) {
      for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.w); x += 1) {
        if (x >= 0 && z >= 0 && x < GRID && z < GRID) {
          cells[z * GRID + x] = value;
        }
      }
    }
  };
  for (const { bx, bz } of blocks) {
    const rect = blockRect(bx, bz);
    // The block, its roads, and a cell of verge around them.
    mark({ d: rect.d + 4, w: rect.w + 4, x: rect.x - 2, z: rect.z - 2 }, TAKEN);
  }
  const isFree = (rect: Rect) => {
    for (let z = Math.floor(rect.z); z < Math.ceil(rect.z + rect.d); z += 1) {
      for (let x = Math.floor(rect.x); x < Math.ceil(rect.x + rect.w); x += 1) {
        if (x < 0 || z < 0 || x >= GRID || z >= GRID || cells[z * GRID + x] !== FREE) {
          return false;
        }
      }
    }
    return true;
  };
  return { isFree, mark };
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise in [0, 1), from a seeded lattice. */
const createNoise = (seed: number, cell: number) => {
  const random = createRandom(seed);
  const size = Math.ceil(GRID / cell) + 2;
  const lattice = Array.from({ length: size * size }, () => random.next());
  const at = (i: number, j: number) => lattice[(j % size) * size + (i % size)] ?? 0;
  return (x: number, z: number) => {
    const fx = x / cell;
    const fz = z / cell;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = smooth(fx - i);
    const tz = smooth(fz - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * tx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx;
    return top + (bottom - top) * tz;
  };
};

/** The leftmost clear square on the coast: Init's launch pad, far from town. */
const findLaunchSite = (occupancy: ReturnType<typeof createOccupancy>): Slot | null => {
  let best: Slot | null = null;
  let bestScore = Infinity;
  for (let z = 0; z < GRID - 6; z += 1) {
    for (let x = 0; x < GRID - 6; x += 1) {
      const rect = { d: 6, w: 6, x, z };
      // Leftmost on screen is the smallest x - z.
      const score = x - z;
      if (score < bestScore && occupancy.isFree(rect)) {
        best = { ...rect, key: "launch", ring: 9, size: "launch" };
        bestScore = score;
      }
    }
  }
  return best;
};

/** A pier from the near shore, straight out toward the camera. */
const findPier = (occupancy: ReturnType<typeof createOccupancy>): Rect | null => {
  for (let x = 48; x > 30; x -= 1) {
    let z = 40;
    while (z < GRID - 1 && inland(x + 1, z + 1) > 0) {
      z += 1;
    }
    const rect = { d: 6, w: 2, x, z: z - 2 };
    if (inland(x + 1, z - 2) > 0.3 && occupancy.isFree({ d: 2, w: 2, x, z: z - 3 })) {
      return rect;
    }
  }
  return null;
};

const findCoastSpot = (
  occupancy: ReturnType<typeof createOccupancy>,
  near: Point2,
  seed: number,
): Spot | null => {
  let best: Spot | null = null;
  let bestDistance = Infinity;
  for (let z = 1; z < GRID - 2; z += 1) {
    for (let x = 1; x < GRID - 2; x += 1) {
      const depth = inland(x + 1, z + 1);
      const distance = Math.hypot(x - near[0], z - near[1]);
      if (
        depth > 1 &&
        depth < 2.6 &&
        distance < bestDistance &&
        occupancy.isFree({ d: 2, w: 2, x, z })
      ) {
        best = { seed, x: x + 1, z: z + 1 };
        bestDistance = distance;
      }
    }
  }
  return best;
};

const placeFields = (occupancy: ReturnType<typeof createOccupancy>, seed: number) => {
  const random = createRandom(seed);
  const fields: Field[] = [];
  const barns: Spot[] = [];
  const crops: Crop[] = ["wheat", "green", "wheat", "soil", "green"];
  // Farmland lies on the far side of town, along the top of the screen.
  for (let attempt = 0; attempt < 400 && fields.length < 16; attempt += 1) {
    const w = random.int(3, 6);
    const d = random.int(3, 6);
    const x = random.int(8, 50);
    const z = random.int(6, 30);
    const rect = { d, w, x, z };
    const [, v] = toScreenAxes(x + w / 2, z + d / 2);
    if (v < -12 && occupancy.isFree(rect)) {
      occupancy.mark({ d: d + 1, w: w + 1, x, z }, TAKEN);
      fields.push({ ...rect, crop: random.pick(crops), rows: random.chance(0.5) ? "x" : "z" });
      if (random.chance(0.4) && occupancy.isFree({ d: 2, w: 2, x: x + w + 1, z })) {
        occupancy.mark({ d: 2, w: 2, x: x + w + 1, z }, TAKEN);
        barns.push({ seed: random.int(0, 1000), x: x + w + 2, z: z + 1 });
      }
    }
  }
  return { barns, fields };
};

const placeTrees = (occupancy: ReturnType<typeof createOccupancy>, seed: number) => {
  const random = createRandom(seed);
  const noise = createNoise(seed, 6);
  const trees: Tree[] = [];
  for (let z = 0; z < GRID; z += 1) {
    for (let x = 0; x < GRID; x += 1) {
      const density = noise(x, z);
      const cell = { d: 1, w: 1, x, z };
      if (occupancy.isFree(cell) && inland(x + 0.5, z + 0.5) > 1) {
        const count = density > 0.56 ? 2 : Number(random.chance(0.08));
        for (let index = 0; index < count; index += 1) {
          const kind = density > 0.7 ? "pine" : random.pick<TreeKind>(["round", "pine", "poplar"]);
          trees.push({
            kind,
            size: random.range(0.8, 1.25),
            x: x + random.range(0.2, 0.8),
            z: z + random.range(0.2, 0.8),
          });
        }
      }
    }
  }
  return trees;
};

const planCountryside = (blocks: readonly { bx: number; bz: number }[], seed: number) => {
  const occupancy = createOccupancy(blocks);
  const launch = findLaunchSite(occupancy);
  if (launch) {
    occupancy.mark({ d: launch.d + 2, w: launch.w + 2, x: launch.x - 1, z: launch.z - 1 }, TAKEN);
  }
  const pier = findPier(occupancy);
  if (pier) {
    occupancy.mark({ d: 4, w: 4, x: pier.x - 1, z: pier.z - 3 }, TAKEN);
  }
  const lighthouse = findCoastSpot(occupancy, [66, 14], seed + 1);
  if (lighthouse) {
    occupancy.mark({ d: 3, w: 3, x: lighthouse.x - 1, z: lighthouse.z - 1 }, TAKEN);
  }
  const { barns, fields } = placeFields(occupancy, seed + 2);
  const random = createRandom(seed + 3);
  const turbines: Spot[] = [];
  const windmills: Spot[] = [];
  for (const near of [
    [12, 26],
    [20, 13],
    [33, 8],
    [46, 6],
  ] satisfies Point2[]) {
    const spot = findCoastSpot(occupancy, near, random.int(0, 1000));
    if (spot) {
      occupancy.mark({ d: 3, w: 3, x: spot.x - 1, z: spot.z - 1 }, TAKEN);
      turbines.push(spot);
    }
  }
  for (const barn of barns.slice(0, 2)) {
    const spot = { d: 2, w: 2, x: barn.x - 1, z: barn.z + 2 };
    if (occupancy.isFree(spot)) {
      occupancy.mark(spot, TAKEN);
      windmills.push({ seed: barn.seed, x: barn.x, z: barn.z + 3 });
    }
  }
  const trees = placeTrees(occupancy, seed + 4);
  return { barns, fields, launch, lighthouse, pier, trees, turbines, windmills };
};

export interface PlanEntry {
  slug: string;
  size: LotSize;
  /** The lot this project's building should stand on, if free. */
  home?: string;
}

export interface CityPlan {
  coast: Point2[];
  blocks: Block[];
  lots: Lot[];
  junctions: Junction[];
  roads: Road[];
  countryside: Countryside;
}

export const planCity = (entries: readonly PlanEntry[], seed = 7): CityPlan => {
  const grid = planGrid();
  const blocks: Block[] = grid.blocks.map(({ bx, bz, ring }) => {
    const fallback: BlockUse = ring <= 1 ? "offices" : "houses";
    return {
      ...blockRect(bx, bz),
      bx,
      bz,
      ring,
      seed: hashString(`${seed}:${bx}:${bz}`),
      use: blockUses.get(`${bx},${bz}`) ?? fallback,
    };
  });
  const countryside = planCountryside(grid.blocks, seed);
  return {
    blocks,
    coast: grid.coast,
    countryside,
    junctions: grid.junctions,
    lots: assignLots(entries, blocks, countryside.launch),
    roads: grid.roads,
  };
};
