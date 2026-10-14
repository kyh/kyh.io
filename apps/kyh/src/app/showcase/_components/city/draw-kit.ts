// The small pieces every building shares: windows, doors, awnings, signs,
// rooftop clutter, trees, lamps and benches. All in cells; a storey is
// `FLOOR` tall.
import type { Paint, Token } from "./palette";
import type { Tree } from "./plan";
import type { Point2, Side, Sketch, Vec3, Weight } from "./sketch";
import { paint, WALLS } from "./palette";
import { hashString } from "./random";
import {
  ball,
  box,
  extrude,
  face,
  line,
  loop,
  onWall,
  opposite,
  pane,
  round,
  seesWall,
  sub,
  wallLength,
} from "./sketch";

export const FLOOR = 0.36;
const CANOPY = paint("tree", "tree", "treeShade");
const NEEDLES = paint("pine", "pine", "pineShade");
const PLATE = paint("plate", "wallLeft", "wallRight");

export interface Footprint {
  x: number;
  z: number;
  w: number;
  d: number;
}

export const inset = (rect: Footprint, by: number): Footprint => ({
  d: rect.d - by * 2,
  w: rect.w - by * 2,
  x: rect.x + by,
  z: rect.z + by,
});

/** Dim some windows at night, the same ones every visit: one in `every`. */
const glassFor = (key: string, every = 3): Token =>
  hashString(key) % every === 0 ? "glassDim" : "glass";

/** The raised slab a building sits on. */
export const plate = (sketch: Sketch, rect: Footprint, colors: Paint = PLATE, h = 0.03) => {
  box(sketch, { colors, d: rect.d, h, w: rect.w, x: rect.x, y: 0.04, z: rect.z }, "fine");
};

export interface WindowGrid {
  side: Side;
  /** Height of the first sill. */
  y: number;
  floors: number;
  columns: number;
  width?: number;
  height?: number;
  floorHeight?: number;
  margin?: number;
  /** Skip a column for the door on the ground floor. */
  skip?: number;
}

/** Rows of windows on a wall, and the same on the wall opposite, for the views from behind. */
export const windows = (sketch: Sketch, wall: Footprint, grid: WindowGrid) => {
  const span = wallLength(wall, grid.side);
  const margin = grid.margin ?? 0.16;
  const width = grid.width ?? 0.12;
  const height = grid.height ?? 0.16;
  const floorHeight = grid.floorHeight ?? FLOOR;
  for (const [side, skip] of [
    [grid.side, grid.skip],
    [opposite(grid.side), undefined],
  ] as const) {
    if (!seesWall(sketch, side)) {
      continue;
    }
    for (let floor = 0; floor < grid.floors; floor += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        if (!(floor === 0 && column === skip)) {
          const along = margin + ((span - margin * 2) * (column + 0.5)) / grid.columns - width / 2;
          const y = grid.y + floor * floorHeight;
          pane(
            sketch,
            wall,
            { along, h: height, side, w: width, y },
            glassFor(`${wall.x}:${wall.z}:${side}:${floor}:${column}`),
          );
        }
      }
    }
  }
};

/** Continuous glass bands, one per storey, with thin mullions. */
export const ribbons = (
  sketch: Sketch,
  wall: Footprint,
  side: Side,
  { y, floors, floorHeight = FLOOR }: { y: number; floors: number; floorHeight?: number },
) => {
  const span = wallLength(wall, side);
  for (const facing of [side, opposite(side)]) {
    if (seesWall(sketch, facing)) {
      for (let floor = 0; floor < floors; floor += 1) {
        const bottom = y + floor * floorHeight;
        const top = bottom + floorHeight * 0.55;
        pane(
          sketch,
          wall,
          { along: 0.1, h: top - bottom, side: facing, w: span - 0.2, y: bottom },
          // Offices empty out at night: half the floors go dark.
          glassFor(`${wall.x}:${wall.z}:${facing}:${floor}`, 2),
          "hair",
        );
        for (let along = 0.35; along < span - 0.2; along += 0.3) {
          line(
            sketch,
            [onWall(wall, facing, along, bottom, 0.006), onWall(wall, facing, along, top, 0.006)],
            "hair",
            "inkSoft",
          );
        }
      }
    }
  }
};

/** A door with a slanted awning over it. */
export const door = (
  sketch: Sketch,
  wall: Footprint,
  {
    side,
    along,
    width = 0.16,
    height = 0.24,
    awning,
  }: {
    side: Side;
    along: number;
    width?: number;
    height?: number;
    awning?: Token;
  },
) => {
  pane(sketch, wall, { along, h: height, side, w: width, y: 0.07 }, "door", "fine");
  if (awning) {
    const top = 0.07 + height + 0.06;
    const out = 0.14;
    const corners: Vec3[] = [
      onWall(wall, side, along - 0.05, top, 0.004),
      onWall(wall, side, along + width + 0.05, top, 0.004),
      onWall(wall, side, along + width + 0.05, top - 0.07, out),
      onWall(wall, side, along - 0.05, top - 0.07, out),
    ];
    face(sketch, awning, corners, "fine");
  }
};

/** A shopfront awning running most of a wall. */
export const storefront = (sketch: Sketch, wall: Footprint, side: Side, awning: Token) => {
  const span = wallLength(wall, side);
  pane(sketch, wall, { along: 0.12, h: 0.2, side, w: span - 0.24, y: 0.08 }, "glass", "fine");
  const top = 0.36;
  face(
    sketch,
    awning,
    [
      onWall(wall, side, 0.08, top, 0.004),
      onWall(wall, side, span - 0.08, top, 0.004),
      onWall(wall, side, span - 0.08, top - 0.08, 0.16),
      onWall(wall, side, 0.08, top - 0.08, 0.16),
    ],
    "fine",
  );
};

export interface BoardSpec {
  side: Side;
  along: number;
  y: number;
  w: number;
  h: number;
  text: string;
  colors?: Paint;
  ink?: Token;
}

/** A sign board fixed to a wall, its text facing out. */
export const board = (sketch: Sketch, wall: Footprint, spec: BoardSpec) => {
  const colors = spec.colors ?? paint("signBoard");
  const near = onWall(wall, spec.side, spec.along, spec.y, 0);
  const far = onWall(wall, spec.side, spec.along + spec.w, spec.y, 0.035);
  const x = Math.min(near[0], far[0]);
  const z = Math.min(near[2], far[2]);
  const w = Math.max(0.035, Math.abs(far[0] - near[0]));
  const d = Math.max(0.035, Math.abs(far[2] - near[2]));
  box(sketch, { colors, d, h: spec.h, w, x, y: spec.y, z }, "fine");
  const face3 = { d, w, x, z };
  const origin = onWall(face3, spec.side, 0.04, spec.y + spec.h * 0.12, 0.006);
  const end = onWall(face3, spec.side, wallLength(face3, spec.side) - 0.04, spec.y, 0.006);
  sketch.signs.push({
    across: sub(end, [origin[0], end[1], origin[2]]),
    origin,
    text: spec.text,
    token: spec.ink ?? "signText",
    up: [0, spec.h * 0.76, 0],
  });
};

/** A billboard on two legs, standing on a roof at height `y`. */
export const billboard = (
  sketch: Sketch,
  spec: Omit<BoardSpec, "along"> & { x: number; z: number; legs?: number },
) => {
  const legs = spec.legs ?? 0.18;
  const wall: Footprint =
    spec.side === "front"
      ? { d: 0.05, w: spec.w, x: spec.x, z: spec.z }
      : { d: spec.w, w: 0.05, x: spec.x, z: spec.z };
  for (const along of [spec.w * 0.2, spec.w * 0.8]) {
    line(
      sketch,
      [
        onWall(wall, spec.side, along, spec.y, -0.03),
        onWall(wall, spec.side, along, spec.y + legs, -0.03),
      ],
      "fine",
    );
  }
  board(sketch, wall, { ...spec, along: 0, y: spec.y + legs });
};

const waterTank = (sketch: Sketch, x: number, z: number, y: number) => {
  for (const [dx, dz] of [
    [-0.1, -0.1],
    [0.1, -0.1],
    [0.1, 0.1],
    [-0.1, 0.1],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [x + dx, y, z + dz],
        [x + dx, y + 0.2, z + dz],
      ],
      "hair",
    );
  }
  round(sketch, {
    colors: paint("trunk", "roofTerracotta", "roofTerracottaShade"),
    h: 0.24,
    r: 0.16,
    segments: 12,
    x,
    y: y + 0.2,
    z,
  });
  round(sketch, {
    colors: paint("roofGray", "roofGray", "roofGrayShade"),
    h: 0.1,
    r: 0.17,
    segments: 12,
    top: 0,
    x,
    y: y + 0.44,
    z,
  });
};

/** Air handlers, vents and a tank: what makes a flat roof read as a roof. */
export const rooftop = (sketch: Sketch, roof: Footprint, y: number, seed: number) => {
  const units = 1 + (seed % 3);
  for (let index = 0; index < units; index += 1) {
    const x = roof.x + 0.15 + (((seed * (index + 3)) % 100) / 100) * Math.max(0.1, roof.w - 0.6);
    const z = roof.z + 0.15 + (((seed * (index + 7)) % 100) / 100) * Math.max(0.1, roof.d - 0.6);
    box(
      sketch,
      { colors: paint("metal", "metal", "metalDark"), d: 0.22, h: 0.12, w: 0.3, x, y, z },
      "hair",
    );
    loop(
      sketch,
      [
        [x + 0.08, y + 0.121, z + 0.05],
        [x + 0.22, y + 0.121, z + 0.05],
        [x + 0.22, y + 0.121, z + 0.17],
        [x + 0.08, y + 0.121, z + 0.17],
      ],
      "hair",
      "inkSoft",
    );
  }
  if (seed % 4 === 0) {
    waterTank(sketch, roof.x + roof.w - 0.45, roof.z + 0.4, y);
  }
};

/** A flat roof's raised edge. */
export const parapet = (sketch: Sketch, roof: Footprint, y: number, colors: Paint = WALLS) => {
  const t = 0.05;
  const h = 0.06;
  box(sketch, { colors, d: t, h, w: roof.w, x: roof.x, y, z: roof.z });
  box(sketch, { colors, d: t, h, w: roof.w, x: roof.x, y, z: roof.z + roof.d - t });
  box(sketch, { colors, d: roof.d - t * 2, h, w: t, x: roof.x, y, z: roof.z + t });
  box(sketch, { colors, d: roof.d - t * 2, h, w: t, x: roof.x + roof.w - t, y, z: roof.z + t });
};

export const tree = (sketch: Sketch, { x, z, kind, size }: Tree, y = 0) => {
  switch (kind) {
    case "pine": {
      line(
        sketch,
        [
          [x, y, z],
          [x, y + 0.12 * size, z],
        ],
        "fine",
        "trunk",
      );
      round(sketch, {
        colors: NEEDLES,
        h: 0.34 * size,
        r: 0.2 * size,
        segments: 9,
        top: 0,
        x,
        y: y + 0.08 * size,
        z,
      });
      round(sketch, {
        colors: NEEDLES,
        h: 0.3 * size,
        r: 0.15 * size,
        segments: 9,
        top: 0,
        x,
        y: y + 0.28 * size,
        z,
      });
      break;
    }
    case "poplar": {
      line(
        sketch,
        [
          [x, y, z],
          [x, y + 0.16 * size, z],
        ],
        "fine",
        "trunk",
      );
      ball(sketch, {
        colors: CANOPY,
        detail: 9,
        r: 0.12 * size,
        ry: 2.3,
        x,
        y: y + 0.42 * size,
        z,
      });
      break;
    }
    default: {
      line(
        sketch,
        [
          [x, y, z],
          [x, y + 0.2 * size, z],
        ],
        "fine",
        "trunk",
      );
      ball(sketch, {
        colors: CANOPY,
        detail: 9,
        r: 0.19 * size,
        ry: 0.92,
        x,
        y: y + 0.36 * size,
        z,
      });
    }
  }
};

export const bush = (sketch: Sketch, x: number, z: number, size = 1, y = 0.04) => {
  ball(sketch, { colors: CANOPY, detail: 8, r: 0.11 * size, ry: 0.75, x, y: y + 0.07 * size, z });
};

export const lamp = (sketch: Sketch, x: number, z: number, y = 0.04) => {
  line(
    sketch,
    [
      [x, y, z],
      [x, y + 0.42, z],
    ],
    "fine",
  );
  ball(sketch, { colors: paint("lamp"), detail: 8, r: 0.045, x, y: y + 0.44, z });
};

export const bench = (sketch: Sketch, x: number, z: number, along: "x" | "z", y = 0.04) => {
  const w = along === "x" ? 0.22 : 0.07;
  const d = along === "x" ? 0.07 : 0.22;
  box(
    sketch,
    { colors: paint("trunk"), d, h: 0.05, w, x: x - w / 2, y: y + 0.03, z: z - d / 2 },
    "hair",
  );
};

export const flag = (
  sketch: Sketch,
  x: number,
  z: number,
  y: number,
  token: Token,
  height = 0.7,
) => {
  line(
    sketch,
    [
      [x, y, z],
      [x, y + height, z],
    ],
    "fine",
  );
  face(
    sketch,
    token,
    [
      [x, y + height, z],
      [x + 0.22, y + height - 0.05, z - 0.02],
      [x, y + height - 0.12, z],
    ],
    "hair",
  );
};

const CAR_COLORS: Token[] = [
  "white",
  "accentRed",
  "accentBlue",
  "accentYellow",
  "roofGray",
  "accentTeal",
  "navy",
];

/** A parked car, nose along x or z. */
export const parkedCar = (sketch: Sketch, x: number, z: number, along: "x" | "z", seed: number) => {
  const color = CAR_COLORS[seed % CAR_COLORS.length] ?? "white";
  const length = 0.36;
  const width = 0.18;
  const w = along === "x" ? length : width;
  const d = along === "x" ? width : length;
  box(
    sketch,
    { colors: paint(color, color, color), d, h: 0.08, w, x: x - w / 2, y: 0.05, z: z - d / 2 },
    "hair",
  );
  box(
    sketch,
    {
      colors: paint("glass", "glass", "glassDim"),
      d: d * (along === "x" ? 0.8 : 0.5),
      h: 0.06,
      w: w * (along === "x" ? 0.5 : 0.8),
      x: x - w * (along === "x" ? 0.25 : 0.4),
      y: 0.13,
      z: z - d * (along === "x" ? 0.4 : 0.25),
    },
    "hair",
  );
};

/** A low hedge around three sides of a yard. */
export const hedge = (sketch: Sketch, rect: Footprint, y = 0.04) => {
  const colors = paint("hedge", "hedge", "treeShade");
  box(sketch, { colors, d: 0.08, h: 0.1, w: rect.w, x: rect.x, y, z: rect.z });
  box(sketch, { colors, d: rect.d - 0.08, h: 0.1, w: 0.08, x: rect.x, y, z: rect.z + 0.08 });
  box(sketch, {
    colors,
    d: rect.d - 0.08,
    h: 0.1,
    w: 0.08,
    x: rect.x + rect.w - 0.08,
    y,
    z: rect.z + 0.08,
  });
};

/** A thin stroke loop on the ground, for paths and pitches. */
export const groundLoop = (
  sketch: Sketch,
  points: readonly Point2[],
  y: number,
  weight: Weight = "hair",
  token: Token = "inkSoft",
) => {
  loop(
    sketch,
    points.map(([x, z]) => [x, y, z]),
    weight,
    token,
  );
};

/** A heart outline, for love letters. */
export const heart = (size: number): Point2[] =>
  Array.from({ length: 28 }, (_, index) => {
    const t = (index / 28) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [(x / 17) * size, (y / 17) * size] satisfies Point2;
  });

/** A standing flat cut-out facing +z: logos, sculptures. */
export const cutout = (
  sketch: Sketch,
  outline: readonly Point2[],
  at: Vec3,
  colors: Paint,
  thickness = 0.06,
  facing: Side = "front",
) => {
  const frame =
    facing === "front"
      ? { origin: at, u: [1, 0, 0] satisfies Vec3, v: [0, 1, 0] satisfies Vec3 }
      : { origin: at, u: [0, 0, -1] satisfies Vec3, v: [0, 1, 0] satisfies Vec3 };
  const depth: Vec3 = facing === "front" ? [0, 0, thickness] : [thickness, 0, 0];
  extrude(sketch, outline, frame, depth, colors);
};
