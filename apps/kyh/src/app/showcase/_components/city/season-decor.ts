// What the town puts out for the season (src/seasons): jack-o'-lanterns on
// the porches and graves in the gardens at Halloween, snowmen and trees on
// the square at Christmas. Each season decorates four kinds of spot the town
// leaves open: beside the cottages' doors, a garden's open corner, round the
// pond, and the square and the ball courts. Drawn into a sketch of their own
// per view, so a season change swaps them without redrawing the town
// (engine.ts), and shown in color: the town is grey, its decorations aren't.
// Pure.
import type { SeasonId } from "@/seasons/seasons";
import type { Paint, Token } from "./palette";
import type { CityPlan } from "./plan";
import type { Random } from "./random";
import type { Sketch, Vec3 } from "./sketch";
import { CURB_TOP, doorstep, houseCells, parkOf, plazaOf } from "./draw-blocks";
import { paint, ROOFS } from "./palette";
import { createRandom, hashString } from "./random";
import { ball, box, line, round } from "./sketch";

/** Where a decoration stands: on the block, a hair above the lawns and paving. */
const GROUND = CURB_TOP + 0.012;

type Spot = readonly [x: number, z: number];

/**
 * The kinds of open place a season can decorate: beside each cottage's door
 * (porch), a garden's corner furthest from its tree and bush (yard), round
 * the pond between the water and the trees (shore), and the square round its
 * fountain and the ball courts, with room for something big (square).
 */
const KINDS = ["porch", "yard", "shore", "square"] as const;

type Kind = (typeof KINDS)[number];

/** The open places, by kind, the same in every view. */
export type Spots = Record<Kind, Spot[]>;

const distance = ([ax, az]: Spot, [bx, bz]: Spot) => Math.hypot(ax - bx, az - bz);

const spotsIn = (plan: CityPlan): Spots => {
  const spots: Spots = { porch: [], shore: [], square: [], yard: [] };
  for (const block of plan.blocks) {
    if (block.use === "houses") {
      for (const cell of houseCells(block)) {
        if ("house" in cell) {
          const { x, z } = doorstep(cell.house);
          spots.porch.push([x, z]);
          continue;
        }
        const { bush, lot, tree } = cell;
        const taken: Spot[] = bush ? [[tree.x, tree.z], bush] : [[tree.x, tree.z]];
        const corners: Spot[] = [
          [lot.x + 0.3, lot.z + 0.3],
          [lot.x + lot.w - 0.3, lot.z + 0.3],
          [lot.x + 0.3, lot.z + lot.d - 0.3],
          [lot.x + lot.w - 0.3, lot.z + lot.d - 0.3],
        ];
        const roomAt = (corner: Spot) => Math.min(...taken.map((spot) => distance(corner, spot)));
        const [open] = corners.toSorted((a, b) => roomAt(b) - roomAt(a));
        if (open) {
          spots.yard.push(open);
        }
      }
    } else if (block.use === "plaza") {
      // The diagonals between the fountain and the corner trees, clear of the lamps.
      const { cx, cz } = plazaOf(block);
      for (const [dx, dz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        spots.square.push([cx + dx * 1.05, cz + dz * 1.05]);
      }
    } else if (block.use === "park") {
      const { court, pond, style } = parkOf(block);
      if (style === 0) {
        // Just past the water's edge, inside the ring the trees keep out of.
        for (let index = 0; index < 8; index += 1) {
          const angle = (index / 8) * Math.PI * 2 + 0.3;
          spots.shore.push([
            pond.x + Math.cos(angle) * (pond.rx + 0.1),
            pond.z + Math.sin(angle) * (pond.rz + 0.1),
          ]);
        }
      } else if (style === 2) {
        const middle = court.z + court.d / 2;
        for (const along of [0.25, 0.5, 0.75]) {
          spots.square.push([court.x + court.w * along, middle]);
        }
      }
    }
  }
  return spots;
};

const spotsOf = new WeakMap<CityPlan, Spots>();

/** The town's open spots, worked out once per plan. */
export const openSpots = (plan: CityPlan) => {
  let spots = spotsOf.get(plan);
  if (!spots) {
    spots = spotsIn(plan);
    spotsOf.set(plan, spots);
  }
  return spots;
};

const PUMPKIN = paint("pumpkin", "pumpkin", "pumpkinShade");
const STONE = paint("stone", "stone", "stoneShade");
const HAY = paint("hay", "hay", "hayShade");
const GOLD = paint("gold", "gold", "goldShade");
const RED = paint("festiveRed", "festiveRed", "festiveRedShade");
const GREEN = paint("festiveGreen", "festiveGreen", "festiveGreenShade");
const SNOW = paint("white", "white", "whiteShade");
const IRON = paint("screen");
const STEM = paint("trunk");
const RAINBOW: readonly Token[] = [
  "accentRed",
  "accentOrange",
  "accentYellow",
  "accentGreen",
  "accentBlue",
  "accentPurple",
];

const pumpkin = (sketch: Sketch, x: number, z: number, size = 1) => {
  const r = 0.065 * size;
  ball(sketch, { colors: PUMPKIN, detail: 10, r, ry: 0.72, x, y: GROUND + r * 0.72, z });
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

const gravestone = (sketch: Sketch, x: number, z: number, size = 1.3) => {
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
  ball(sketch, { colors: STONE, detail: 10, r: w / 2, rz: 0.35, x, y: GROUND + h, z });
};

/** A bare tree in ink, its branches crooked, for the graveyard. */
const deadTree = (sketch: Sketch, x: number, z: number, random: Random) => {
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

const christmasTree = (sketch: Sketch, x: number, z: number, random: Random, size = 1) => {
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
  // Baubles round the lower two tiers, and a star on top.
  for (let index = 0; index < 8; index += 1) {
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

const present = (sketch: Sketch, x: number, z: number, colors: Paint, size = 1) => {
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

const snowman = (sketch: Sketch, x: number, z: number) => {
  for (const [r, y] of [
    [0.065, 0.06],
    [0.048, 0.155],
    [0.034, 0.228],
  ] as const) {
    ball(sketch, { colors: SNOW, detail: 10, r, x, y: GROUND + y, z });
  }
  box(sketch, {
    colors: IRON,
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

const hayBale = (sketch: Sketch, x: number, z: number, y = GROUND) => {
  box(sketch, { colors: HAY, d: 0.13, h: 0.1, w: 0.22, x: x - 0.11, y, z: z - 0.065 });
};

const cornShock = (sketch: Sketch, x: number, z: number) => {
  round(sketch, { colors: HAY, h: 0.3, r: 0.06, segments: 8, top: 0.008, x, y: GROUND, z });
};

const egg = (sketch: Sketch, x: number, z: number, colors: Paint, size = 1) => {
  const r = 0.045 * size;
  ball(sketch, { colors, detail: 10, r, ry: 1.35, x, y: GROUND + r * 1.35, z });
};

/** A balloon on its string, tied at the ground. */
const balloon = (sketch: Sketch, x: number, z: number, height: number, colors: Paint) => {
  line(
    sketch,
    [
      [x, GROUND, z],
      [x, GROUND + height, z],
    ],
    "hair",
    "inkSoft",
  );
  ball(sketch, { colors, detail: 10, r: 0.055, ry: 1.15, x, y: GROUND + height + 0.06, z });
};

const potOfGold = (sketch: Sketch, x: number, z: number) => {
  ball(sketch, { colors: IRON, detail: 10, r: 0.075, ry: 0.75, x, y: GROUND + 0.05, z });
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
const rainbow = (sketch: Sketch, x: number, z: number, radius: number) => {
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
const lantern = (sketch: Sketch, x: number, y: number, z: number, size = 1) => {
  const r = 0.05 * size;
  ball(sketch, { colors: RED, detail: 10, r, ry: 0.85, x, y, z });
  for (const cap of [y + r * 0.8, y - r * 0.8 - 0.012 * size]) {
    round(
      sketch,
      { colors: GOLD, h: 0.012 * size, r: r * 0.45, segments: 8, x, y: cap, z },
      "hair",
    );
  }
  line(
    sketch,
    [
      [x, y - r * 0.8 - 0.012 * size, z],
      [x, y - r * 1.6, z],
    ],
    "fine",
    "festiveRed",
  );
};

/** A lantern on a post, hung from an arm. */
const lanternPost = (sketch: Sketch, x: number, z: number, height = 0.36) => {
  line(
    sketch,
    [
      [x, GROUND, z],
      [x, GROUND + height, z],
      [x + 0.07, GROUND + height, z],
    ],
    "fine",
  );
  lantern(sketch, x + 0.07, GROUND + height - 0.07, z);
};

/** A burst of fireworks in the sky above a spot. */
const fireworks = (sketch: Sketch, x: number, z: number, random: Random) => {
  const center: Vec3 = [x, GROUND + random.range(1.7, 2.3), z];
  const token = random.pick(["accentRed", "accentYellow", "accentBlue", "accentPink"] as const);
  for (let ray = 0; ray < 14; ray += 1) {
    const angle = (ray / 14) * Math.PI * 2;
    const tilt = random.range(-0.5, 0.5);
    const direction: Vec3 = [
      Math.cos(angle),
      Math.sin(angle) * 0.9 + tilt * 0.2,
      Math.sin(angle + tilt) * 0.6,
    ];
    const at = (reach: number): Vec3 => [
      center[0] + direction[0] * reach,
      center[1] + direction[1] * reach,
      center[2] + direction[2] * reach,
    ];
    line(sketch, [at(0.12), at(0.34)], "fine", token);
  }
};

/** Something a season puts at one spot. */
type Prop = (sketch: Sketch, x: number, z: number, random: Random) => void;

/** What a season puts out, by kind of spot; a kind it leaves out stays bare. */
export type Decor = Partial<Record<Kind, Prop>>;

const PASTELS = ROOFS.slice(0, 6);

/** Every season's decorations: keyed by season, so a new one isn't missed. */
export const DECOR: Record<SeasonId, Decor> = {
  christmas: {
    porch: (sketch, x, z, random) => christmasTree(sketch, x, z, random, 0.42),
    square: (sketch, x, z, random) => {
      christmasTree(sketch, x, z, random, 1.25);
      present(sketch, x + 0.2, z + 0.16, RED);
      present(sketch, x - 0.18, z + 0.2, GREEN, 0.8);
    },
    yard: (sketch, x, z) => snowman(sketch, x, z),
  },
  classic: {},
  easter: {
    porch: (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTELS)),
    shore: (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTELS)),
    square: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTELS), 3.2);
      egg(sketch, x + 0.22, z + 0.1, random.pick(PASTELS));
      egg(sketch, x - 0.2, z + 0.14, random.pick(PASTELS));
    },
    yard: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTELS));
      egg(sketch, x + 0.12, z + 0.06, random.pick(PASTELS));
      egg(sketch, x - 0.05, z + 0.13, random.pick(PASTELS));
    },
  },
  halloween: {
    porch: (sketch, x, z, random) => {
      pumpkin(sketch, x, z);
      if (random.chance(0.5)) {
        pumpkin(sketch, x - 0.1, z + 0.04, 0.7);
      }
    },
    shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
    square: (sketch, x, z, random) => {
      deadTree(sketch, x, z, random);
      gravestone(sketch, x - 0.22, z + 0.12);
      gravestone(sketch, x + 0.18, z + 0.16);
      pumpkin(sketch, x + 0.06, z + 0.24, 1.2);
    },
    yard: (sketch, x, z) => {
      gravestone(sketch, x - 0.08, z);
      gravestone(sketch, x + 0.1, z + 0.04);
    },
  },
  lunarNewYear: {
    porch: (sketch, x, z) => lanternPost(sketch, x, z),
    shore: (sketch, x, z) => lanternPost(sketch, x, z, 0.3),
    square: (sketch, x, z) => {
      lanternPost(sketch, x - 0.15, z, 0.62);
      lantern(sketch, x + 0.1, GROUND + 0.25, z + 0.08, 1.6);
    },
  },
  newYear: {
    square: fireworks,
    yard: (sketch, x, z, random) => {
      if (random.chance(0.4)) {
        balloon(sketch, x, z, 0.32, GOLD);
      }
    },
  },
  stPatricks: {
    porch: (sketch, x, z, random) => {
      if (random.chance(0.4)) {
        potOfGold(sketch, x, z);
      }
    },
    square: (sketch, x, z) => {
      potOfGold(sketch, x - 0.35, z);
      rainbow(sketch, x - 0.35, z, 0.4);
    },
  },
  thanksgiving: {
    porch: (sketch, x, z) => {
      pumpkin(sketch, x, z);
      pumpkin(sketch, x - 0.09, z + 0.05, 0.6);
    },
    shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
    square: (sketch, x, z) => {
      hayBale(sketch, x - 0.12, z);
      hayBale(sketch, x + 0.12, z);
      hayBale(sketch, x, z, GROUND + 0.1);
      cornShock(sketch, x + 0.3, z - 0.1);
      pumpkin(sketch, x - 0.05, z + 0.17, 1.1);
    },
    yard: (sketch, x, z) => {
      hayBale(sketch, x, z);
      pumpkin(sketch, x + 0.02, z + 0.12, 0.8);
    },
  },
  valentines: {
    porch: (sketch, x, z, random) => {
      if (random.chance(0.6)) {
        balloon(sketch, x, z, 0.3, random.pick([RED, paint("accentPink")]));
      }
    },
    square: (sketch, x, z, random) => {
      for (const [dx, dz, height] of [
        [0, 0, 0.55],
        [0.06, 0.04, 0.45],
        [-0.05, 0.05, 0.5],
        [0.03, -0.06, 0.4],
        [-0.04, -0.03, 0.62],
      ] as const) {
        balloon(sketch, x + dx, z + dz, height, random.pick([RED, paint("accentPink"), SNOW]));
      }
    },
  },
};

/**
 * The season's decorations, drawn into a sketch: the same ones in every view,
 * since each kind of spot gets its own stream of chances.
 */
export const drawDecor = (sketch: Sketch, plan: CityPlan, season: SeasonId) => {
  const decor = DECOR[season];
  const spots = openSpots(plan);
  for (const kind of KINDS) {
    const prop = decor[kind];
    if (!prop) {
      continue;
    }
    const random = createRandom(hashString(`${season}:${kind}`));
    for (const [x, z] of spots[kind]) {
      prop(sketch, x, z, random);
    }
  }
};
