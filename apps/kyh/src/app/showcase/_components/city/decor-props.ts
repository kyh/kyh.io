// The props a season puts out round the town, each drawn at a spot on the
// ground: pumpkins, graves, trees, snowmen, eggs, lanterns, and the lights
// strung round a cottage's eaves. Pure.
import type { Random } from "@/lib/random";
import type { HouseSpec } from "./draw-blocks";
import type { Paint, Token } from "./palette";
import type { Spot } from "./open-spots";
import type { Placed, Sketch, Vec3 } from "./sketch";
import { CURB_TOP, eavesOf } from "./draw-blocks";
import { BLACK, GOLD, GREEN, paint, RED, WHITE } from "./palette";
import { ball, box, line, placed, round } from "./sketch";

/** Where a decoration stands: on the block, a hair above the lawns and paving. */
export const GROUND = CURB_TOP + 0.012;

export const PUMPKIN = paint("pumpkin", "pumpkin", "pumpkinShade");
const STONE = paint("stone", "stone", "stoneShade");
const HAY = paint("hay", "hay", "hayShade");
export const STEM = paint("trunk");
const RAINBOW: readonly Token[] = [
  "accentRed",
  "accentOrange",
  "accentYellow",
  "accentGreen",
  "accentBlue",
  "accentPurple",
];

export const pumpkin = (sketch: Sketch, x: number, z: number, size = 1) => {
  const r = 0.065 * size;
  ball(sketch, { colors: PUMPKIN, detail: 8, r, ry: 0.72, x, y: GROUND + r * 0.72, z });
  const stem = 0.014 * size;
  box(
    sketch,
    {
      colors: STEM,
      d: stem,
      h: 0.03 * size,
      w: stem,
      x: x - stem / 2,
      y: GROUND + r * 1.4,
      z: z - stem / 2,
    },
    "hair",
  );
};

export const gravestone = (sketch: Sketch, x: number, z: number, size = 1.3) => {
  const w = 0.1 * size;
  const h = 0.1 * size;
  box(sketch, {
    colors: STONE,
    d: 0.035 * size,
    h,
    w,
    x: x - w / 2,
    y: GROUND,
    z: z - 0.0175 * size,
  });
  ball(sketch, { colors: STONE, detail: 8, r: w / 2, rz: 0.35, x, y: GROUND + h, z });
};

/** A bare tree in ink, its branches crooked, for the graveyard. */
export const deadTree = (sketch: Sketch, x: number, z: number, random: Random) => {
  const height = 0.6;
  line(
    sketch,
    [
      [x, GROUND, z],
      [x + 0.02, GROUND + height * 0.6, z],
      [x - 0.01, GROUND + height, z + 0.02],
    ],
    "bold",
  );
  for (let index = 0; index < 5; index += 1) {
    const from: Vec3 = [x, GROUND + 0.22 + index * 0.08, z];
    const angle = random.range(0, Math.PI * 2);
    const reach = random.range(0.14, 0.24);
    const elbow: Vec3 = [
      from[0] + Math.cos(angle) * reach * 0.6,
      from[1] + reach * 0.35,
      from[2] + Math.sin(angle) * reach * 0.6,
    ];
    const tip: Vec3 = [
      elbow[0] + Math.cos(angle + 0.5) * reach * 0.5,
      elbow[1] + reach * 0.45,
      elbow[2] + Math.sin(angle + 0.5) * reach * 0.5,
    ];
    line(sketch, [from, elbow, tip]);
  }
};

export const christmasTree = (sketch: Sketch, x: number, z: number, random: Random, size = 1) => {
  box(sketch, {
    colors: STEM,
    d: 0.04 * size,
    h: 0.05 * size,
    w: 0.04 * size,
    x: x - 0.02 * size,
    y: GROUND,
    z: z - 0.02 * size,
  });
  const tiers = [
    { h: 0.22, r: 0.2, y: 0.04 },
    { h: 0.2, r: 0.15, y: 0.16 },
    { h: 0.18, r: 0.1, y: 0.27 },
  ] as const;
  for (const tier of tiers) {
    round(sketch, {
      colors: GREEN,
      h: tier.h * size,
      r: tier.r * size,
      segments: 10,
      top: 0,
      x,
      y: GROUND + tier.y * size,
      z,
    });
  }
  // Baubles round the lower two tiers (none on a porch's little tree, where
  // they'd be specks), and a star on top.
  for (let index = 0; index < (size < 1 ? 0 : 8); index += 1) {
    const tier = index % 2 === 0 ? tiers[0] : tiers[1];
    const angle = random.range(0, Math.PI * 2);
    const reach = tier.r * size * 0.62;
    ball(sketch, {
      colors: index % 3 === 0 ? GOLD : RED,
      detail: 6,
      r: 0.016 * size,
      x: x + Math.cos(angle) * reach,
      y: GROUND + (tier.y + tier.h * 0.38) * size,
      z: z + Math.sin(angle) * reach,
    });
  }
  ball(sketch, { colors: GOLD, detail: 8, r: 0.03 * size, x, y: GROUND + 0.46 * size, z });
};

export const present = (sketch: Sketch, x: number, z: number, colors: Paint, size = 1) => {
  const w = 0.09 * size;
  const h = 0.07 * size;
  box(sketch, { colors, d: w, h, w, x: x - w / 2, y: GROUND, z: z - w / 2 });
  const ribbon = 0.018 * size;
  box(
    sketch,
    {
      colors: GOLD,
      d: w + 0.004,
      h: h + 0.004,
      w: ribbon,
      x: x - ribbon / 2,
      y: GROUND,
      z: z - w / 2 - 0.002,
    },
    "hair",
  );
  box(
    sketch,
    {
      colors: GOLD,
      d: ribbon,
      h: h + 0.004,
      w: w + 0.004,
      x: x - w / 2 - 0.002,
      y: GROUND,
      z: z - ribbon / 2,
    },
    "hair",
  );
};

export const snowman = (sketch: Sketch, x: number, z: number) => {
  for (const [r, y] of [
    [0.065, 0.06],
    [0.048, 0.155],
    [0.034, 0.228],
  ] as const) {
    ball(sketch, { colors: WHITE, detail: 8, r, x, y: GROUND + y, z });
  }
  box(sketch, {
    colors: BLACK,
    d: 0.045,
    h: 0.04,
    w: 0.045,
    x: x - 0.0225,
    y: GROUND + 0.255,
    z: z - 0.0225,
  });
  ball(sketch, {
    colors: PUMPKIN,
    detail: 6,
    r: 0.01,
    x: x + 0.022,
    y: GROUND + 0.23,
    z: z + 0.022,
  });
};

export const hayBale = (sketch: Sketch, x: number, z: number, y = GROUND) => {
  box(sketch, { colors: HAY, d: 0.13, h: 0.1, w: 0.22, x: x - 0.11, y, z: z - 0.065 });
};

export const cornShock = (sketch: Sketch, x: number, z: number) => {
  round(sketch, { colors: HAY, h: 0.3, r: 0.06, segments: 8, top: 0.008, x, y: GROUND, z });
};

export const egg = (sketch: Sketch, x: number, z: number, colors: Paint, size = 1) => {
  const r = 0.045 * size;
  ball(sketch, { colors, detail: 8, r, ry: 1.35, x, y: GROUND + r * 1.35, z });
};

/** A balloon on its string, tied at the ground. */
export const balloon = (sketch: Sketch, x: number, z: number, height: number, colors: Paint) => {
  line(
    sketch,
    [
      [x, GROUND, z],
      [x, GROUND + height, z],
    ],
    "hair",
    "inkSoft",
  );
  ball(sketch, { colors, detail: 8, r: 0.055, ry: 1.15, x, y: GROUND + height + 0.06, z });
};

export const potOfGold = (sketch: Sketch, x: number, z: number) => {
  ball(sketch, { colors: BLACK, detail: 8, r: 0.075, ry: 0.75, x, y: GROUND + 0.05, z });
  for (const [dx, dz, dy] of [
    [0, 0, 0.03],
    [0.03, 0.01, 0.015],
    [-0.025, 0.02, 0.012],
    [0.005, -0.03, 0.014],
  ] as const) {
    ball(sketch, { colors: GOLD, detail: 6, r: 0.022, x: x + dx, y: GROUND + 0.1 + dy, z: z + dz });
  }
};

/** A rainbow arching from a point along x, its bands in color. */
export const rainbow = (sketch: Sketch, x: number, z: number, radius: number) => {
  const center = x + radius;
  for (const [band, token] of RAINBOW.entries()) {
    const r = radius - band * 0.03;
    const points = Array.from({ length: 17 }, (_, step): Vec3 => {
      const angle = (step / 16) * Math.PI;
      return [center - Math.cos(angle) * r, GROUND + Math.sin(angle) * r, z];
    });
    line(sketch, points, "bold", token);
  }
};

/** A paper lantern hung at a height, gold caps and a tassel. */
export const lantern = (pen: Placed, [x, y, z]: Vec3, size = 1) => {
  const r = 0.05 * size;
  const big = size > 2;
  pen.ball({ colors: RED, detail: big ? 14 : 10, r, ry: 0.85, x, y, z });
  for (const cap of [y + r * 0.8, y - r * 0.8 - 0.012 * size]) {
    pen.round({ colors: GOLD, h: 0.012 * size, r: r * 0.45, segments: 8, x, y: cap, z }, "hair");
  }
  pen.line(
    [
      [x, y - r * 0.8 - 0.012 * size, z],
      [x, y - r * 1.6, z],
    ],
    big ? "bold" : "fine",
    "festiveRed",
  );
};

/** A lantern on a post, hung from an arm. */
export const lanternPost = (sketch: Sketch, x: number, z: number, height = 0.36) => {
  line(
    sketch,
    [
      [x, GROUND, z],
      [x, GROUND + height, z],
      [x + 0.07, GROUND + height, z],
    ],
    "fine",
  );
  lantern(placed(sketch), [x + 0.07, GROUND + height - 0.07, z]);
};

/** A string of bulbs hung all the way round a cottage's eaves, sagging between them, the colors in turn. */
export const eaveLights = (sketch: Sketch, house: HouseSpec, colors: readonly Token[]) => {
  const top = eavesOf(house) - 0.01;
  const out = 0.03;
  const { d, w, x, z } = house;
  const corners: Spot[] = [
    [x - out, z - out],
    [x + w + out, z - out],
    [x + w + out, z + d + out],
    [x - out, z + d + out],
  ];
  let bulb = 0;
  for (const [index, [ax, az]] of corners.entries()) {
    const [bx, bz] = corners[(index + 1) % corners.length] ?? [ax, az];
    const spans = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 0.09));
    const wire: Vec3[] = [];
    for (let step = 0; step <= spans * 2; step += 1) {
      const along = step / (spans * 2);
      // Every other point is a bulb, hanging where the wire sags lowest.
      const hanging = step % 2 === 1;
      const at: Vec3 = [
        ax + (bx - ax) * along,
        top - (hanging ? 0.022 : 0),
        az + (bz - az) * along,
      ];
      wire.push(at);
      if (hanging) {
        const token = colors[bulb % colors.length] ?? "gold";
        bulb += 1;
        line(
          sketch,
          [
            [at[0], at[1] - 0.004, at[2]],
            [at[0], at[1] - 0.024, at[2]],
          ],
          "bold",
          token,
        );
      }
    }
    line(sketch, wire, "hair");
  }
};
