// The town around the projects: cottages, apartments, office towers, parks
// and a square, each drawn to fill one six-by-six block.
import type { Footprint } from "./draw-kit";
import type { Paint, Token } from "./palette";
import type { Block, Tree } from "./plan";
import type { Random } from "./random";
import type { Side, Sketch } from "./sketch";
import {
  bench,
  board,
  bush,
  door,
  FLOOR,
  groundLoop,
  inset,
  lamp,
  parapet,
  parkedCar,
  plate,
  ribbons,
  rooftop,
  storefront,
  tree,
  windows,
} from "./draw-kit";
import { ACCENTS, paint, ROOF_GRAY, ROOFS, WALLS } from "./palette";
import { createRandom } from "./random";
import { ball, box, ellipse, face, gable, ground, hip, round } from "./sketch";

export const CURB_TOP = 0.04;
const LAWN = paint("lawn", "lawn", "lawn");
const PAVING = paint("paving", "wallLeft", "wallRight");

export interface HouseSpec extends Footprint {
  floors: number;
  roof: Paint;
  ridge: "x" | "z";
  hipped: boolean;
  chimney: boolean;
  /** Which visible wall the door is on. */
  front: Side;
  awning: Token;
  seed: number;
}

/** An Inkline cottage: walls, a pitched roof, a door and a few windows. */
export const house = (sketch: Sketch, spec: HouseSpec) => {
  const height = spec.floors * FLOOR + 0.06;
  plate(sketch, inset(spec, -0.08));
  box(sketch, {
    colors: WALLS,
    d: spec.d,
    h: height,
    w: spec.w,
    x: spec.x,
    y: CURB_TOP + 0.03,
    z: spec.z,
  });
  const roof = {
    colors: spec.roof,
    d: spec.d,
    ends: WALLS,
    ridge: spec.ridge,
    rise: Math.min(spec.w, spec.d) * 0.36,
    w: spec.w,
    x: spec.x,
    y: CURB_TOP + 0.03 + height,
    z: spec.z,
  };
  if (spec.hipped) {
    hip(sketch, roof);
  } else {
    gable(sketch, roof);
  }
  if (spec.chimney) {
    const cx = spec.ridge === "x" ? spec.x + spec.w * 0.72 : spec.x + spec.w * 0.3;
    const cz = spec.ridge === "x" ? spec.z + spec.d * 0.3 : spec.z + spec.d * 0.72;
    box(sketch, { colors: WALLS, d: 0.1, h: roof.rise + 0.12, w: 0.1, x: cx, y: roof.y, z: cz });
  }
  const walls = { ...spec };
  const doorAlong = spec.front === "front" ? spec.w * 0.38 : spec.d * 0.4;
  door(sketch, walls, { along: doorAlong, awning: spec.awning, side: spec.front });
  for (const side of ["front", "side"] satisfies Side[]) {
    const span = side === "front" ? spec.w : spec.d;
    windows(sketch, walls, {
      columns: span > 1 ? 3 : 2,
      floors: spec.floors,
      side,
      skip: side === spec.front ? 1 : undefined,
      y: CURB_TOP + 0.15,
    });
  }
};

const houseLot = (random: Random, lot: Footprint, ridge: "x" | "z", front: Side): HouseSpec => {
  const w = Math.min(lot.w - 0.3, random.range(0.85, 1.1));
  const d = Math.min(lot.d - 0.3, random.range(0.8, 1));
  return {
    awning: random.pick(ACCENTS),
    chimney: random.chance(0.55),
    d,
    floors: random.chance(0.25) ? 2 : 1,
    front,
    hipped: random.chance(0.25),
    ridge,
    roof: random.pick(ROOFS),
    seed: random.int(0, 9999),
    w,
    x: lot.x + (lot.w - w) / 2,
    z: lot.z + (lot.d - d) / 2,
  };
};

/** One of a houses block's sixteen cells: a cottage, or a lawn with its tree and maybe a bush. */
export type HouseCell =
  | { lot: Footprint; house: HouseSpec }
  | { lot: Footprint; tree: Tree; bush: readonly [number, number] | null };

/**
 * A houses block laid out: cottages round the edge, lawns inside (and where
 * an edge lot was left open). Pure, from the block's own random stream, so
 * whatever else needs the layout (the season's decorations) gets the same one.
 */
export const houseCells = (block: Block, random: Random = createRandom(block.seed)) => {
  const area = inset(block, 0.25);
  const cell = area.w / 4;
  const cells: HouseCell[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const lot = { d: cell, w: cell, x: area.x + column * cell, z: area.z + row * cell };
      const edge = row === 0 || row === 3 || column === 0 || column === 3;
      if (edge && random.chance(0.94)) {
        const ridge = row === 0 || row === 3 ? "x" : "z";
        const front: Side = column === 3 && row !== 3 ? "side" : "front";
        cells.push({ house: houseLot(random, lot, ridge, front), lot });
      } else {
        const planted: Tree = {
          kind: random.pick(["round", "round", "pine", "poplar"]),
          size: random.range(0.9, 1.3),
          x: lot.x + random.range(0.35, lot.w - 0.35),
          z: lot.z + random.range(0.35, lot.d - 0.35),
        };
        const shrub = random.chance(0.5)
          ? ([
              lot.x + random.range(0.2, lot.w - 0.2),
              lot.z + random.range(0.2, lot.d - 0.2),
            ] as const)
          : null;
        cells.push({ bush: shrub, lot, tree: planted });
      }
    }
  }
  return cells;
};

/** Where a cottage's door is, on the ground just out from its wall. */
export const doorstep = ({ d, front, w, x, z }: HouseSpec) =>
  front === "front"
    ? { x: x + w * 0.38 + 0.08, z: z + d + 0.12 }
    : { x: x + w + 0.12, z: z + d * 0.4 + 0.08 };

/** Twelve cottages around the block's edge, gardens and trees inside. */
const drawHouses = (sketch: Sketch, block: Block, random: Random) => {
  for (const cell of houseCells(block, random)) {
    if ("house" in cell) {
      house(sketch, cell.house);
      continue;
    }
    const { lot } = cell;
    ground(
      sketch,
      "lawn",
      [
        [lot.x + 0.05, lot.z + 0.05],
        [lot.x + lot.w - 0.05, lot.z + 0.05],
        [lot.x + lot.w - 0.05, lot.z + lot.d - 0.05],
        [lot.x + 0.05, lot.z + lot.d - 0.05],
      ],
      CURB_TOP + 0.005,
      "hair",
    );
    tree(sketch, cell.tree, CURB_TOP);
    if (cell.bush) {
      bush(sketch, ...cell.bush);
    }
  }
};

export interface SlabSpec extends Footprint {
  floors: number;
  seed: number;
  style: "grid" | "ribbon";
  awning?: Token;
  roofline?: "flat" | "gable";
}

/** A flat-roofed block of flats or offices. */
export const slab = (sketch: Sketch, spec: SlabSpec) => {
  const height = spec.floors * FLOOR + 0.1;
  const y = CURB_TOP + 0.03;
  plate(sketch, inset(spec, -0.1));
  box(sketch, { colors: WALLS, d: spec.d, h: height, w: spec.w, x: spec.x, y, z: spec.z });
  for (const side of ["front", "side"] satisfies Side[]) {
    const span = side === "front" ? spec.w : spec.d;
    if (spec.style === "ribbon") {
      ribbons(sketch, spec, side, { floors: spec.floors, y: y + 0.1 });
    } else {
      windows(sketch, spec, {
        columns: Math.max(2, Math.round(span / 0.32)),
        floors: spec.floors,
        side,
        skip: side === "front" ? Math.floor(span / 0.64) : undefined,
        y: y + 0.12,
      });
    }
  }
  door(sketch, spec, {
    along: Math.max(0.1, spec.w / 2 - 0.08),
    awning: spec.awning,
    side: "front",
  });
  if (spec.roofline === "gable") {
    gable(sketch, {
      colors: ROOF_GRAY,
      d: spec.d,
      ends: WALLS,
      ridge: spec.w >= spec.d ? "x" : "z",
      rise: 0.35,
      w: spec.w,
      x: spec.x,
      y: y + height,
      z: spec.z,
    });
  } else {
    parapet(sketch, spec, y + height);
    rooftop(sketch, inset(spec, 0.1), y + height, spec.seed);
  }
};

const drawApartments = (sketch: Sketch, block: Block, random: Random) => {
  const area = inset(block, 0.35);
  const style = random.chance(0.5) ? "grid" : "ribbon";
  if (random.chance(0.5)) {
    // Two long bars with a courtyard between.
    for (const z of [area.z, area.z + area.d - 1.7]) {
      slab(sketch, {
        awning: random.pick(ACCENTS),
        d: 1.7,
        floors: random.int(3, 6),
        roofline: random.chance(0.3) ? "gable" : "flat",
        seed: random.int(0, 9999),
        style,
        w: area.w,
        x: area.x,
        z,
      });
    }
    const courtyard = { d: area.d - 3.6, w: area.w, x: area.x, z: area.z + 1.8 };
    for (let index = 0; index < 4; index += 1) {
      tree(
        sketch,
        {
          kind: "round",
          size: 1.1,
          x: courtyard.x + 0.6 + index * ((courtyard.w - 1.2) / 3),
          z: courtyard.z + courtyard.d / 2,
        },
        CURB_TOP,
      );
    }
    return;
  }
  // Four point blocks.
  const size = area.w / 2 - 0.3;
  for (const [dx, dz] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]) {
    slab(sketch, {
      awning: random.pick(ACCENTS),
      d: size,
      floors: random.int(3, 7),
      seed: random.int(0, 9999),
      style,
      w: size,
      x: area.x + (dx ?? 0) * (area.w / 2 + 0.3),
      z: area.z + (dz ?? 0) * (area.d / 2 + 0.3),
    });
  }
  tree(
    sketch,
    { kind: "round", size: 1.3, x: area.x + area.w / 2, z: area.z + area.d / 2 },
    CURB_TOP,
  );
};

/** A tower in up to three setbacks, ribbon glass, roof clutter on top. */
export const tower = (
  sketch: Sketch,
  footprint: Footprint,
  floors: number,
  seed: number,
  crown: Token | null = null,
) => {
  const random = createRandom(seed);
  let y = CURB_TOP + 0.03;
  let rect = footprint;
  plate(sketch, inset(footprint, -0.12));
  const tiers = floors > 9 ? 2 + Number(random.chance(0.5)) : 1;
  let remaining = floors;
  for (let tier = 0; tier < tiers; tier += 1) {
    const tierFloors =
      tier === tiers - 1 ? remaining : Math.max(2, Math.round(remaining * random.range(0.45, 0.6)));
    remaining -= tierFloors;
    const height = tierFloors * FLOOR;
    box(sketch, { colors: WALLS, d: rect.d, h: height, w: rect.w, x: rect.x, y, z: rect.z });
    for (const side of ["front", "side"] satisfies Side[]) {
      ribbons(sketch, rect, side, { floors: tierFloors, y: y + 0.08 });
    }
    y += height;
    parapet(sketch, rect, y);
    if (tier < tiers - 1) {
      rect = inset(rect, Math.min(rect.w, rect.d) * 0.14);
    }
  }
  rooftop(sketch, inset(rect, 0.12), y, seed);
  if (crown) {
    box(
      sketch,
      {
        colors: paint(crown, crown, crown),
        d: rect.d,
        h: 0.05,
        w: rect.w,
        x: rect.x,
        y: y - 0.14,
        z: rect.z,
      },
      "hair",
    );
  }
  return y;
};

const drawOffices = (sketch: Sketch, block: Block, random: Random) => {
  const area = inset(block, 0.4);
  const tall = random.int(10, 17);
  tower(
    sketch,
    { d: 2.4, w: 2.4, x: area.x, z: area.z },
    tall,
    random.int(0, 9999),
    random.chance(0.4) ? random.pick(ACCENTS) : null,
  );
  tower(
    sketch,
    { d: 2, w: 2, x: area.x + area.w - 2, z: area.z + 0.2 },
    random.int(6, 11),
    random.int(0, 9999),
  );
  slab(sketch, {
    awning: random.pick(ACCENTS),
    d: 1.6,
    floors: random.int(3, 6),
    seed: random.int(0, 9999),
    style: "ribbon",
    w: area.w - 0.4,
    x: area.x + 0.2,
    z: area.z + area.d - 1.6,
  });
  for (let index = 0; index < 3; index += 1) {
    tree(
      sketch,
      { kind: "round", size: 0.9, x: area.x + 0.5 + index * 0.9, z: area.z + 2.95 },
      CURB_TOP,
    );
  }
  lamp(sketch, area.x + area.w - 0.4, area.z + 2.9);
};

const drawLawn = (sketch: Sketch, rect: Footprint) => {
  box(
    sketch,
    { colors: LAWN, d: rect.d, h: 0.015, w: rect.w, x: rect.x, y: CURB_TOP, z: rect.z },
    "hair",
  );
};

const pathStrip = (sketch: Sketch, rect: Footprint) => {
  face(
    sketch,
    "paving",
    [
      [rect.x, CURB_TOP + 0.02, rect.z],
      [rect.x + rect.w, CURB_TOP + 0.02, rect.z],
      [rect.x + rect.w, CURB_TOP + 0.02, rect.z + rect.d],
      [rect.x, CURB_TOP + 0.02, rect.z + rect.d],
    ],
    "hair",
  );
};

const fountain = (sketch: Sketch, x: number, z: number, radius = 0.55) => {
  round(sketch, {
    colors: paint("paving", "wallLeft", "wallRight"),
    h: 0.08,
    r: radius,
    segments: 20,
    x,
    y: CURB_TOP + 0.02,
    z,
  });
  round(
    sketch,
    { colors: paint("water"), h: 0.004, r: radius - 0.08, segments: 20, x, y: CURB_TOP + 0.1, z },
    "hair",
  );
  round(sketch, { colors: WALLS, h: 0.22, r: 0.08, segments: 10, x, y: CURB_TOP + 0.1, z });
  ball(sketch, { colors: paint("water"), detail: 10, r: 0.13, ry: 0.6, x, y: CURB_TOP + 0.36, z });
};

const scatterTrees = (
  sketch: Sketch,
  random: Random,
  area: Footprint,
  count: number,
  keepOut: (x: number, z: number) => boolean,
) => {
  let placed = 0;
  for (let attempt = 0; attempt < count * 6 && placed < count; attempt += 1) {
    const x = area.x + random.range(0.2, area.w - 0.2);
    const z = area.z + random.range(0.2, area.d - 0.2);
    if (!keepOut(x, z)) {
      tree(
        sketch,
        {
          kind: random.pick(["round", "round", "pine", "poplar"]),
          size: random.range(0.9, 1.4),
          x,
          z,
        },
        CURB_TOP,
      );
      placed += 1;
    }
  }
};

/** A park laid out: which of its three styles, and where its pond and its ball court would be. */
export const parkOf = (block: Block) => {
  const area = inset(block, 0.18);
  const cx = area.x + area.w / 2;
  const cz = area.z + area.d / 2;
  return {
    area,
    court: { d: 1.6, w: 2.8, x: area.x + 0.4, z: area.z + area.d - 2.1 },
    cx,
    cz,
    pond: { rx: 1.5, rz: 1.05, x: cx - 0.3, z: cz + 0.2 },
    style: block.seed % 3,
  };
};

const drawPark = (sketch: Sketch, block: Block, random: Random) => {
  const { area, court, cx, cz, pond, style } = parkOf(block);
  drawLawn(sketch, area);
  if (style === 0) {
    // A pond with a curving shore.
    const shore = ellipse(pond.rx, pond.rz, 22, pond.x, pond.z);
    ground(sketch, "water", shore, CURB_TOP + 0.02, "fine");
    pathStrip(sketch, { d: 0.3, w: area.w, x: area.x, z: area.z + 0.5 });
    scatterTrees(
      sketch,
      random,
      area,
      16,
      (x, z) =>
        Math.hypot((x - cx + 0.3) / 1.7, (z - cz - 0.2) / 1.25) < 1 ||
        Math.abs(z - area.z - 0.65) < 0.3,
    );
    bench(sketch, cx + 1.4, cz - 1.2, "x");
  } else if (style === 1) {
    // Paths crossing at a fountain.
    pathStrip(sketch, { d: 0.32, w: area.w, x: area.x, z: cz - 0.16 });
    pathStrip(sketch, { d: area.d, w: 0.32, x: cx - 0.16, z: area.z });
    fountain(sketch, cx, cz);
    scatterTrees(
      sketch,
      random,
      area,
      14,
      (x, z) =>
        Math.abs(x - cx) < 0.45 || Math.abs(z - cz) < 0.45 || Math.hypot(x - cx, z - cz) < 0.9,
    );
    for (const [dx, dz, along] of [
      [0.9, -0.35, "x"],
      [-0.9, 0.35, "x"],
      [0.35, 0.9, "z"],
    ] as const) {
      bench(sketch, cx + dx, cz + dz, along);
    }
    lamp(sketch, cx + 0.5, cz + 0.5);
    lamp(sketch, cx - 0.5, cz - 0.5);
  } else {
    // A ball court and a meadow.
    box(
      sketch,
      {
        colors: paint("roofTerracotta", "roofTerracottaShade", "roofTerracottaShade"),
        d: court.d,
        h: 0.012,
        w: court.w,
        x: court.x,
        y: CURB_TOP + 0.015,
        z: court.z,
      },
      "fine",
    );
    groundLoop(
      sketch,
      [
        [court.x + 0.12, court.z + 0.12],
        [court.x + court.w - 0.12, court.z + 0.12],
        [court.x + court.w - 0.12, court.z + court.d - 0.12],
        [court.x + 0.12, court.z + court.d - 0.12],
      ],
      CURB_TOP + 0.03,
      "hair",
      "white",
    );
    groundLoop(
      sketch,
      ellipse(0.3, 0.3, 14, court.x + court.w / 2, court.z + court.d / 2),
      CURB_TOP + 0.03,
      "hair",
      "white",
    );
    scatterTrees(
      sketch,
      random,
      area,
      12,
      (x, z) => x > court.x - 0.3 && x < court.x + court.w + 0.3 && z > court.z - 0.3,
    );
  }
};

/** A plaza stall's footprint. */
const KIOSK = { d: 0.6, w: 0.8 };

/** A square's paving and its middle, where the fountain is. */
export const plazaOf = (block: Block) => {
  const area = inset(block, 0.15);
  return { area, cx: area.x + area.w / 2, cz: area.z + area.d / 2 };
};

const drawPlaza = (sketch: Sketch, block: Block, random: Random) => {
  const { area, cx, cz } = plazaOf(block);
  box(
    sketch,
    { colors: PAVING, d: area.d, h: 0.015, w: area.w, x: area.x, y: CURB_TOP, z: area.z },
    "hair",
  );
  for (let ring = 1; ring <= 3; ring += 1) {
    groundLoop(sketch, ellipse(ring * 0.75, ring * 0.75, 28, cx, cz), CURB_TOP + 0.02);
  }
  fountain(sketch, cx, cz, 0.6);
  // Kiosks and food trucks around the square.
  const stalls: [number, number, Token][] = [
    [area.x + 0.4, area.z + 0.4, "accentRed"],
    [area.x + area.w - 1.2, area.z + 0.4, "accentYellow"],
    [area.x + 0.4, area.z + area.d - 1, "accentTeal"],
  ];
  for (const [x, z, awning] of stalls) {
    const kiosk = { ...KIOSK, x, z };
    box(sketch, { colors: WALLS, d: kiosk.d, h: 0.32, w: kiosk.w, x, y: CURB_TOP + 0.015, z });
    storefront(sketch, kiosk, "front", awning);
    box(
      sketch,
      {
        colors: paint(awning, awning, awning),
        d: kiosk.d + 0.06,
        h: 0.04,
        w: kiosk.w + 0.06,
        x: x - 0.03,
        y: CURB_TOP + 0.335,
        z: z - 0.03,
      },
      "hair",
    );
  }
  parkedCar(sketch, area.x + area.w - 0.7, area.z + area.d - 0.6, "x", random.int(0, 99));
  for (const [dx, dz] of [
    [-1.9, -1.9],
    [1.9, -1.9],
    [-1.9, 1.9],
    [1.9, 1.9],
  ]) {
    const x = cx + (dx ?? 0);
    const z = cz + (dz ?? 0);
    // A small square's corners are the kiosks' already: no tree grows through a roof.
    const onStall = stalls.some(
      ([sx, sz]) =>
        x > sx - 0.5 && x < sx + KIOSK.w + 0.5 && z > sz - 0.5 && z < sz + KIOSK.d + 0.5,
    );
    if (!onStall) {
      tree(sketch, { kind: "round", size: 1.2, x, z }, CURB_TOP);
    }
  }
  for (const [dx, dz] of [
    [-1.2, 0],
    [1.2, 0],
    [0, -1.2],
    [0, 1.2],
  ]) {
    lamp(sketch, cx + (dx ?? 0), cz + (dz ?? 0));
  }
};

/** A two-storey shop for a small lot nobody claimed. */
export const shop = (sketch: Sketch, lot: Footprint, name: string, seed: number) => {
  const random = createRandom(seed);
  const building = inset(lot, 0.45);
  const awning = random.pick(ACCENTS);
  plate(sketch, inset(building, -0.1));
  box(sketch, {
    colors: WALLS,
    d: building.d,
    h: FLOOR * 2 + 0.06,
    w: building.w,
    x: building.x,
    y: CURB_TOP + 0.03,
    z: building.z,
  });
  storefront(sketch, building, "front", awning);
  windows(sketch, building, {
    columns: 3,
    floors: 1,
    side: "front",
    y: CURB_TOP + 0.03 + FLOOR + 0.1,
  });
  windows(sketch, building, { columns: 3, floors: 2, side: "side", y: CURB_TOP + 0.13 });
  gable(sketch, {
    colors: random.pick(ROOFS),
    d: building.d,
    ends: WALLS,
    ridge: "x",
    rise: 0.4,
    w: building.w,
    x: building.x,
    y: CURB_TOP + 0.03 + FLOOR * 2 + 0.06,
    z: building.z,
  });
  board(sketch, building, {
    along: 0.15,
    h: 0.16,
    side: "front",
    text: name,
    w: building.w - 0.3,
    y: CURB_TOP + 0.45,
  });
  bush(sketch, building.x + building.w + 0.2, building.z + building.d + 0.15);
};

const DRAWERS: Partial<
  Record<Block["use"], (sketch: Sketch, block: Block, random: Random) => void>
> = {
  apartments: drawApartments,
  houses: drawHouses,
  offices: drawOffices,
  park: drawPark,
  plaza: drawPlaza,
};

export const drawBlock = (sketch: Sketch, block: Block) => {
  const draw = DRAWERS[block.use];
  if (draw) {
    draw(sketch, block, createRandom(block.seed));
  }
};
