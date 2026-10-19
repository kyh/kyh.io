// The mini apps and templates: half-block and quarter-block buildings, and
// the row of identical houses the templates fork from.
import type { Footprint } from "./draw-kit";
import type { DrawLandmark, Site } from "./landmark";
import type { Point2, Sketch, Vec3 } from "./sketch";
import { slab, tower } from "./draw-blocks";
import {
  billboard,
  board,
  bush,
  cutout,
  door,
  FLOOR,
  inset,
  lamp,
  parapet,
  parkedCar,
  plate,
  rooftop,
  storefront,
  tree,
  windows,
} from "./draw-kit";
import { bounds } from "./landmark";
import { PLAZA, plaza } from "./landmarks-large";
import { ACCENTS, paint, ROOF_GRAY, ROOFS, WALLS } from "./palette";
import { createRandom, hashString } from "@/lib/random";
import { ball, box, ellipse, extrude, face, gable, line, part, round } from "./sketch";

const METAL = paint("metal", "metal", "metalDark");

/** A row of columns standing in front of a wall. */
const colonnade = (sketch: Sketch, wall: Footprint, y: number, count: number, height: number) => {
  for (let index = 0; index < count; index += 1) {
    const x = wall.x + 0.18 + (index * (wall.w - 0.36)) / (count - 1);
    round(sketch, {
      colors: WALLS,
      h: height,
      r: 0.055,
      segments: 8,
      x,
      y,
      z: wall.z + wall.d + 0.2,
    });
  }
  box(sketch, {
    colors: PLAZA,
    d: 0.4,
    h: 0.04,
    w: wall.w,
    x: wall.x,
    y: y - 0.04,
    z: wall.z + wall.d,
  });
  box(sketch, {
    colors: WALLS,
    d: 0.36,
    h: 0.12,
    w: wall.w,
    x: wall.x,
    y: y + height,
    z: wall.z + wall.d,
  });
};

// Stonksville: a stock exchange with a ticker and a line that only goes up.

const STONKS: Point2[] = [
  [0, 0],
  [0.32, 0.38],
  [0.52, 0.26],
  [0.92, 0.8],
  [0.86, 0.86],
  [1.1, 0.96],
  [1.06, 0.7],
  [1, 0.76],
  [0.52, 0.12],
  [0.32, 0.24],
  [0, -0.1],
];

export const drawStonksville: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const hall = { d: 1.5, w: 3.8, x: site.x + 0.4, z: site.z + 0.35 };
  const height = 2 * FLOOR + 0.15;
  box(sketch, { ...hall, colors: WALLS, h: height, y: y0 });
  windows(sketch, hall, { columns: 3, floors: 2, side: "side", y: y0 + 0.12 });
  colonnade(sketch, hall, y0 + 0.04, 6, height - 0.16);
  gable(sketch, {
    ...hall,
    colors: ROOF_GRAY,
    d: hall.d + 0.36,
    ends: WALLS,
    ridge: "x",
    rise: 0.42,
    y: y0 + height,
  });
  sketch.screens.push({
    across: [hall.w - 0.5, 0, 0],
    name: "stonksville:ticker",
    origin: [hall.x + 0.25, y0 + height - 0.13, hall.z + hall.d + 0.365],
    up: [0, 0.13, 0],
  });
  // The green line, cut out and standing at the corner.
  cutout(
    sketch,
    STONKS,
    [site.x + site.w - 1.45, y0 + 0.15, site.z + site.d - 0.75],
    paint("accentGreen"),
    0.08,
  );
  box(sketch, {
    colors: PLAZA,
    d: 0.3,
    h: 0.15,
    w: 1.3,
    x: site.x + site.w - 1.5,
    y: y0,
    z: site.z + site.d - 0.8,
  });
  board(
    sketch,
    { d: 0.1, w: 1.5, x: site.x + 0.5, z: site.z + site.d - 0.55 },
    {
      along: 0,
      colors: paint("accentGreen"),
      h: 0.3,
      ink: "white",
      side: "front",
      text: title.toUpperCase(),
      w: 1.5,
      y: y0 + 0.05,
    },
  );
  return bounds(hall, y0, height + 0.5);
};

// Autoplay: a TV studio with a giant set on the roof and a mast.

export const drawAutoplay: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const studio = { d: 1.7, w: 3, x: site.x + 0.5, z: site.z + 0.5 };
  const height = 2 * FLOOR + 0.1;
  box(sketch, { ...studio, colors: WALLS, h: height, y: y0 });
  windows(sketch, studio, { columns: 5, floors: 2, side: "front", skip: 2, y: y0 + 0.12 });
  windows(sketch, studio, { columns: 3, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, studio, y0 + height);
  door(sketch, studio, { along: 1.35, awning: "accentRed", side: "front" });
  board(sketch, studio, {
    along: 0.2,
    colors: paint("accentRed"),
    h: 0.27,
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    w: 1.15,
    y: y0 + height - 0.35,
  });
  // The set: a giant television, rabbit ears and all.
  const tv = { d: 0.8, w: 1.25, x: studio.x + 0.75, z: studio.z + 0.5 };
  const top = y0 + height;
  box(sketch, {
    ...tv,
    colors: paint("roofTerracotta", "roofTerracotta", "roofTerracottaShade"),
    h: 0.92,
    y: top + 0.08,
  });
  for (const x of [tv.x + 0.15, tv.x + tv.w - 0.25]) {
    box(
      sketch,
      { colors: paint("trunk"), d: 0.1, h: 0.08, w: 0.1, x, y: top, z: tv.z + tv.d - 0.2 },
      "hair",
    );
  }
  face(
    sketch,
    "screen",
    [
      [tv.x + 0.1, top + 0.2, tv.z + tv.d + 0.004],
      [tv.x + tv.w - 0.3, top + 0.2, tv.z + tv.d + 0.004],
      [tv.x + tv.w - 0.3, top + 0.9, tv.z + tv.d + 0.004],
      [tv.x + 0.1, top + 0.9, tv.z + tv.d + 0.004],
    ],
    "fine",
  );
  sketch.screens.push({
    across: [tv.w - 0.5, 0, 0],
    name: "autoplay:screen",
    origin: [tv.x + 0.15, top + 0.25, tv.z + tv.d + 0.008],
    up: [0, 0.6, 0],
  });
  for (const knob of [0.45, 0.65]) {
    ball(
      sketch,
      {
        colors: METAL,
        detail: 8,
        r: 0.05,
        x: tv.x + tv.w - 0.15,
        y: top + knob,
        z: tv.z + tv.d + 0.02,
      },
      "hair",
    );
  }
  line(
    sketch,
    [
      [tv.x + 0.5, top + 1, tv.z + 0.4],
      [tv.x + 0.2, top + 1.45, tv.z + 0.3],
    ],
    "fine",
  );
  line(
    sketch,
    [
      [tv.x + 0.6, top + 1, tv.z + 0.4],
      [tv.x + 0.95, top + 1.4, tv.z + 0.25],
    ],
    "fine",
  );
  // A lattice mast with a light that blinks at night.
  const mx = site.x + site.w - 1;
  const mz = site.z + 0.9;
  for (const [dx, dz] of [
    [-0.12, -0.12],
    [0.12, -0.12],
    [0, 0.12],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [mx + dx, y0, mz + dz],
        [mx, y0 + 2.9, mz],
      ],
      "fine",
    );
  }
  for (let y = 0.4; y < 2.6; y += 0.45) {
    const t = 1 - y / 2.9;
    line(
      sketch,
      [
        [mx - 0.12 * t, y0 + y, mz - 0.12 * t],
        [mx + 0.12 * t, y0 + y, mz - 0.12 * t],
        [mx, y0 + y, mz + 0.12 * t],
        [mx - 0.12 * t, y0 + y, mz - 0.12 * t],
      ],
      "hair",
    );
  }
  ball(
    part(sketch, "autoplay:beacon", [mx, y0 + 2.95, mz]),
    { colors: paint("accentRed"), detail: 8, r: 0.07, x: 0, y: 0, z: 0 },
    "hair",
  );
  return bounds(studio, y0, height + 1.1);
};

// Total Compensation Calculator: a little bank with a coin on top.

export const drawBank: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const bank = { d: 1.5, w: 3.4, x: site.x + 0.6, z: site.z + 0.35 };
  const height = 2 * FLOOR + 0.1;
  box(sketch, { ...bank, colors: WALLS, h: height, y: y0 });
  windows(sketch, bank, { columns: 3, floors: 2, side: "side", y: y0 + 0.12 });
  colonnade(sketch, bank, y0 + 0.04, 5, height - 0.16);
  parapet(sketch, { ...bank, d: bank.d + 0.36 }, y0 + height);
  board(
    sketch,
    { ...bank, d: bank.d + 0.37 },
    {
      along: 0.3,
      colors: paint("roofYellow", "roofYellow", "roofYellowShade"),
      h: 0.18,
      side: "front",
      text: title.toUpperCase(),
      w: bank.w - 0.4,
      y: y0 + height - 0.16,
    },
  );
  // A gold coin standing on the roof.
  const coin = ellipse(0.42, 0.42, 22);
  const cx = bank.x + bank.w / 2;
  const coinFace = {
    origin: [cx, y0 + height + 0.54, bank.z + 0.7] satisfies Vec3,
    u: [1, 0, 0] satisfies Vec3,
    v: [0, 1, 0] satisfies Vec3,
  };
  extrude(
    sketch,
    coin,
    coinFace,
    [0, 0, 0.1],
    paint("accentYellow", "accentYellow", "roofYellowShade"),
  );
  sketch.signs.push({
    across: [0.5, 0, 0],
    origin: [cx - 0.25, y0 + height + 0.32, bank.z + 0.805],
    text: "$",
    token: "white",
    up: [0, 0.44, 0],
  });
  // An armored truck at the curb.
  box(sketch, {
    colors: paint("navy"),
    d: 0.26,
    h: 0.24,
    w: 0.6,
    x: site.x + site.w - 1.1,
    y: y0,
    z: site.z + site.d - 0.55,
  });
  return bounds(bank, y0, height + 1);
};

// Covid-19 Dashboard: a clinic with a red cross and a chart out front.

const CROSS: Point2[] = [
  [-0.12, -0.36],
  [0.12, -0.36],
  [0.12, -0.12],
  [0.36, -0.12],
  [0.36, 0.12],
  [0.12, 0.12],
  [0.12, 0.36],
  [-0.12, 0.36],
  [-0.12, 0.12],
  [-0.36, 0.12],
  [-0.36, -0.12],
  [-0.12, -0.12],
];

export const drawClinic: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const clinic = { d: 1.6, w: 3.3, x: site.x + 0.5, z: site.z + 0.4 };
  const height = 2 * FLOOR + 0.12;
  box(sketch, { ...clinic, colors: WALLS, h: height, y: y0 });
  windows(sketch, clinic, { columns: 6, floors: 2, side: "front", skip: 3, y: y0 + 0.12 });
  windows(sketch, clinic, { columns: 3, floors: 2, side: "side", y: y0 + 0.12 });
  box(sketch, { ...clinic, colors: paint("accentRed"), h: 0.06, y: y0 + height - 0.2 }, "hair");
  parapet(sketch, clinic, y0 + height);
  door(sketch, clinic, { along: 1.75, awning: "accentRed", side: "front", width: 0.3 });
  cutout(
    sketch,
    CROSS,
    [clinic.x + 0.6, y0 + height + 0.5, clinic.z + 0.6],
    paint("accentRed"),
    0.1,
  );
  board(sketch, clinic, {
    along: 0.15,
    colors: paint("signBoard"),
    h: 0.24,
    side: "front",
    text: title.toUpperCase(),
    w: 1.4,
    y: y0 + height - 0.46,
  });
  // The dashboard: a board with a chart that bends the right way.
  const chart = { d: 0.08, w: 1.1, x: site.x + site.w - 1.4, z: site.z + site.d - 0.6 };
  billboard(sketch, {
    colors: paint("screen"),
    h: 0.5,
    ink: "screen",
    legs: 0.2,
    side: "front",
    text: "",
    w: chart.w,
    x: chart.x,
    y: y0,
    z: chart.z,
  });
  const bend: Point2[] = [
    [0.1, 0.1],
    [0.3, 0.2],
    [0.45, 0.42],
    [0.6, 0.38],
    [0.78, 0.2],
    [1, 0.14],
  ];
  line(
    sketch,
    bend.map(([u, v]) => [chart.x + u, y0 + 0.2 + v, chart.z + 0.1] satisfies Vec3),
    "fine",
    "accentGreen",
  );
  // An ambulance at the door.
  const van = { d: 0.28, w: 0.62, x: clinic.x + 2.4, z: site.z + site.d - 0.5 };
  box(sketch, { ...van, colors: paint("white", "white", "wallRight"), h: 0.26, y: y0 });
  box(
    sketch,
    {
      colors: paint("accentRed"),
      d: van.d + 0.004,
      h: 0.05,
      w: van.w + 0.004,
      x: van.x - 0.002,
      y: y0 + 0.12,
      z: van.z - 0.002,
    },
    "hair",
  );
  return bounds(clinic, y0, height + 0.9);
};

// Policing Ice: a civic watch house with a camera that keeps turning.

export const drawWatchHouse: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const house = { d: 1.6, w: 3.1, x: site.x + 0.5, z: site.z + 0.4 };
  const height = 2 * FLOOR + 0.12;
  box(sketch, { ...house, colors: WALLS, h: height, y: y0 });
  windows(sketch, house, { columns: 5, floors: 2, side: "front", skip: 2, y: y0 + 0.12 });
  windows(sketch, house, { columns: 3, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, house, y0 + height);
  door(sketch, house, { along: 1.4, awning: "accentBlue", side: "front" });
  board(sketch, house, {
    along: 0.15,
    colors: paint("navy"),
    h: 0.25,
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    w: 1.3,
    y: y0 + height - 0.37,
  });
  rooftop(sketch, inset(house, 0.2), y0 + height, 11);
  // REC: a red light by the door, and the camera mast.
  ball(
    sketch,
    {
      colors: paint("accentRed"),
      detail: 8,
      r: 0.05,
      x: house.x + 2.9,
      y: y0 + 0.5,
      z: house.z + house.d + 0.04,
    },
    "hair",
  );
  const mx = site.x + site.w - 0.9;
  const mz = site.z + 0.8;
  round(sketch, { colors: METAL, h: 1.9, r: 0.05, segments: 8, x: mx, y: y0, z: mz });
  const camera = part(sketch, "policing-ice:camera", [mx, y0 + 1.9, mz], true);
  box(
    camera,
    {
      colors: paint("white", "white", "wallRight"),
      d: 0.14,
      h: 0.14,
      w: 0.32,
      x: -0.1,
      y: 0,
      z: -0.07,
    },
    "fine",
  );
  box(
    camera,
    { colors: paint("screen"), d: 0.1, h: 0.1, w: 0.06, x: 0.22, y: 0.02, z: -0.05 },
    "hair",
  );
  // A news van with its dish up.
  const van = { d: 0.3, w: 0.66, x: site.x + site.w - 1.6, z: site.z + site.d - 0.55 };
  box(sketch, { ...van, colors: paint("white", "white", "wallRight"), h: 0.3, y: y0 });
  round(sketch, {
    colors: METAL,
    h: 0.04,
    r: 0.16,
    segments: 12,
    top: 0.04,
    x: van.x + 0.33,
    y: y0 + 0.36,
    z: van.z + 0.15,
  });
  return bounds(house, y0, height + 0.4);
};

// Kwadrants: four towers on a two-by-two grid, one for each quadrant.

const QUADRANTS = [ROOFS[0], ROOFS[1], ROOFS[2], ROOFS[3]];

export const drawKwadrants: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const cx = site.x + site.w / 2 - 0.6;
  const cz = site.z + site.d / 2;
  const size = 0.95;
  const gap = 0.3;
  // The axes, painted on the plaza.
  line(
    sketch,
    [
      [cx - size - gap - 0.4, y0 + 0.005, cz],
      [cx + size + gap + 0.5, y0 + 0.005, cz],
    ],
    "fine",
  );
  line(
    sketch,
    [
      [cx, y0 + 0.005, cz - size - gap - 0.2],
      [cx, y0 + 0.005, cz + size + gap + 0.2],
    ],
    "fine",
  );
  let top = y0;
  for (const [index, quadrant] of QUADRANTS.entries()) {
    const right = index % 2 === 1;
    const front = index >= 2;
    const rect = {
      d: size,
      w: size,
      x: right ? cx + gap / 2 : cx - gap / 2 - size,
      z: front ? cz + gap / 2 : cz - gap / 2 - size,
    };
    const floors = [5, 4, 3, 6][index] ?? 4;
    const height = floors * FLOOR;
    box(sketch, { ...rect, colors: WALLS, h: height, y: y0 });
    windows(sketch, rect, { columns: 2, floors, side: "front", y: y0 + 0.12 });
    windows(sketch, rect, { columns: 2, floors, side: "side", y: y0 + 0.12 });
    box(sketch, {
      ...rect,
      colors: quadrant,
      h: 0.1,
      y: y0 + height,
    });
    top = Math.max(top, y0 + height + 0.1);
  }
  billboard(sketch, {
    colors: paint("signBoard"),
    h: 0.3,
    legs: 0.15,
    side: "side",
    text: title.toUpperCase(),
    w: 1.4,
    x: site.x + site.w - 0.7,
    y: y0,
    z: site.z + 0.8,
  });
  tree(
    sketch,
    { kind: "round", size: 1, x: site.x + site.w - 0.45, z: site.z + site.d - 0.45 },
    y0,
  );
  return bounds(
    { d: size * 2 + gap, w: size * 2 + gap, x: cx - size - gap / 2, z: cz - size - gap / 2 },
    y0,
    top - y0,
  );
};

// Keiko and Friends: a sticker shop with a giant sticker on the roof.

export const drawStickerShop: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const shop = { d: 1.4, w: 1.9, x: site.x + 0.5, z: site.z + 0.55 };
  const height = 2 * FLOOR + 0.08;
  box(sketch, { ...shop, colors: paint("top", "roofPink", "roofPinkShade"), h: height, y: y0 });
  storefront(sketch, shop, "front", "accentPink");
  windows(sketch, shop, { columns: 3, floors: 1, side: "front", y: y0 + FLOOR + 0.12 });
  windows(sketch, shop, { columns: 2, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, shop, y0 + height, paint("white", "white", "wallRight"));
  // The sticker: a cat's face, peeled up at one corner.
  const face3: Vec3 = [shop.x + shop.w / 2, y0 + height + 0.55, shop.z + 0.6];
  const head = [...ellipse(0.48, 0.42, 26)];
  const ears: Point2[] = [
    [-0.42, 0.18],
    [-0.36, 0.62],
    [-0.12, 0.38],
  ];
  extrude(
    sketch,
    head,
    { origin: face3, u: [1, 0, 0], v: [0, 1, 0] },
    [0, 0, 0.07],
    paint("white", "white", "wallRight"),
  );
  for (const flip of [1, -1]) {
    extrude(
      sketch,
      ears.map(([u, v]) => [u * flip, v] satisfies Point2),
      { origin: face3, u: [1, 0, 0], v: [0, 1, 0] },
      [0, 0, 0.07],
      paint("white", "white", "wallRight"),
    );
    face(
      sketch,
      "ink",
      ellipse(0.045, 0.06, 10, flip * 0.17, 0.06).map(
        ([u, v]) => [face3[0] + u, face3[1] + v, face3[2] + 0.074] satisfies Vec3,
      ),
      null,
    );
    face(
      sketch,
      "accentPink",
      ellipse(0.07, 0.04, 10, flip * 0.28, -0.1).map(
        ([u, v]) => [face3[0] + u, face3[1] + v, face3[2] + 0.074] satisfies Vec3,
      ),
      null,
    );
  }
  line(
    sketch,
    [
      [face3[0] - 0.05, face3[1] - 0.08, face3[2] + 0.075],
      [face3[0], face3[1] - 0.12, face3[2] + 0.075],
      [face3[0] + 0.05, face3[1] - 0.08, face3[2] + 0.075],
    ],
    "fine",
  );
  line(
    sketch,
    [
      [face3[0], face3[1] - 0.48, face3[2] + 0.03],
      [face3[0], y0 + height, face3[2] + 0.03],
    ],
    "fine",
  );
  board(
    sketch,
    { d: 0.1, w: 1.6, x: site.x + 0.5, z: site.z + site.d - 0.4 },
    {
      along: 0,
      colors: paint("accentPink"),
      h: 0.27,
      ink: "white",
      side: "front",
      text: title.toUpperCase(),
      w: 1.6,
      y: y0 + 0.04,
    },
  );
  return bounds(shop, y0, height + 1.1);
};

// LoremLLM: a print shop thinking out loud on its roof.

const bubble = (w: number, h: number): Point2[] => {
  const corner = 0.14;
  const points: Point2[] = [];
  const arc = (cx: number, cy: number, from: number) => {
    for (let step = 0; step <= 4; step += 1) {
      const angle = from + (step / 4) * (Math.PI / 2);
      points.push([cx + Math.cos(angle) * corner, cy + Math.sin(angle) * corner]);
    }
  };
  arc(w - corner, corner, -Math.PI / 2);
  arc(w - corner, h - corner, 0);
  arc(corner, h - corner, Math.PI / 2);
  arc(corner, corner, Math.PI);
  // The tail, pointing down at the shop.
  points.splice(-1, 0, [0.22, 0], [0.1, -0.2], [0.42, 0]);
  return points;
};

export const drawPrintShop: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const shop = { d: 1.4, w: 1.9, x: site.x + 0.5, z: site.z + 0.55 };
  const height = 2 * FLOOR + 0.08;
  box(sketch, { ...shop, colors: WALLS, h: height, y: y0 });
  storefront(sketch, shop, "front", "accentTeal");
  windows(sketch, shop, { columns: 3, floors: 1, side: "front", y: y0 + FLOOR + 0.12 });
  windows(sketch, shop, { columns: 2, floors: 2, side: "side", y: y0 + 0.12 });
  gable(sketch, { ...shop, colors: ROOFS[4], ends: WALLS, ridge: "x", rise: 0.4, y: y0 + height });
  const origin: Vec3 = [shop.x + 0.35, y0 + height + 0.62, shop.z + 0.5];
  extrude(
    sketch,
    bubble(1.2, 0.6),
    { origin, u: [1, 0, 0], v: [0, 1, 0] },
    [0, 0, 0.07],
    paint("white", "white", "wallRight"),
  );
  for (let index = 0; index < 3; index += 1) {
    const dot = part(sketch, `loremllm:dot:${index}`, [
      origin[0] + 0.36 + index * 0.24,
      origin[1] + 0.3,
      origin[2] + 0.1,
    ]);
    ball(dot, { colors: paint("ink"), detail: 8, r: 0.055, x: 0, y: 0, z: 0 }, "hair");
  }
  board(
    sketch,
    { d: 0.1, w: 1.6, x: site.x + 0.5, z: site.z + site.d - 0.4 },
    {
      along: 0,
      colors: paint("accentTeal"),
      h: 0.27,
      ink: "white",
      side: "front",
      text: title.toUpperCase(),
      w: 1.6,
      y: y0 + 0.04,
    },
  );
  return bounds(shop, y0, height + 1.3);
};

// IdleBiz: a little office run by its computers, with a big beige one on the
// roof keeping the books.

const CASING = paint("white", "white", "wallRight");

export const drawIdleBiz: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const office = { d: 1.4, w: 1.9, x: site.x + 0.5, z: site.z + 0.55 };
  const height = 2 * FLOOR + 0.08;
  box(sketch, { ...office, colors: paint("top", "roofBlue", "roofBlueShade"), h: height, y: y0 });
  storefront(sketch, office, "front", "accentBlue");
  windows(sketch, office, { columns: 3, floors: 1, side: "front", y: y0 + FLOOR + 0.12 });
  windows(sketch, office, { columns: 2, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, office, y0 + height);
  const top = y0 + height;
  // The computer: a deep CRT on a short neck and foot.
  const foot = { d: 0.45, w: 0.7, x: office.x + 0.6, z: office.z + 0.45 };
  box(sketch, { ...foot, colors: CASING, h: 0.06, y: top });
  box(sketch, {
    colors: CASING,
    d: 0.2,
    h: 0.12,
    w: 0.24,
    x: foot.x + 0.23,
    y: top + 0.06,
    z: foot.z + 0.12,
  });
  const crt = { d: 0.55, w: 1.5, x: office.x + 0.2, z: office.z + 0.35 };
  const crtY = top + 0.18;
  const crtH = 1;
  box(sketch, {
    colors: CASING,
    d: 0.4,
    h: 0.72,
    w: 1.1,
    x: crt.x + 0.2,
    y: crtY + 0.14,
    z: crt.z - 0.36,
  });
  box(sketch, { ...crt, colors: CASING, h: crtH, y: crtY });
  const front = crt.z + crt.d + 0.004;
  face(
    sketch,
    "screen",
    [
      [crt.x + 0.12, crtY + 0.18, front],
      [crt.x + crt.w - 0.12, crtY + 0.18, front],
      [crt.x + crt.w - 0.12, crtY + crtH - 0.1, front],
      [crt.x + 0.12, crtY + crtH - 0.1, front],
    ],
    "fine",
  );
  sketch.screens.push({
    across: [crt.w - 0.3, 0, 0],
    name: "idlebiz:screen",
    origin: [crt.x + 0.15, crtY + 0.21, front + 0.004],
    up: [0, crtH - 0.34, 0],
  });
  box(
    sketch,
    {
      colors: paint("accentGreen"),
      d: 0.03,
      h: 0.05,
      w: 0.08,
      x: crt.x + crt.w - 0.28,
      y: crtY + 0.06,
      z: crt.z + crt.d,
    },
    "hair",
  );
  board(
    sketch,
    { d: 0.1, w: 1.6, x: site.x + 0.5, z: site.z + site.d - 0.4 },
    {
      along: 0,
      colors: paint("accentBlue"),
      h: 0.27,
      ink: "white",
      side: "front",
      text: title.toUpperCase(),
      w: 1.6,
      y: y0 + 0.04,
    },
  );
  return bounds(office, y0, height + 1.2);
};

// The templates: the same house, forked five times, each with its own name.

export const drawTemplateHouse: DrawLandmark = (sketch, site, title) => {
  const y0 = site.y;
  const home = { d: 1.05, w: 1.3, x: site.x + (site.w - 1.3) / 2, z: site.z + 0.5 };
  const height = FLOOR + 0.08;
  box(
    sketch,
    {
      colors: paint("lawn", "lawn", "lawn"),
      d: site.d - 0.3,
      h: 0.012,
      w: site.w - 0.24,
      x: site.x + 0.12,
      y: y0,
      z: site.z + 0.15,
    },
    "hair",
  );
  plate(sketch, inset(home, -0.08));
  box(sketch, { ...home, colors: WALLS, h: height, y: y0 + 0.03 });
  gable(sketch, {
    ...home,
    colors: ROOF_GRAY,
    ends: WALLS,
    ridge: "x",
    rise: 0.4,
    y: y0 + 0.03 + height,
  });
  door(sketch, home, { along: 0.55, awning: "roofGray", side: "front" });
  windows(sketch, home, { columns: 3, floors: 1, side: "front", skip: 1, y: y0 + 0.16 });
  windows(sketch, home, { columns: 2, floors: 1, side: "side", y: y0 + 0.16 });
  box(sketch, {
    colors: paint("roofGray", "roofGray", "roofGrayShade"),
    d: 0.04,
    h: 0.06,
    w: 0.06,
    x: home.x + 0.95,
    y: y0 + 0.03 + height + 0.12,
    z: home.z + 0.3,
  });
  // The name on a post by the path, the one thing that differs.
  if (title.length > 0) {
    const post = {
      d: 0.05,
      w: Math.min(site.w - 0.3, 1.2),
      x: site.x + 0.15,
      z: site.z + site.d - 0.35,
    };
    line(
      sketch,
      [
        [post.x + 0.1, y0, post.z + 0.025],
        [post.x + 0.1, y0 + 0.18, post.z + 0.025],
      ],
      "fine",
    );
    board(sketch, post, {
      along: 0,
      colors: paint("signBoard"),
      h: 0.21,
      side: "front",
      text: title.toUpperCase(),
      w: post.w,
      y: y0 + 0.16,
    });
  }
  box(
    sketch,
    {
      colors: paint("accentBlue"),
      d: 0.06,
      h: 0.07,
      w: 0.1,
      x: site.x + site.w - 0.35,
      y: y0 + 0.16,
      z: site.z + site.d - 0.35,
    },
    "hair",
  );
  line(
    sketch,
    [
      [site.x + site.w - 0.3, y0, site.z + site.d - 0.32],
      [site.x + site.w - 0.3, y0 + 0.16, site.z + site.d - 0.32],
    ],
    "fine",
  );
  bush(sketch, home.x - 0.12, home.z + home.d + 0.2, 1, y0);
  return bounds(home, y0, height + 0.5);
};

// Unclaimed lots, and projects without a bespoke building.

const SHOP_NAMES = ["CAFE", "BOOKS", "BAKERY", "RECORDS", "FLOWERS", "BIKES"];

export const drawGenericLot = (
  sketch: Sketch,
  site: Site,
  size: string,
  title: string,
  seed: number,
) => {
  const random = createRandom(seed);
  const name = title.length > 0 ? title.toUpperCase() : random.pick(SHOP_NAMES);
  if (size === "large" || size === "launch") {
    const y = tower(sketch, inset(site, 1.3), random.int(8, 13), seed, random.pick(ACCENTS));
    if (title.length > 0) {
      billboard(sketch, {
        colors: paint("signBoard"),
        h: 0.3,
        side: "front",
        text: name,
        w: 2,
        x: site.x + 2,
        y: site.y,
        z: site.z + site.d - 0.6,
      });
    }
    return bounds(inset(site, 1.3), site.y, y - site.y);
  }
  if (size === "half") {
    const rect = { d: 1.5, w: site.w - 1, x: site.x + 0.5, z: site.z + 0.5 };
    slab(sketch, {
      awning: random.pick(ACCENTS),
      d: rect.d,
      floors: 3,
      seed,
      style: "grid",
      w: rect.w,
      x: rect.x,
      z: rect.z,
    });
    board(sketch, rect, {
      along: 0.2,
      colors: paint("signBoard"),
      h: 0.18,
      side: "front",
      text: name,
      w: Math.min(2.2, rect.w - 0.4),
      y: site.y + 0.36,
    });
    return bounds(rect, site.y, 3 * FLOOR + 0.2);
  }
  if (size === "template") {
    return drawTemplateHouse(sketch, site, title);
  }
  const rect = inset(site, 0.5);
  const y0 = site.y;
  box(sketch, { ...rect, colors: WALLS, h: 2 * FLOOR, y: y0 });
  storefront(sketch, rect, "front", random.pick(ACCENTS));
  windows(sketch, rect, { columns: 2, floors: 2, side: "side", y: y0 + 0.12 });
  gable(sketch, {
    ...rect,
    colors: random.pick(ROOFS),
    ends: WALLS,
    ridge: "x",
    rise: 0.4,
    y: y0 + 2 * FLOOR,
  });
  board(sketch, rect, {
    along: 0.12,
    colors: paint("signBoard"),
    h: 0.17,
    side: "front",
    text: name,
    w: rect.w - 0.24,
    y: y0 + 0.45,
  });
  lamp(sketch, site.x + site.w - 0.3, site.z + site.d - 0.3, y0);
  parkedCar(sketch, site.x + 0.5, site.z + site.d - 0.25, "x", hashString(name));
  return bounds(rect, y0, 2 * FLOOR + 0.4);
};
