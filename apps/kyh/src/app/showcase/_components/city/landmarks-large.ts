// The big projects, one block each: Founding's tower at the center of town,
// Vibedgames' arcade, the Yours Sincerely post office and UICapsule's gallery.
import type { Footprint } from "./draw-kit";
import type { DrawLandmark, Site } from "./landmark";
import type { Point2, Sketch, Triangle, Vec3 } from "./sketch";
import {
  bench,
  board,
  bush,
  cutout,
  door,
  flag,
  FLOOR,
  heart,
  inset,
  lamp,
  parapet,
  ribbons,
  storefront,
  tree,
  windows,
} from "./draw-kit";
import { bounds } from "./landmark";
import { paint, ROOFS, WALLS } from "./palette";
import {
  ball,
  ballTriangles,
  box,
  extrude,
  gable,
  line,
  mapTriangles,
  part,
  rotate,
  round,
  roundTriangles,
  solid,
} from "./sketch";

export const PLAZA = paint("paving", "wallLeft", "wallRight");

/** Paving over the whole lot, just above the curb. */
export const plaza = (sketch: Sketch, site: Site) => {
  box(
    sketch,
    {
      colors: PLAZA,
      d: site.d - 0.3,
      h: 0.015,
      w: site.w - 0.3,
      x: site.x + 0.15,
      y: site.y,
      z: site.z + 0.15,
    },
    "hair",
  );
  return site.y + 0.015;
};

/** A low monument sign out front, the way campuses announce themselves. */
export const monument = (
  sketch: Sketch,
  x: number,
  z: number,
  y: number,
  text: string,
  width = 1.4,
) => {
  const slab = { d: 0.16, w: width, x, z };
  box(sketch, { ...slab, colors: WALLS, h: 0.05, y });
  board(sketch, slab, {
    along: 0,
    colors: paint("signBoard", "signBoard", "wallRight"),
    h: 0.3,
    side: "front",
    text,
    w: width,
    y: y + 0.05,
  });
};

// Founding: the tallest tower in town, crowned with its name.

export const drawFounding: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const podium = { d: 3.8, w: 3.8, x: site.x + 0.75, z: site.z + 0.45 };
  box(sketch, { ...podium, colors: WALLS, h: 0.8, y: y0 });
  ribbons(sketch, podium, "front", { floorHeight: 0.38, floors: 2, y: y0 + 0.06 });
  ribbons(sketch, podium, "side", { floorHeight: 0.38, floors: 2, y: y0 + 0.06 });
  parapet(sketch, podium, y0 + 0.8);
  const tower = inset(podium, 0.42);
  const floors = 17;
  let y = y0 + 0.8;
  box(sketch, { ...tower, colors: WALLS, h: floors * FLOOR, y });
  ribbons(sketch, tower, "front", { floors, y: y + 0.08 });
  ribbons(sketch, tower, "side", { floors, y: y + 0.08 });
  y += floors * FLOOR;
  box(sketch, { ...tower, colors: paint("navy"), h: 0.1, y }, "fine");
  y += 0.1;
  const crown = inset(tower, 0.32);
  box(sketch, { ...crown, colors: WALLS, h: 0.85, y });
  board(sketch, crown, {
    along: 0.12,
    colors: paint("navy"),
    h: 0.42,
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    w: crown.w - 0.24,
    y: y + 0.22,
  });
  board(sketch, crown, {
    along: 0.12,
    colors: paint("navy"),
    h: 0.42,
    ink: "white",
    side: "side",
    text: "F",
    w: 0.5,
    y: y + 0.22,
  });
  y += 0.85;
  parapet(sketch, crown, y);
  const cx = crown.x + crown.w / 2;
  const cz = crown.z + crown.d / 2;
  round(sketch, {
    colors: paint("metal", "metal", "metalDark"),
    h: 1.4,
    r: 0.07,
    segments: 8,
    top: 0.025,
    x: cx,
    y,
    z: cz,
  });
  const beacon = part(sketch, "founding:beacon", [cx, y + 1.42, cz]);
  ball(beacon, { colors: paint("accentRed"), detail: 8, r: 0.07, x: 0, y: 0, z: 0 }, "hair");
  // Entrance canopy, flags and trees on the plaza.
  box(
    sketch,
    {
      colors: paint("navy"),
      d: 0.5,
      h: 0.05,
      w: 1.2,
      x: podium.x + 1.3,
      y: y0 + 0.42,
      z: podium.z + podium.d,
    },
    "fine",
  );
  door(sketch, podium, { along: 1.6, height: 0.34, side: "front", width: 0.6 });
  for (const [index, x] of [podium.x + 0.3, podium.x + 0.75, podium.x + 1.2].entries()) {
    flag(sketch, x, podium.z + podium.d + 0.75, y0, index === 1 ? "accentBlue" : "navy", 0.95);
  }
  monument(sketch, podium.x + podium.w - 1.2, site.z + site.d - 0.55, y0, title.toUpperCase(), 1.3);
  for (const z of [site.z + 0.6, site.z + 2, site.z + 3.4]) {
    tree(sketch, { kind: "round", size: 1.1, x: site.x + site.w - 0.45, z }, y0);
  }
  lamp(sketch, site.x + 0.45, site.z + site.d - 0.45, y0);
  bench(sketch, site.x + 0.6, site.z + site.d - 0.9, "x", y0);
  return bounds(podium, y0, y + 1.4 - y0);
};

// Vibedgames: an arcade with a pixel invader that marches on the roof.

const INVADER = [
  [
    "..X.....X..",
    "...X...X...",
    "..XXXXXXX..",
    ".XX.XXX.XX.",
    "XXXXXXXXXXX",
    "X.XXXXXXX.X",
    "X.X.....X.X",
    "...XX.XX...",
  ],
  [
    "..X.....X..",
    "X..X...X..X",
    "X.XXXXXXX.X",
    "XXX.XXX.XXX",
    "XXXXXXXXXXX",
    ".XXXXXXXXX.",
    "..X.....X..",
    ".X.......X.",
  ],
] as const;

/** Pixel art from rows of runs, so ink falls between rows, not every pixel. */
const drawPixels = (
  sketch: Sketch,
  rows: readonly string[],
  pixel: number,
  colors = paint("accentGreen"),
) => {
  for (const [row, pattern] of rows.entries()) {
    let start = -1;
    for (let column = 0; column <= pattern.length; column += 1) {
      const on = pattern[column] === "X";
      if (on && start < 0) {
        start = column;
      } else if (!on && start >= 0) {
        box(
          sketch,
          {
            colors,
            d: pixel,
            h: pixel,
            w: (column - start) * pixel,
            x: start * pixel,
            y: (rows.length - row - 1) * pixel,
            z: 0,
          },
          "hair",
        );
        start = -1;
      }
    }
  }
};

const BULB = paint("lamp", "lamp", "lamp");

export const drawVibedgames: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const hall = { d: 3.2, w: 4.6, x: site.x + 0.7, z: site.z + 0.5 };
  const height = 2 * FLOOR + 0.2;
  box(sketch, { ...hall, colors: WALLS, h: height, y: y0 });
  box(sketch, { ...hall, colors: paint("accentPurple"), h: 0.08, y: y0 + height - 0.18 }, "hair");
  storefront(sketch, hall, "front", "accentPink");
  windows(sketch, hall, { columns: 7, floors: 1, side: "front", y: y0 + FLOOR + 0.12 });
  windows(sketch, hall, { columns: 5, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, hall, y0 + height);
  // The marquee, ringed with bulbs.
  const marquee = { along: 0.9, h: 0.34, w: hall.w - 1.8 };
  board(sketch, hall, {
    ...marquee,
    colors: paint("accentPurple"),
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    y: y0 + height + 0.02,
  });
  for (let index = 0; index <= 12; index += 1) {
    const x = hall.x + marquee.along + (marquee.w * index) / 12;
    for (const y of [y0 + height + 0.02, y0 + height + 0.36]) {
      ball(sketch, { colors: BULB, detail: 6, r: 0.022, x, y, z: hall.z + hall.d + 0.05 }, "hair");
    }
  }
  // The invader: two frames, swapped by the animation.
  const pixel = 0.15;
  const origin: Vec3 = [hall.x + hall.w / 2 - 5.5 * pixel, y0 + height + 0.08, hall.z + 0.9];
  for (const [index, rows] of INVADER.entries()) {
    drawPixels(part(sketch, `vibedgames:frame:${index}`, origin), rows, pixel);
  }
  // A giant joystick on the plaza.
  const jx = site.x + site.w - 0.9;
  const jz = site.z + site.d - 0.8;
  box(sketch, {
    colors: paint("navy"),
    d: 0.45,
    h: 0.16,
    w: 0.45,
    x: jx - 0.225,
    y: y0,
    z: jz - 0.225,
  });
  line(
    sketch,
    [
      [jx, y0 + 0.16, jz],
      [jx - 0.08, y0 + 0.62, jz + 0.06],
    ],
    "bold",
  );
  ball(sketch, {
    colors: paint("accentRed"),
    detail: 10,
    r: 0.13,
    x: jx - 0.08,
    y: y0 + 0.66,
    z: jz + 0.06,
  });
  for (const x of [site.x + 0.5, site.x + 1.3]) {
    tree(sketch, { kind: "round", size: 1, x, z: site.z + site.d - 0.5 }, y0);
  }
  return bounds(hall, y0, height + 1.3);
};

// Yours Sincerely: a post office with a giant love letter out front.

const BLOSSOM = paint("roofPink", "roofPink", "roofPinkShade");

const envelope = (sketch: Sketch, x: number, z: number, y: number, w: number, h: number) => {
  const front = z + 0.06;
  box(sketch, { colors: paint("white", "white", "wallRight"), d: 0.06, h, w, x, y, z });
  line(
    sketch,
    [
      [x, y + h, front + 0.003],
      [x + w / 2, y + h * 0.42, front + 0.003],
      [x + w, y + h, front + 0.003],
    ],
    "fine",
  );
  line(
    sketch,
    [
      [x, y, front + 0.003],
      [x + w * 0.38, y + h * 0.5, front + 0.003],
    ],
    "hair",
  );
  line(
    sketch,
    [
      [x + w, y, front + 0.003],
      [x + w * 0.62, y + h * 0.5, front + 0.003],
    ],
    "hair",
  );
  return [x + w / 2, y + h * 0.42, front] satisfies Vec3;
};

export const drawYoursSincerely: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const office = { d: 2.4, w: 3.9, x: site.x + 0.9, z: site.z + 0.5 };
  const height = 2 * FLOOR + 0.12;
  box(sketch, { ...office, colors: WALLS, h: height, y: y0 });
  windows(sketch, office, { columns: 6, floors: 2, side: "front", skip: 2, y: y0 + 0.12 });
  windows(sketch, office, { columns: 4, floors: 2, side: "side", y: y0 + 0.12 });
  gable(sketch, {
    ...office,
    colors: ROOFS[0],
    ends: WALLS,
    ridge: "x",
    rise: 0.75,
    y: y0 + height,
  });
  box(sketch, {
    colors: WALLS,
    d: 0.14,
    h: 0.45,
    w: 0.14,
    x: office.x + 0.6,
    y: y0 + height + 0.2,
    z: office.z + 0.5,
  });
  // A portico of columns with the name across it.
  const portico = { d: 0.5, w: 1.7, x: office.x + 1.1, z: office.z + office.d };
  for (let index = 0; index < 4; index += 1) {
    round(sketch, {
      colors: WALLS,
      h: 0.62,
      r: 0.05,
      segments: 8,
      x: portico.x + 0.12 + index * 0.49,
      y: y0 + 0.04,
      z: portico.z + 0.38,
    });
  }
  box(sketch, {
    colors: paint("paving", "wallLeft", "wallRight"),
    d: portico.d + 0.15,
    h: 0.04,
    w: portico.w,
    x: portico.x,
    y: y0,
    z: portico.z,
  });
  box(sketch, { ...portico, colors: WALLS, h: 0.1, y: y0 + 0.66 });
  board(
    sketch,
    { ...portico, d: portico.d + 0.02 },
    {
      along: -0.4,
      colors: BLOSSOM,
      h: 0.3,
      ink: "white",
      side: "front",
      text: title.toUpperCase(),
      w: portico.w + 0.8,
      y: y0 + 0.76,
    },
  );
  door(sketch, office, { along: 1.75, height: 0.32, side: "front", width: 0.4 });
  // The letter, sealed with a heart, on a plinth.
  const ex = site.x + site.w - 1.75;
  const ez = site.z + site.d - 1.15;
  box(sketch, { colors: PLAZA, d: 0.4, h: 0.12, w: 1.3, x: ex - 0.05, y: y0, z: ez - 0.15 });
  const seal = envelope(sketch, ex, ez, y0 + 0.12, 1.2, 0.78);
  cutout(sketch, heart(0.14), [seal[0], seal[1], seal[2]], paint("accentRed"), 0.04);
  // Post boxes and blossoming trees.
  for (const x of [site.x + 0.5, site.x + 0.8]) {
    box(
      sketch,
      {
        colors: paint("accentRed", "accentRed", "accentRed"),
        d: 0.14,
        h: 0.24,
        w: 0.16,
        x,
        y: y0,
        z: site.z + site.d - 0.5,
      },
      "fine",
    );
  }
  for (const [x, z] of [
    [site.x + 0.45, site.z + 0.7],
    [site.x + 0.45, site.z + 2],
    [site.x + 1.4, site.z + site.d - 0.55],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [x, y0, z],
        [x, y0 + 0.22, z],
      ],
      "fine",
      "trunk",
    );
    ball(sketch, { colors: BLOSSOM, detail: 9, r: 0.24, ry: 0.85, x, y: y0 + 0.4, z });
  }
  // Letters drift up from the chimney and fade: written in disappearing ink.
  for (let index = 0; index < 5; index += 1) {
    const letter = part(sketch, `yourssincerely:letter:${index}`, [
      office.x + 0.67,
      y0 + height + 0.7,
      office.z + 0.57,
    ]);
    box(
      letter,
      {
        colors: paint("white", "white", "wallRight"),
        d: 0.02,
        h: 0.12,
        w: 0.18,
        x: -0.09,
        y: 0,
        z: 0,
      },
      "hair",
    );
    line(
      letter,
      [
        [-0.09, 0.12, 0.022],
        [0, 0.05, 0.022],
        [0.09, 0.12, 0.022],
      ],
      "hair",
    );
  }
  return bounds(office, y0, height + 0.75);
};

// UICapsule: a sawtooth gallery and a capsule floating over its plaza.

const SAWTOOTH = paint("roofGray", "glass", "roofGray");

const sawtooth = (sketch: Sketch, hall: Footprint, y: number, teeth: number) => {
  const depth = hall.d / teeth;
  for (let index = 0; index < teeth; index += 1) {
    const z0 = hall.z + index * depth;
    const outline: Point2[] = [
      [0, 0],
      [depth, 0],
      [depth, 0.32],
    ];
    extrude(
      sketch,
      outline,
      { origin: [hall.x, y, z0], u: [0, 0, 1], v: [0, 1, 0] },
      [hall.w, 0, 0],
      SAWTOOTH,
    );
  }
};

/** A pill: a cylinder capped with two half-spheres, lying at an angle. */
const capsuleTriangles = (radius: number, length: number, tilt: number): Triangle[] => {
  const top = paint("accentBlue", "accentBlue", "accentBlue");
  const bottom = paint("white", "white", "wallRight");
  const half = length / 2;
  const triangles = [
    ...roundTriangles({ colors: bottom, h: half, r: radius, segments: 20, x: 0, y: -half, z: 0 }),
    ...roundTriangles({ colors: top, h: half, r: radius, segments: 20, x: 0, y: 0, z: 0 }),
    ...ballTriangles({ colors: top, detail: 20, r: radius * 0.995, x: 0, y: half, z: 0 }),
    ...ballTriangles({ colors: bottom, detail: 20, r: radius * 0.995, x: 0, y: -half, z: 0 }),
  ];
  return mapTriangles(triangles, (point) => rotate(point, [0, 0, 0], "z", tilt));
};

export const drawUiCapsule: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const hall = { d: 2.3, w: 4.6, x: site.x + 0.7, z: site.z + 0.45 };
  const height = FLOOR * 1.8;
  box(sketch, { ...hall, colors: WALLS, h: height, y: y0 });
  storefront(sketch, hall, "front", "accentBlue");
  windows(sketch, hall, {
    columns: 5,
    floors: 1,
    height: 0.3,
    side: "side",
    width: 0.2,
    y: y0 + 0.12,
  });
  sawtooth(sketch, hall, y0 + height, 4);
  board(sketch, hall, {
    along: 0.2,
    colors: paint("accentBlue"),
    h: 0.3,
    ink: "white",
    side: "side",
    text: title.toUpperCase(),
    w: hall.d - 0.4,
    y: y0 + 0.24,
  });
  // The capsule floats over a plinth and bobs; the plinth stays put.
  const cx = site.x + site.w / 2 - 0.2;
  const cz = site.z + site.d - 1.25;
  round(sketch, { colors: PLAZA, h: 0.16, r: 0.62, segments: 20, x: cx, y: y0, z: cz });
  round(
    sketch,
    { colors: paint("paving"), h: 0.004, r: 0.4, segments: 20, x: cx, y: y0 + 0.16, z: cz },
    "hair",
  );
  const capsule = part(sketch, "uicapsule:capsule", [cx, y0 + 0.95, cz]);
  solid(capsule, capsuleTriangles(0.3, 0.8, -0.95));
  for (const x of [site.x + 0.5, site.x + site.w - 0.5]) {
    bush(sketch, x, site.z + site.d - 0.5, 1.4, y0);
    lamp(sketch, x, site.z + site.d - 1.3, y0);
  }
  return bounds({ d: site.d - 0.6, w: hall.w, x: hall.x, z: hall.z }, y0, height + 0.9);
};
