// Each theme's one giant piece, in or beside the square's fountain: the
// town's tree, a waving skeleton, a lantern gate, a shamrock, a turkey, an
// egg, a heart. The ones with a front face the way the town is first seen;
// the flat ones face +z, so every view sees them at the same slant. Pure.
import type { Random } from "@/lib/random";
import type { Token } from "./palette";
import type { Point2, Sketch, Vec3 } from "./sketch";
import { GROUND, lantern, PUMPKIN, present, STEM } from "./decor-props";
import { BASIN } from "./draw-blocks";
import { cutout, heart } from "./draw-kit";
import { BLACK, GOLD, GREEN, paint, RED, WHITE } from "./palette";
import { ballTriangles, boxTriangles, extrude, FLANK_ON, headedTo, placed, rotate } from "./sketch";

const BLUE = paint("accentBlue");

/**
 * A giant piece's own frame, standing at a point and facing the way the town
 * is first seen: across it (+x), up from the ground (+y), toward the camera (+z).
 */
const facing = (sketch: Sketch, x: number, z: number) => {
  const turn = headedTo(FLANK_ON);
  return placed(sketch, (point) => {
    const [u, y, w] = turn(point);
    return [x + u, GROUND + y, z + w];
  });
};

/** A flat shape standing at a point, facing +z and a slab's depth thick. */
const standing = (
  sketch: Sketch,
  outline: readonly Point2[],
  at: Vec3,
  depth: number,
  colors = GOLD,
) =>
  extrude(
    sketch,
    outline,
    { origin: [at[0], at[1], at[2] - depth / 2], u: [1, 0, 0], v: [0, 1, 0] },
    [0, 0, depth],
    colors,
  );

const STAR: readonly Point2[] = Array.from({ length: 10 }, (_, index) => {
  const angle = Math.PI / 2 + (index / 10) * Math.PI * 2;
  const reach = (index % 2 === 0 ? 1 : 0.42) * 0.17;
  return [Math.cos(angle) * reach, Math.sin(angle) * reach];
});

/**
 * The town's tree, standing in the square's fountain: five tiers hung with
 * baubles and strung with lights round each, a gold star on top, presents
 * round its foot.
 */
export const townTree = (sketch: Sketch, x: number, z: number, random: Random) => {
  const pen = placed(sketch);
  pen.round({ colors: STEM, h: 0.3, r: 0.12, segments: 10, x, y: BASIN, z });
  const tiers = [
    { h: 0.55, r: 0.85, y: 0.3 },
    { h: 0.5, r: 0.7, y: 0.6 },
    { h: 0.45, r: 0.55, y: 0.88 },
    { h: 0.4, r: 0.4, y: 1.13 },
    { h: 0.36, r: 0.26, y: 1.36 },
  ] as const;
  const colors = [RED, GOLD, BLUE, WHITE] as const;
  for (const [index, tier] of tiers.entries()) {
    pen.round({
      colors: GREEN,
      h: tier.h,
      r: tier.r,
      segments: 16,
      top: 0,
      x,
      y: BASIN + tier.y,
      z,
    });
    // Lights round the tier's hem.
    const bulbs = Math.round(tier.r * 18);
    for (let bulb = 0; bulb < bulbs; bulb += 1) {
      const angle = (bulb / bulbs) * Math.PI * 2 + index;
      pen.ball({
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
      pen.ball({
        colors: random.pick([RED, GOLD, BLUE]),
        detail: 6,
        r: 0.045,
        x: x + Math.cos(angle) * reach,
        y: BASIN + tier.y + tier.h * up,
        z: z + Math.sin(angle) * reach,
      });
    }
  }
  standing(sketch, STAR, [x, BASIN + 1.86, z], 0.05);
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

/**
 * A giant skeleton, twice a cottage's height, standing beside the square's
 * fountain facing the way the town is first seen, one hand up in a wave.
 */
export const giantSkeleton = (sketch: Sketch, cx: number, cz: number) => {
  const pen = facing(sketch, cx - 1.7, cz);
  const bone = (from: Vec3, to: Vec3, r: number) => pen.rod(from, to, r, WHITE);
  const knob = (at: Vec3, r: number, detail = 6) =>
    pen.ball({ colors: WHITE, detail, r, x: at[0], y: at[1], z: at[2] });
  // Skull, jaw, sockets and nose.
  pen.ball({ colors: WHITE, detail: 12, r: 0.17, ry: 1.1, x: 0, y: 2, z: 0.02 });
  pen.ball({ colors: WHITE, detail: 8, r: 0.11, rx: 0.95, ry: 0.6, x: 0, y: 1.85, z: 0.06 });
  for (const u of [-0.065, 0.065]) {
    pen.ball({ colors: BLACK, detail: 6, r: 0.048, x: u, y: 2.03, z: 0.15 });
  }
  pen.ball({ colors: BLACK, detail: 5, r: 0.024, x: 0, y: 1.95, z: 0.175 });
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
  pen.ball({ colors: WHITE, detail: 10, r: 0.18, ry: 0.45, rz: 0.55, x: 0, y: 1, z: 0 });
  // Legs, knees and feet.
  for (const side of [-1, 1]) {
    const knee: Vec3 = [side * 0.12, 0.53, 0.03];
    bone([side * 0.1, 0.98, 0], knee, 0.045);
    bone(knee, [side * 0.12, 0.08, 0], 0.04);
    knob(knee, 0.055);
    pen.ball({
      colors: WHITE,
      detail: 6,
      r: 0.06,
      ry: 0.5,
      rz: 1.6,
      x: side * 0.13,
      y: 0.04,
      z: 0.08,
    });
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
    knob(elbow, 0.045);
    pen.ball({
      colors: WHITE,
      detail: 6,
      r: 0.06,
      ry: 1.3,
      x: wrist[0] + (wrist[0] - elbow[0]) * 0.25,
      y: wrist[1] + (wrist[1] - elbow[1]) * 0.25,
      z: wrist[2],
    });
  }
};

/**
 * A red gate over the square's fountain, its beam's ends swept up, a big
 * lantern hung from the middle and two small ones from the lower beam.
 */
export const lanternGate = (sketch: Sketch, cx: number, cz: number) => {
  const pen = facing(sketch, cx, cz);
  for (const side of [-1, 1]) {
    pen.rod([side * 0.95, 0, 0], [side * 0.95, 1.95, 0], 0.07, RED);
    pen.rod([side * 1.25, 1.9, 0], [side * 1.4, 2.02, 0], 0.06, RED);
  }
  pen.rod([-1.25, 1.9, 0], [1.25, 1.9, 0], 0.08, RED);
  pen.rod([-0.95, 1.6, 0], [0.95, 1.6, 0], 0.05, GOLD);
  pen.solid(boxTriangles({ colors: GOLD, d: 0.06, h: 0.2, w: 0.4, x: -0.2, y: 1.65, z: -0.03 }));
  // The big lantern, ribbed in gold.
  const y = 1.12;
  const size = 6.4;
  const r = 0.05 * size;
  pen.line([
    [0, 1.86, 0],
    [0, y + r * 0.8, 0],
  ]);
  lantern(pen, [0, y, 0], size);
  for (const turn of [-0.6, 0, 0.6]) {
    const rib = Array.from({ length: 9 }, (_, step): Vec3 => {
      const lat = -Math.PI / 2 + (step / 8) * Math.PI;
      const reach = Math.cos(lat) * r * 1.01;
      return [Math.sin(turn) * reach, y + Math.sin(lat) * r * 0.85, Math.cos(turn) * reach];
    });
    pen.line(rib, "hair", "gold");
  }
  for (const u of [-0.6, 0.6]) {
    pen.line([
      [u, 1.58, 0],
      [u, 1.4, 0],
    ]);
    lantern(pen, [u, 1.32, 0], 1.6);
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
export const giantShamrock = (sketch: Sketch, x: number, z: number, random: Random) => {
  const pen = placed(sketch);
  const middle = GROUND + 1.35;
  pen.rod([x, BASIN, z], [x + 0.12, GROUND + 0.75, z], 0.05, GREEN);
  pen.rod([x + 0.12, GROUND + 0.75, z], [x, middle, z], 0.05, GREEN);
  for (const leaf of SHAMROCK) {
    standing(sketch, leaf, [x, middle, z], 0.1, GREEN);
  }
  for (let coin = 0; coin < 9; coin += 1) {
    const angle = random.range(0, Math.PI * 2);
    const reach = random.range(0.2, 0.45);
    pen.round(
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
export const giantTurkey = (sketch: Sketch, cx: number, cz: number) => {
  const pen = facing(sketch, cx - 1.7, cz);
  const feathers = [RED, PUMPKIN, GOLD, paint("skinDark")] as const;
  for (let index = 0; index < 11; index += 1) {
    const tilt = -1.4 + (index / 10) * 2.8;
    // Fanned from behind its back, each a little in front of the one outside
    // it, so the fan overlaps.
    pen
      .moved((point) => {
        const [u, y, w] = rotate(point, [0, 0, 0], "z", tilt);
        return [u, 0.78 + y, w - 0.32 - Math.abs(tilt) * 0.03];
      })
      .ball({
        colors: feathers[index % feathers.length] ?? GOLD,
        detail: 10,
        r: 0.1,
        ry: 4.6,
        rz: 0.3,
        x: 0,
        y: 0.46,
        z: 0,
      });
  }
  const brown = paint("skinDark", "skinDark", "trunk");
  pen.ball({ colors: brown, detail: 14, r: 0.42, ry: 0.95, rz: 1.1, x: 0, y: 0.66, z: 0 });
  for (const side of [-1, 1]) {
    pen.ball({
      colors: paint("trunk"),
      detail: 10,
      r: 0.22,
      rx: 0.45,
      ry: 0.75,
      rz: 1.5,
      x: side * 0.38,
      y: 0.66,
      z: 0.02,
    });
    pen.rod([side * 0.13, 0.32, 0.05], [side * 0.15, 0, 0.1], 0.035, GOLD);
  }
  pen.rod([0, 0.9, 0.3], [0, 1.24, 0.4], 0.075, brown);
  pen.ball({ colors: paint("skin"), detail: 10, r: 0.12, x: 0, y: 1.32, z: 0.43 });
  pen.ball({ colors: RED, detail: 8, r: 0.05, ry: 1.9, x: 0.04, y: 1.2, z: 0.5 });
  for (const u of [-0.055, 0.055]) {
    pen.ball({ colors: BLACK, detail: 5, r: 0.022, x: u, y: 1.36, z: 0.53 });
  }
  // The beak, pointing forward.
  pen
    .moved((point) => {
      const [u, y, w] = rotate(point, [0, 0, 0], "x", Math.PI / 2);
      return [u, y + 1.3, w + 0.53];
    })
    .round({ colors: GOLD, h: 0.12, r: 0.045, segments: 8, top: 0, x: 0, z: 0 });
};

/** A giant painted egg standing in the square's fountain, in bands of color. */
export const giantEgg = (sketch: Sketch, x: number, z: number) => {
  const r = 0.38;
  const bands: readonly Token[] = ["accentPink", "accentYellow", "accentTeal", "accentPurple"];
  placed(sketch).solid(
    ballTriangles({ colors: WHITE, detail: 16, r, ry: 1.35, x, y: BASIN + r * 1.35, z }).map(
      (triangle) => {
        const y = (triangle.a[1] + triangle.b[1] + triangle.c[1]) / 3 - BASIN;
        const band = Math.floor((y / (r * 2.7)) * 7);
        const token = band % 2 === 1 ? bands[Math.floor(band / 2) % bands.length] : undefined;
        return token ? { ...triangle, colors: paint(token) } : triangle;
      },
    ),
    "fine",
    70,
  );
};

/** A big red heart standing in the square's fountain. */
export const fountainHeart = (sketch: Sketch, x: number, z: number) => {
  const size = 0.6;
  cutout(sketch, heart(size), [x, BASIN + size, z - 0.06], RED, 0.12);
};
