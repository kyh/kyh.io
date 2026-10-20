// What the town puts out for the season (src/seasons): jack-o'-lanterns on
// the porches and graves in the gardens at Halloween, snowmen and trees on
// the square at Christmas. Each season decorates five kinds of spot the town
// leaves open: beside the cottages' doors, a garden's open corner, round the
// pond, the square and the ball courts, and the square's middle, for one
// giant piece (the town's tree at Christmas, a skeleton at Halloween). Drawn
// into a sketch of their own per view, so a season change swaps them without
// redrawing the town (engine.ts), and shown in color: the town is grey, its
// decorations aren't. What it does to the sky (the blimp's look, what flies
// over) is here too, drawn by blimp.ts and sky.ts. Pure.
import type { Random } from "@/lib/random";
import type { SeasonId } from "@/seasons/seasons";
import { createRandom, hashString } from "@/lib/random";
import { HEART } from "@/seasons/seasons";
import type { Paint, Token } from "./palette";
import type { CityPlan } from "./plan";
import type { BlimpLook } from "./blimp";
import type { Flyer } from "./sky";
import type { Point2, Sketch, Triangle, Vec3 } from "./sketch";
import type { Steps } from "./steps";
import type { HouseSpec } from "./draw-blocks";
import { bunnyEars, heartCrest, lanterns, santaHat, topHat, witchHat } from "./blimp";
import { CURB_TOP, doorstep, eavesOf, houseCells, parkOf, plazaOf } from "./draw-blocks";
import { cutout, heart } from "./draw-kit";
import { paint, PASTEL_ROOFS } from "./palette";
import { drawSleigh, drawWitch } from "./sky";
import {
  ball,
  ballTriangles,
  box,
  boxTriangles,
  extrude,
  line,
  mapTriangles,
  rodTriangles,
  rotate,
  round,
  roundTriangles,
  solid,
} from "./sketch";
import { finish } from "./steps";

/** How many spots are decorated between steps, when drawn over frames. */
const SPOTS_A_STEP = 12;

/** Where a decoration stands: on the block, a hair above the lawns and paving. */
const GROUND = CURB_TOP + 0.012;

type Spot = readonly [x: number, z: number];

/**
 * The kinds of open place a season can decorate: beside each cottage's door
 * (porch), a garden's corner furthest from its tree and bush (yard), round
 * the pond between the water and the trees (shore), the square round its
 * fountain and the ball courts, with room for something big (square), and the
 * square's fountain, for the season's one giant piece (centerpiece).
 */
const KINDS = ["porch", "yard", "shore", "square", "centerpiece"] as const;

type Kind = (typeof KINDS)[number];

/** The open places, by kind, and the cottages themselves, the same in every view. */
export type Spots = Record<Kind, Spot[]> & { houses: HouseSpec[] };

const distance = ([ax, az]: Spot, [bx, bz]: Spot) => Math.hypot(ax - bx, az - bz);

const spotsIn = (plan: CityPlan): Spots => {
  const spots: Spots = {
    centerpiece: [],
    houses: [],
    porch: [],
    shore: [],
    square: [],
    yard: [],
  };
  for (const block of plan.blocks) {
    if (block.use === "houses") {
      for (const cell of houseCells(block)) {
        if ("house" in cell) {
          const { x, z } = doorstep(cell.house);
          spots.porch.push([x, z]);
          spots.houses.push(cell.house);
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
      spots.centerpiece.push([cx, cz]);
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

/** A string of bulbs hung all the way round a cottage's eaves, sagging between them, the colors in turn. */
const eaveLights = (sketch: Sketch, house: HouseSpec, colors: readonly Token[]) => {
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

/** The rim of the square's fountain, which a centerpiece stands in. */
const BASIN = CURB_TOP + 0.1;

const BLUE = paint("accentBlue");
const STAR: readonly Point2[] = Array.from({ length: 10 }, (_, index) => {
  const angle = Math.PI / 2 + (index / 10) * Math.PI * 2;
  const reach = index % 2 === 0 ? 1 : 0.42;
  return [Math.cos(angle) * reach, Math.sin(angle) * reach];
});

/**
 * The town's tree, standing in the square's fountain: five tiers hung with
 * baubles and strung with lights round each, a gold star on top, presents
 * round its foot.
 */
const townTree = (sketch: Sketch, x: number, z: number, random: Random) => {
  round(sketch, { colors: STEM, h: 0.3, r: 0.12, segments: 10, x, y: BASIN, z });
  const tiers = [
    { h: 0.55, r: 0.85, y: 0.3 },
    { h: 0.5, r: 0.7, y: 0.6 },
    { h: 0.45, r: 0.55, y: 0.88 },
    { h: 0.4, r: 0.4, y: 1.13 },
    { h: 0.36, r: 0.26, y: 1.36 },
  ] as const;
  for (const tier of tiers) {
    round(sketch, {
      colors: GREEN,
      h: tier.h,
      r: tier.r,
      segments: 16,
      top: 0,
      x,
      y: BASIN + tier.y,
      z,
    });
  }
  const colors = [RED, GOLD, BLUE, SNOW] as const;
  for (const [index, tier] of tiers.entries()) {
    // Lights round the tier's hem.
    const bulbs = Math.round(tier.r * 18);
    for (let bulb = 0; bulb < bulbs; bulb += 1) {
      const angle = (bulb / bulbs) * Math.PI * 2 + index;
      ball(sketch, {
        colors: colors[(bulb + index) % colors.length] ?? GOLD,
        detail: 5,
        r: 0.026,
        x: x + Math.cos(angle) * tier.r * 0.96,
        y: BASIN + tier.y + 0.03,
        z: z + Math.sin(angle) * tier.r * 0.96,
      });
    }
    // Baubles up its sides.
    for (let bauble = 0; bauble < 6; bauble += 1) {
      const up = random.range(0.2, 0.65);
      const angle = random.range(0, Math.PI * 2);
      const reach = tier.r * (1 - up) + 0.02;
      ball(sketch, {
        colors: random.pick([RED, GOLD, BLUE]),
        detail: 6,
        r: 0.045,
        x: x + Math.cos(angle) * reach,
        y: BASIN + tier.y + tier.h * up,
        z: z + Math.sin(angle) * reach,
      });
    }
  }
  // A star, its faces to the views on either side.
  const size = 0.17;
  extrude(
    sketch,
    STAR.map(([u, v]) => [u * size, v * size] satisfies Point2),
    { origin: [x, BASIN + 1.86, z - 0.025], u: [1, 0, 0], v: [0, 1, 0] },
    [0, 0, 0.05],
    GOLD,
  );
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2 + random.range(-0.2, 0.2);
    const reach = random.range(0.95, 1.1);
    present(
      sketch,
      x + Math.cos(angle) * reach,
      z + Math.sin(angle) * reach,
      random.pick([RED, GREEN, BLUE, paint("accentPurple")]),
      random.range(1.2, 1.7),
    );
  }
};

const BONE = paint("white", "white", "whiteShade");

/**
 * A giant piece's own frame, standing at a point and facing the way the town
 * is first seen: across it (u), up from the ground (y), and toward the camera (w).
 */
const facing =
  (x: number, z: number) =>
  ([u, y, w]: Vec3): Vec3 => [x + (u + w) * Math.SQRT1_2, GROUND + y, z + (w - u) * Math.SQRT1_2];

/**
 * A giant skeleton, twice a cottage's height, standing beside the square's
 * fountain facing the way the town is first seen, one hand up in a wave.
 */
const giantSkeleton = (sketch: Sketch, cx: number, cz: number) => {
  const at = facing(cx - 1.7, cz);
  const bone = (from: Vec3, to: Vec3, r: number) =>
    solid(sketch, rodTriangles(at(from), at(to), r, BONE));
  const knob = (triangles: readonly Triangle[]) =>
    solid(sketch, mapTriangles(triangles, at), "fine", 70);
  // Skull, jaw, sockets and nose.
  knob(ballTriangles({ colors: BONE, detail: 12, r: 0.17, ry: 1.1, x: 0, y: 2, z: 0.02 }));
  knob(
    ballTriangles({ colors: BONE, detail: 8, r: 0.11, rx: 0.95, ry: 0.6, x: 0, y: 1.85, z: 0.06 }),
  );
  for (const u of [-0.065, 0.065]) {
    knob(ballTriangles({ colors: IRON, detail: 6, r: 0.048, x: u, y: 2.03, z: 0.15 }));
  }
  knob(ballTriangles({ colors: IRON, detail: 5, r: 0.024, x: 0, y: 1.95, z: 0.175 }));
  // Neck, spine, collarbones and breastbone.
  bone([0, 1.68, -0.02], [0, 1.82, 0], 0.035);
  bone([0, 1, -0.04], [0, 1.7, -0.04], 0.04);
  bone([-0.27, 1.67, 0], [0.27, 1.67, 0], 0.03);
  bone([0, 1.6, 0.13], [0, 1.3, 0.12], 0.026);
  // Ribs: each curls from the spine round the side to the breastbone, dipping as it goes.
  for (let rib = 0; rib < 5; rib += 1) {
    const y = 1.58 - rib * 0.085;
    const wide = 0.2 - Math.abs(rib - 1.5) * 0.012;
    for (const side of [-1, 1]) {
      const points = Array.from({ length: 7 }, (_, step): Vec3 => {
        const angle = -Math.PI / 2 + (step / 6) * (Math.PI - 0.3);
        return [side * Math.cos(angle) * wide, y - (step / 6) * 0.06, Math.sin(angle) * 0.14];
      });
      for (const [index, from] of points.entries()) {
        const to = points[index + 1];
        if (to) {
          bone(from, to, 0.02);
        }
      }
    }
  }
  knob(ballTriangles({ colors: BONE, detail: 10, r: 0.18, ry: 0.45, rz: 0.55, x: 0, y: 1, z: 0 }));
  // Legs, knees and feet.
  for (const side of [-1, 1]) {
    const hip: Vec3 = [side * 0.1, 0.98, 0];
    const knee: Vec3 = [side * 0.12, 0.53, 0.03];
    const ankle: Vec3 = [side * 0.12, 0.08, 0];
    bone(hip, knee, 0.045);
    bone(knee, ankle, 0.04);
    knob(ballTriangles({ colors: BONE, detail: 6, r: 0.055, x: knee[0], y: knee[1], z: knee[2] }));
    knob(
      ballTriangles({
        colors: BONE,
        detail: 6,
        r: 0.06,
        ry: 0.5,
        rz: 1.6,
        x: side * 0.13,
        y: 0.04,
        z: 0.08,
      }),
    );
  }
  // One arm hanging, the other raised in a wave.
  for (const [shoulder, elbow, wrist] of [
    [
      [-0.27, 1.66, 0],
      [-0.36, 1.28, 0],
      [-0.4, 0.96, 0.06],
    ],
    [
      [0.27, 1.66, 0],
      [0.52, 1.78, 0.05],
      [0.58, 2.1, 0.08],
    ],
  ] satisfies [Vec3, Vec3, Vec3][]) {
    bone(shoulder, elbow, 0.038);
    bone(elbow, wrist, 0.032);
    knob(
      ballTriangles({ colors: BONE, detail: 6, r: 0.045, x: elbow[0], y: elbow[1], z: elbow[2] }),
    );
    const hand: Vec3 = [
      wrist[0] + (wrist[0] - elbow[0]) * 0.25,
      wrist[1] + (wrist[1] - elbow[1]) * 0.25,
      wrist[2],
    ];
    knob(
      ballTriangles({
        colors: BONE,
        detail: 6,
        r: 0.06,
        ry: 1.3,
        x: hand[0],
        y: hand[1],
        z: hand[2],
      }),
    );
  }
};

/**
 * A red gate over the square's fountain, its beam's ends swept up, a big
 * lantern hung from the middle and two small ones from the lower beam.
 */
const lanternGate = (sketch: Sketch, cx: number, cz: number) => {
  const at = facing(cx, cz);
  const rod = (from: Vec3, to: Vec3, r: number, colors: Paint) =>
    solid(sketch, rodTriangles(at(from), at(to), r, colors));
  for (const side of [-1, 1]) {
    rod([side * 0.95, 0, 0], [side * 0.95, 1.95, 0], 0.07, RED);
    rod([side * 1.25, 1.9, 0], [side * 1.4, 2.02, 0], 0.06, RED);
  }
  rod([-1.25, 1.9, 0], [1.25, 1.9, 0], 0.08, RED);
  rod([-0.95, 1.6, 0], [0.95, 1.6, 0], 0.05, GOLD);
  solid(
    sketch,
    mapTriangles(
      boxTriangles({ colors: GOLD, d: 0.06, h: 0.2, w: 0.4, x: -0.2, y: 1.65, z: -0.03 }),
      at,
    ),
  );
  // The big lantern, ribbed in gold.
  const y = 1.12;
  const r = 0.32;
  line(sketch, [at([0, 1.86, 0]), at([0, y + r * 0.8, 0])], "fine");
  solid(
    sketch,
    mapTriangles(ballTriangles({ colors: RED, detail: 14, r, ry: 0.85, x: 0, y, z: 0 }), at),
    "fine",
    70,
  );
  for (const cap of [y + r * 0.8, y - r * 0.8 - 0.05]) {
    solid(
      sketch,
      mapTriangles(
        roundTriangles({ colors: GOLD, h: 0.05, r: 0.13, segments: 10, x: 0, y: cap, z: 0 }),
        at,
      ),
    );
  }
  for (const turn of [-0.6, 0, 0.6]) {
    const rib = Array.from({ length: 9 }, (_, step): Vec3 => {
      const lat = -Math.PI / 2 + (step / 8) * Math.PI;
      const reach = Math.cos(lat) * r * 1.01;
      return at([Math.sin(turn) * reach, y + Math.sin(lat) * r * 0.85, Math.cos(turn) * reach]);
    });
    line(sketch, rib, "hair", "gold");
  }
  line(sketch, [at([0, y - r * 0.8 - 0.05, 0]), at([0, y - r * 1.7, 0])], "bold", "festiveRed");
  for (const u of [-0.6, 0.6]) {
    const [x, ly, z] = at([u, 1.32, 0]);
    line(sketch, [at([u, 1.58, 0]), at([u, 1.4, 0])], "fine");
    lantern(sketch, x, ly, z, 1.6);
  }
};

/** Three heart leaves round a point, tips in. */
const SHAMROCK: readonly (readonly Point2[])[] = [90, 210, 330].map((degrees) => {
  const size = 0.45;
  const turn = ((degrees - 90) * Math.PI) / 180;
  return heart(size).map(([u, v]): Point2 => {
    const up = v + size;
    return [u * Math.cos(turn) - up * Math.sin(turn), u * Math.sin(turn) + up * Math.cos(turn)];
  });
});

/** A giant shamrock standing in the square's fountain, gold coins wished into the water round it. */
const giantShamrock = (sketch: Sketch, x: number, z: number, random: Random) => {
  const at = facing(x, z);
  const middle = 1.35;
  const stem = BASIN - GROUND;
  solid(sketch, rodTriangles(at([0, stem, 0]), at([0.12, 0.75, 0]), 0.05, GREEN));
  solid(sketch, rodTriangles(at([0.12, 0.75, 0]), at([0, middle, 0]), 0.05, GREEN));
  // Flat leaves, faced the way the town is first seen, a hand's depth thick.
  const thick = 0.1;
  const out: Vec3 = [Math.SQRT1_2 * thick, 0, Math.SQRT1_2 * thick];
  const [ox, oy, oz] = at([0, middle, 0]);
  for (const leaf of SHAMROCK) {
    extrude(
      sketch,
      leaf,
      {
        origin: [ox - out[0] / 2, oy, oz - out[2] / 2],
        u: [Math.SQRT1_2, 0, -Math.SQRT1_2],
        v: [0, 1, 0],
      },
      out,
      GREEN,
    );
  }
  for (let coin = 0; coin < 9; coin += 1) {
    const angle = random.range(0, Math.PI * 2);
    const reach = random.range(0.2, 0.45);
    round(
      sketch,
      {
        colors: GOLD,
        h: 0.012,
        r: 0.045,
        segments: 8,
        x: x + Math.cos(angle) * reach,
        y: BASIN + 0.004,
        z: z + Math.sin(angle) * reach,
      },
      "hair",
    );
  }
};

/** A giant turkey beside the square's fountain, its tail fanned out behind it. */
const giantTurkey = (sketch: Sketch, cx: number, cz: number) => {
  const at = facing(cx - 1.7, cz);
  const plump = (triangles: readonly Triangle[]) =>
    solid(sketch, mapTriangles(triangles, at), "fine", 70);
  const feathers = [RED, PUMPKIN, GOLD, paint("skinDark")] as const;
  const fan: Vec3 = [0, 0.78, -0.32];
  for (let index = 0; index < 11; index += 1) {
    const tilt = -1.4 + (index / 10) * 2.8;
    const feather = ballTriangles({
      colors: feathers[index % feathers.length] ?? GOLD,
      detail: 10,
      r: 0.1,
      ry: 4.6,
      rz: 0.3,
      x: 0,
      y: 0.46,
      z: 0,
    });
    plump(
      mapTriangles(feather, (point) => {
        const [u, y, w] = rotate(point, [0, 0, 0], "z", tilt);
        // Each a little in front of the one outside it, so the fan overlaps.
        return [fan[0] + u, fan[1] + y, fan[2] + w - Math.abs(tilt) * 0.03];
      }),
    );
  }
  const BROWN = paint("skinDark", "skinDark", "trunk");
  plump(
    ballTriangles({ colors: BROWN, detail: 14, r: 0.42, ry: 0.95, rz: 1.1, x: 0, y: 0.66, z: 0 }),
  );
  for (const side of [-1, 1]) {
    plump(
      ballTriangles({
        colors: paint("trunk"),
        detail: 10,
        r: 0.22,
        rx: 0.45,
        ry: 0.75,
        rz: 1.5,
        x: side * 0.38,
        y: 0.66,
        z: 0.02,
      }),
    );
    solid(
      sketch,
      rodTriangles(at([side * 0.13, 0.32, 0.05]), at([side * 0.15, 0, 0.1]), 0.035, GOLD),
    );
  }
  solid(sketch, rodTriangles(at([0, 0.9, 0.3]), at([0, 1.24, 0.4]), 0.075, BROWN));
  plump(ballTriangles({ colors: paint("skin"), detail: 10, r: 0.12, x: 0, y: 1.32, z: 0.43 }));
  plump(ballTriangles({ colors: RED, detail: 8, r: 0.05, ry: 1.9, x: 0.04, y: 1.2, z: 0.5 }));
  for (const u of [-0.055, 0.055]) {
    plump(ballTriangles({ colors: IRON, detail: 5, r: 0.022, x: u, y: 1.36, z: 0.53 }));
  }
  plump(
    mapTriangles(
      roundTriangles({ colors: GOLD, h: 0.12, r: 0.045, segments: 8, top: 0, x: 0, z: 0 }),
      (point) => {
        const [u, y, w] = rotate(point, [0, 0, 0], "x", Math.PI / 2);
        return [u, y + 1.3, w + 0.53];
      },
    ),
  );
};

/** A giant painted egg standing in the square's fountain, in bands of color. */
const giantEgg = (sketch: Sketch, x: number, z: number) => {
  const r = 0.38;
  const bands: readonly Token[] = ["accentPink", "accentYellow", "accentTeal", "accentPurple"];
  const triangles = ballTriangles({
    colors: SNOW,
    detail: 16,
    r,
    ry: 1.35,
    x,
    y: BASIN + r * 1.35,
    z,
  });
  solid(
    sketch,
    triangles.map((triangle) => {
      const y = (triangle.a[1] + triangle.b[1] + triangle.c[1]) / 3 - BASIN;
      const band = Math.floor((y / (r * 2.7)) * 7);
      const token = band % 2 === 1 ? bands[Math.floor(band / 2) % bands.length] : undefined;
      return token ? { ...triangle, colors: paint(token) } : triangle;
    }),
    "fine",
    70,
  );
};

/** A big red heart standing in the square's fountain. */
const fountainHeart = (sketch: Sketch, x: number, z: number) => {
  const size = 0.6;
  cutout(sketch, heart(size), [x, BASIN + size, z - 0.06], RED, 0.12);
};

/** Something a season puts at one spot. */
type Prop = (sketch: Sketch, x: number, z: number, random: Random) => void;

/** What rises now and then from the town's people: a path in a 24×24 box, and its fill. */
export interface Emote {
  d: string;
  fill: string;
}

/**
 * What a season puts out, by kind of spot, what it does to each cottage, what
 * its people send up (life.ts floats it), how the blimp looks, and what else
 * flies over (sky-scene.ts flies both); a kind it leaves out stays bare.
 */
export interface Decor extends Partial<Record<Kind, Prop>> {
  house?: (sketch: Sketch, house: HouseSpec) => void;
  emote?: Emote;
  blimp?: BlimpLook;
  flyer?: Flyer;
}

/** Each season's string of lights, on the cottages' eaves and the blimp's back alike. */
const LIGHTS = {
  christmas: ["festiveRed", "gold", "festiveGreen", "accentBlue"],
  easter: ["accentPink", "accentYellow", "accentTeal", "accentPurple"],
  halloween: ["pumpkin", "accentPurple"],
  lunarNewYear: ["festiveRed", "festiveRed", "gold"],
  stPatricks: ["festiveGreen", "gold"],
  thanksgiving: ["pumpkin", "gold", "festiveRed"],
  valentines: ["festiveRed", "accentPink", "white"],
} as const satisfies Partial<Record<SeasonId, readonly Token[]>>;

/** Every season's decorations: keyed by season, so a new one isn't missed. */
export const DECOR: Record<SeasonId, Decor> = {
  christmas: {
    blimp: {
      banner: "festiveRed",
      fins: "festiveGreen",
      lettering: "white",
      lights: LIGHTS.christmas,
      text: "HO HO HO",
      trim: santaHat,
    },
    centerpiece: townTree,
    flyer: drawSleigh,
    house: (sketch, house) => eaveLights(sketch, house, LIGHTS.christmas),
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
    blimp: {
      banner: "accentPurple",
      fins: "accentPink",
      lettering: "white",
      lights: LIGHTS.easter,
      text: "HAPPY EASTER",
      trim: bunnyEars,
    },
    centerpiece: giantEgg,
    porch: (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTEL_ROOFS)),
    shore: (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTEL_ROOFS)),
    square: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTEL_ROOFS), 3.2);
      egg(sketch, x + 0.22, z + 0.1, random.pick(PASTEL_ROOFS));
      egg(sketch, x - 0.2, z + 0.14, random.pick(PASTEL_ROOFS));
    },
    yard: (sketch, x, z, random) => {
      egg(sketch, x, z, random.pick(PASTEL_ROOFS));
      egg(sketch, x + 0.12, z + 0.06, random.pick(PASTEL_ROOFS));
      egg(sketch, x - 0.05, z + 0.13, random.pick(PASTEL_ROOFS));
    },
  },
  halloween: {
    blimp: {
      banner: "pumpkin",
      fins: "accentPurple",
      lettering: "screen",
      lights: LIGHTS.halloween,
      text: "BOO!",
      trim: witchHat,
    },
    centerpiece: giantSkeleton,
    flyer: drawWitch,
    house: (sketch, house) => eaveLights(sketch, house, LIGHTS.halloween),
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
    blimp: {
      banner: "festiveRed",
      fins: "gold",
      lettering: "white",
      lights: LIGHTS.lunarNewYear,
      text: "HAPPY NEW YEAR",
      trim: lanterns,
    },
    centerpiece: lanternGate,
    house: (sketch, house) => eaveLights(sketch, house, LIGHTS.lunarNewYear),
    porch: (sketch, x, z) => lanternPost(sketch, x, z),
    shore: (sketch, x, z) => lanternPost(sketch, x, z, 0.3),
    square: (sketch, x, z) => {
      lanternPost(sketch, x - 0.15, z, 0.62);
      lantern(sketch, x + 0.1, GROUND + 0.25, z + 0.08, 1.6);
    },
  },
  stPatricks: {
    blimp: {
      banner: "festiveGreen",
      fins: "gold",
      lettering: "gold",
      lights: LIGHTS.stPatricks,
      text: "LUCKY",
      trim: topHat("festiveGreen", "screen"),
    },
    centerpiece: giantShamrock,
    house: (sketch, house) => eaveLights(sketch, house, LIGHTS.stPatricks),
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
    blimp: {
      banner: "pumpkin",
      fins: "festiveRed",
      lettering: "white",
      lights: LIGHTS.thanksgiving,
      text: "GIVE THANKS",
      trim: topHat("screen", "screen"),
    },
    centerpiece: giantTurkey,
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
    blimp: {
      banner: "accentPink",
      fins: "festiveRed",
      lettering: "white",
      lights: LIGHTS.valentines,
      text: "BE MINE",
      trim: heartCrest,
    },
    centerpiece: fountainHeart,
    emote: { d: HEART, fill: "#ff4f7b" },
    house: (sketch, house) => eaveLights(sketch, house, LIGHTS.valentines),
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
 * @yields {void} every few spots, so it can be spread over frames.
 */
export const decorSteps = function* decorSteps(
  sketch: Sketch,
  plan: CityPlan,
  season: SeasonId,
): Steps<void> {
  const decor = DECOR[season];
  const spots = openSpots(plan);
  for (const kind of KINDS) {
    const prop = decor[kind];
    if (!prop) {
      continue;
    }
    const random = createRandom(hashString(`${season}:${kind}`));
    for (const [index, [x, z]] of spots[kind].entries()) {
      prop(sketch, x, z, random);
      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }
    yield;
  }
  if (decor.house) {
    for (const [index, house] of spots.houses.entries()) {
      decor.house(sketch, house);
      if (index % SPOTS_A_STEP === SPOTS_A_STEP - 1) {
        yield;
      }
    }
  }
};

/** The same, all at once. */
export const drawDecor = (sketch: Sketch, plan: CityPlan, season: SeasonId) =>
  finish(decorSteps(sketch, plan, season));
