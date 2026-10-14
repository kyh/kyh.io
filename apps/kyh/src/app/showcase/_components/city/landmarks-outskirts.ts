// More big projects: Inteligir's round tower, the Dataembed stack,
// Edgestories' observatory, the Clawders track and Init's launch pad.
import type { DrawLandmark } from "./landmark";
import type { Point2, Sketch, Vec3 } from "./sketch";
import {
  bench,
  board,
  billboard,
  door,
  FLOOR,
  groundLoop,
  lamp,
  parapet,
  rooftop,
  tree,
  windows,
} from "./draw-kit";
import { bounds } from "./landmark";
import { monument, PLAZA, plaza } from "./landmarks-large";
import { paint, WALLS } from "./palette";
import {
  ball,
  box,
  boxTriangles,
  ellipse,
  face,
  ground,
  line,
  loop,
  mapTriangles,
  part,
  rotate,
  round,
  roundTriangles,
  solid,
} from "./sketch";

const GLASS_RING = paint("top", "glass", "glassDim");
const METAL = paint("metal", "metal", "metalDark");

// Inteligir: a round tower of glass bands, a dome and a dish that scans.

export const drawInteligir: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const cx = site.x + site.w / 2 - 0.3;
  const cz = site.z + site.d / 2 - 0.4;
  const radius = 1.35;
  groundLoop(sketch, ellipse(radius + 0.55, radius + 0.55, 32, cx, cz), y0 + 0.005);
  let y = y0;
  const floors = 10;
  for (let floor = 0; floor < floors; floor += 1) {
    round(sketch, { colors: WALLS, h: 0.2, r: radius, segments: 28, x: cx, y, z: cz });
    round(
      sketch,
      { colors: GLASS_RING, h: 0.16, r: radius - 0.02, segments: 28, x: cx, y: y + 0.2, z: cz },
      "hair",
    );
    y += FLOOR;
  }
  round(sketch, {
    colors: paint("accentPurple"),
    h: 0.1,
    r: radius + 0.02,
    segments: 28,
    x: cx,
    y,
    z: cz,
  });
  y += 0.1;
  round(sketch, { colors: WALLS, h: 0.12, r: radius, segments: 28, x: cx, y, z: cz });
  y += 0.12;
  ball(sketch, {
    colors: paint("roofLilac", "roofLilac", "roofLilacShade"),
    detail: 24,
    r: 0.95,
    ry: 0.62,
    x: cx,
    y,
    z: cz,
  });
  const mastTop = y + 0.9;
  line(
    sketch,
    [
      [cx, y + 0.5, cz],
      [cx, mastTop, cz],
    ],
    "bold",
  );
  // The dish turns, so it is drawn whole and inked on its creases.
  const dish = part(sketch, "inteligir:dish", [cx, mastTop, cz], true);
  const disc = roundTriangles({
    colors: METAL,
    h: 0.05,
    r: 0.38,
    segments: 16,
    x: 0,
    y: -0.025,
    z: 0,
  });
  solid(
    dish,
    mapTriangles(disc, (point) => rotate(point, [0, 0, 0], "x", 1.05)),
  );
  line(
    dish,
    [
      [0, 0, 0],
      [0, 0.24, 0.16],
    ],
    "fine",
  );
  // An entrance canopy with the name, on the side facing the street.
  const entrance = { d: 0.5, w: 1.4, x: cx - 0.7, z: cz + radius - 0.1 };
  box(sketch, { ...entrance, colors: WALLS, h: 0.5, y: y0 });
  board(sketch, entrance, {
    along: 0.05,
    colors: paint("accentPurple"),
    h: 0.26,
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    w: 1.3,
    y: y0 + 0.23,
  });
  door(sketch, entrance, { along: 0.5, height: 0.2, side: "front", width: 0.4 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + 0.3;
    const r = radius + 1.05;
    tree(
      sketch,
      { kind: "poplar", size: 1, x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r },
      y0,
    );
  }
  return bounds({ d: radius * 2, w: radius * 2, x: cx - radius, z: cz - radius }, y0, y - y0 + 1);
};

// Dataembed: a building in the shape of the database icon.

const TIER = paint("top", "roofTeal", "roofTealShade");

export const drawDataembed: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const cx = site.x + 2.1;
  const cz = site.z + 2.1;
  const radius = 1.65;
  let y = y0;
  for (let tier = 0; tier < 3; tier += 1) {
    round(sketch, {
      colors: paint("metalDark"),
      h: 0.1,
      r: radius - 0.1,
      segments: 30,
      x: cx,
      y,
      z: cz,
    });
    y += 0.1;
    round(sketch, { colors: TIER, h: 0.72, r: radius, segments: 30, x: cx, y, z: cz });
    round(
      sketch,
      { colors: GLASS_RING, h: 0.14, r: radius + 0.008, segments: 30, x: cx, y: y + 0.3, z: cz },
      "hair",
    );
    y += 0.72;
  }
  // The data hall: racks of vents and fans on the roof.
  const hall = { d: 1.5, w: 2.2, x: site.x + site.w - 2.55, z: site.z + site.d - 1.95 };
  box(sketch, { ...hall, colors: WALLS, h: 0.62, y: y0 });
  for (let along = 0.2; along < hall.w - 0.1; along += 0.16) {
    line(
      sketch,
      [
        [hall.x + along, y0 + 0.12, hall.z + hall.d + 0.005],
        [hall.x + along, y0 + 0.4, hall.z + hall.d + 0.005],
      ],
      "hair",
      "inkSoft",
    );
  }
  parapet(sketch, hall, y0 + 0.62);
  for (const [dx, dz] of [
    [0.5, 0.45],
    [1.2, 0.45],
    [1.7, 1],
  ] satisfies Point2[]) {
    round(
      sketch,
      {
        colors: METAL,
        h: 0.08,
        r: 0.2,
        segments: 12,
        x: hall.x + dx,
        y: y0 + 0.62,
        z: hall.z + dz,
      },
      "hair",
    );
    loop(
      sketch,
      ellipse(0.12, 0.12, 10).map(
        ([a, b]) => [hall.x + dx + a, y0 + 0.705, hall.z + dz + b] satisfies Vec3,
      ),
      "hair",
      "inkSoft",
    );
  }
  board(sketch, hall, {
    along: 0.2,
    colors: paint("accentTeal"),
    h: 0.28,
    ink: "white",
    side: "side",
    text: title.toUpperCase(),
    w: hall.d - 0.3,
    y: y0 + 0.3,
  });
  // Cables from the hall to the stack.
  for (const offset of [0, 0.12]) {
    line(
      sketch,
      [
        [hall.x + 0.1, y0 + 0.5 + offset, hall.z + 0.2],
        [cx + radius * 0.7, y0 + 0.55 + offset, cz + radius * 0.7],
      ],
      "hair",
    );
  }
  monument(sketch, site.x + 0.5, site.z + site.d - 0.6, y0, title.toUpperCase(), 1.4);
  lamp(sketch, site.x + site.w - 0.4, site.z + 0.5, y0);
  return bounds({ d: radius * 2, w: radius * 2, x: cx - radius, z: cz - radius }, y0, y - y0);
};

// Edgestories: an observatory, and a sculpture of people joined by edges.

const NODES: [
  number,
  number,
  number,
  "accentRed" | "accentBlue" | "accentYellow" | "accentGreen" | "accentPurple",
][] = [
  [0, 0.9, 0, "accentRed"],
  [0.7, 0.6, 0.3, "accentBlue"],
  [-0.6, 0.55, 0.4, "accentYellow"],
  [0.3, 1.25, -0.4, "accentGreen"],
  [-0.4, 1.1, -0.5, "accentPurple"],
  [0.9, 1.05, -0.3, "accentYellow"],
];

const EDGES: Point2[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [1, 5],
  [3, 5],
  [2, 4],
  [3, 4],
  [1, 3],
];

export const drawEdgestories: DrawLandmark = (sketch, site, title) => {
  const y0 = plaza(sketch, site);
  const lab = { d: 2.3, w: 3.6, x: site.x + 0.6, z: site.z + 0.5 };
  const height = 2 * FLOOR + 0.12;
  box(sketch, { ...lab, colors: WALLS, h: height, y: y0 });
  windows(sketch, lab, { columns: 7, floors: 2, side: "front", skip: 3, y: y0 + 0.12 });
  windows(sketch, lab, { columns: 4, floors: 2, side: "side", y: y0 + 0.12 });
  parapet(sketch, lab, y0 + height);
  door(sketch, lab, { along: 1.6, awning: "accentPurple", side: "front", width: 0.3 });
  board(sketch, lab, {
    along: 0.2,
    colors: paint("signBoard"),
    h: 0.28,
    side: "front",
    text: title.toUpperCase(),
    w: 1.65,
    y: y0 + height - 0.36,
  });
  // The observatory dome, its shutter open to the sky.
  const dx = lab.x + lab.w - 1;
  const dz = lab.z + 1;
  round(sketch, { colors: WALLS, h: 0.25, r: 0.72, segments: 24, x: dx, y: y0 + height, z: dz });
  ball(sketch, {
    colors: METAL,
    detail: 24,
    r: 0.72,
    ry: 0.95,
    x: dx,
    y: y0 + height + 0.25,
    z: dz,
  });
  const slit = (t: number): Vec3 => [
    dx + 0.06,
    y0 + height + 0.25 + Math.sin(t) * 0.68,
    dz + Math.cos(t) * 0.68 + 0.04,
  ];
  const ribs = [0.15, 0.5, 0.85, 1.2];
  face(
    sketch,
    "screen",
    [
      ...ribs.map((t) => slit(t)),
      ...ribs.toReversed().map((t) => {
        const p = slit(t);
        return [p[0] - 0.24, p[1], p[2]] satisfies Vec3;
      }),
    ],
    "fine",
  );
  rooftop(sketch, { d: 1.2, w: 1.6, x: lab.x + 0.2, z: lab.z + 0.3 }, y0 + height, 7);
  // The network sculpture: people as nodes, the stories as edges.
  const sx = site.x + site.w - 1.4;
  const sz = site.z + site.d - 1.3;
  round(sketch, { colors: PLAZA, h: 0.1, r: 0.9, segments: 20, x: sx, y: y0, z: sz });
  const points = NODES.map(([x, y, z]) => [sx + x, y0 + 0.1 + y, sz + z] satisfies Vec3);
  for (const [a, b] of EDGES) {
    const from = points[a];
    const to = points[b];
    if (from && to) {
      line(sketch, [from, to], "fine");
    }
  }
  for (const [index, point] of points.entries()) {
    line(sketch, [[point[0], y0 + 0.1, point[2]], point], "hair", "inkSoft");
    ball(sketch, {
      colors: paint(NODES[index]?.[3] ?? "accentRed"),
      detail: 10,
      r: 0.1,
      x: point[0],
      y: point[1],
      z: point[2],
    });
  }
  bench(sketch, site.x + 0.7, site.z + site.d - 0.7, "x", y0);
  tree(sketch, { kind: "round", size: 1.1, x: site.x + 0.45, z: site.z + site.d - 1.4 }, y0);
  return bounds(lab, y0, height + 1.2);
};

// Clawders: a running track where Clawd runs laps, forever.

/** A stadium outline: two half circles joined by straights, along x. */
export const stadium = (
  cx: number,
  cz: number,
  straight: number,
  radius: number,
  segments = 14,
): Point2[] => {
  const points: Point2[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = -Math.PI / 2 + (index / segments) * Math.PI;
    points.push([cx + straight / 2 + Math.cos(angle) * radius, cz + Math.sin(angle) * radius]);
  }
  for (let index = 0; index <= segments; index += 1) {
    const angle = Math.PI / 2 + (index / segments) * Math.PI;
    points.push([cx - straight / 2 + Math.cos(angle) * radius, cz + Math.sin(angle) * radius]);
  }
  return points;
};

export const TRACK = { radius: 1.25, straight: 2.4 };

/** Clawd, facing +x: an orange body, two dark eyes, little legs. */
const drawClawd = (sketch: Sketch, scale = 1) => {
  const s = scale;
  solid(
    sketch,
    boxTriangles({
      colors: paint("accentOrange", "accentOrange", "accentOrange"),
      d: 0.16 * s,
      h: 0.15 * s,
      w: 0.22 * s,
      x: -0.11 * s,
      y: 0.07 * s,
      z: -0.08 * s,
    }),
  );
  for (const side of [-1, 1]) {
    solid(
      sketch,
      boxTriangles({
        colors: paint("accentOrange", "accentOrange", "accentOrange"),
        d: 0.04 * s,
        h: 0.05 * s,
        w: 0.07 * s,
        x: -0.035 * s,
        y: 0.12 * s,
        z: side > 0 ? 0.08 * s : -0.12 * s,
      }),
      "hair",
    );
    face(
      sketch,
      "ink",
      [
        [0.112 * s, 0.17 * s, side * 0.03 * s - 0.012 * s],
        [0.112 * s, 0.17 * s, side * 0.03 * s + 0.012 * s],
        [0.112 * s, 0.195 * s, side * 0.03 * s + 0.012 * s],
        [0.112 * s, 0.195 * s, side * 0.03 * s - 0.012 * s],
      ],
      null,
    );
  }
  for (const [x, z] of [
    [-0.07, -0.05],
    [-0.07, 0.05],
    [0.06, -0.05],
    [0.06, 0.05],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [x * s, 0.07 * s, z * s],
        [x * s, 0, z * s],
      ],
      "fine",
    );
  }
};

export const drawClawders: DrawLandmark = (sketch, site, title) => {
  const y0 = site.y;
  const cx = site.x + site.w / 2;
  const cz = site.z + site.d / 2 + 0.35;
  const { radius, straight } = TRACK;
  box(
    sketch,
    {
      colors: paint("lawn", "lawn", "lawn"),
      d: site.d - 0.3,
      h: 0.008,
      w: site.w - 0.3,
      x: site.x + 0.15,
      y: y0,
      z: site.z + 0.15,
    },
    "hair",
  );
  // Each layer clear of the one below: coplanar faces in one mesh flicker.
  ground(sketch, "roofTerracotta", stadium(cx, cz, straight, radius + 0.45), y0 + 0.02, "fine");
  ground(sketch, "lawn", stadium(cx, cz, straight, radius - 0.35), y0 + 0.03, "fine");
  for (const offset of [-0.15, 0.05, 0.25]) {
    groundLoop(sketch, stadium(cx, cz, straight, radius + offset), y0 + 0.032, "hair", "white");
  }
  line(
    sketch,
    [
      [cx, y0 + 0.034, cz + radius - 0.35],
      [cx, y0 + 0.034, cz + radius + 0.45],
    ],
    "fine",
    "white",
  );
  // Bleachers along the back straight.
  for (let step = 0; step < 3; step += 1) {
    box(sketch, {
      colors: WALLS,
      d: 0.22,
      h: 0.12 * (step + 1),
      w: straight + 1.2,
      x: cx - straight / 2 - 0.6,
      y: y0,
      z: site.z + 0.15 + (2 - step) * 0.22,
    });
  }
  billboard(sketch, {
    colors: paint("accentOrange"),
    h: 0.36,
    ink: "white",
    legs: 0.5,
    side: "front",
    text: title.toUpperCase(),
    w: 1.5,
    x: site.x + site.w - 1.75,
    y: y0,
    z: site.z + 0.25,
  });
  // Three Clawds, each its own part so the animation can run them round.
  for (let index = 0; index < 3; index += 1) {
    drawClawd(part(sketch, `clawders:runner:${index}`, [cx, y0 + 0.014, cz], true), 1.25);
  }
  lamp(sketch, site.x + 0.35, site.z + site.d - 0.35, y0);
  lamp(sketch, site.x + site.w - 0.35, site.z + site.d - 0.35, y0);
  return bounds({ d: site.d - 0.4, w: site.w - 0.4, x: site.x + 0.2, z: site.z + 0.2 }, y0, 0.9);
};

// Init: a launch pad on the far point, a rocket that goes up now and then.

const gantry = (sketch: Sketch, x: number, z: number, y: number, height: number) => {
  const s = 0.42;
  const corners: Point2[] = [
    [x, z],
    [x + s, z],
    [x + s, z + s],
    [x, z + s],
  ];
  for (const [cx, cz] of corners) {
    line(
      sketch,
      [
        [cx, y, cz],
        [cx, y + height, cz],
      ],
      "fine",
    );
  }
  for (let level = 0; level <= height; level += 0.35) {
    loop(
      sketch,
      corners.map(([cx, cz]) => [cx, y + level, cz] satisfies Vec3),
      "hair",
    );
    if (level + 0.35 <= height) {
      line(
        sketch,
        [
          [x, y + level, z + s],
          [x + s, y + level + 0.35, z + s],
        ],
        "hair",
      );
      line(
        sketch,
        [
          [x + s, y + level, z],
          [x + s, y + level + 0.35, z + s],
        ],
        "hair",
      );
    }
  }
  box(
    sketch,
    {
      colors: paint("accentRed", "accentRed", "accentRed"),
      d: s,
      h: 0.12,
      w: s,
      x,
      y: y + height,
      z,
    },
    "fine",
  );
};

const drawRocket = (sketch: Sketch, title: string) => {
  const body = paint("white", "white", "wallRight");
  round(sketch, {
    colors: paint("screen"),
    h: 0.14,
    r: 0.12,
    segments: 12,
    top: 0.17,
    x: 0,
    y: 0,
    z: 0,
  });
  round(sketch, { colors: body, h: 2, r: 0.2, segments: 16, x: 0, y: 0.14, z: 0 });
  round(
    sketch,
    { colors: paint("navy"), h: 0.12, r: 0.205, segments: 16, x: 0, y: 1.5, z: 0 },
    "hair",
  );
  round(sketch, {
    colors: paint("accentRed", "accentRed", "accentRed"),
    h: 0.55,
    r: 0.2,
    segments: 16,
    top: 0,
    x: 0,
    y: 2.14,
    z: 0,
  });
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2 + Math.PI / 4;
    const out: Vec3 = [Math.cos(angle), 0, Math.sin(angle)];
    face(
      sketch,
      "accentRed",
      [
        [out[0] * 0.18, 0.14, out[2] * 0.18],
        [out[0] * 0.42, 0.06, out[2] * 0.42],
        [out[0] * 0.42, 0.3, out[2] * 0.42],
        [out[0] * 0.18, 0.62, out[2] * 0.18],
      ],
      "fine",
    );
  }
  sketch.signs.push({
    across: [0.2, 0, -0.2],
    origin: [-0.1, 1.05, 0.215],
    text: title.toUpperCase(),
    token: "ink",
    up: [0, 0.16, 0],
  });
  const flame = part(sketch, "init:flame", [0, 0, 0]);
  const plume = roundTriangles({
    colors: paint("flame"),
    h: 0.75,
    r: 0.16,
    segments: 10,
    top: 0,
    x: 0,
    y: 0,
    z: 0,
  });
  solid(
    flame,
    // Turned over, not mirrored, so the faces still wind outward.
    mapTriangles(plume, (point) => rotate(point, [0, 0, 0], "x", Math.PI)),
  );
};

export const drawInit: DrawLandmark = (sketch, site, title) => {
  const y0 = site.y;
  const cx = site.x + site.w / 2 - 0.2;
  const cz = site.z + site.d / 2 - 0.1;
  round(sketch, { colors: PLAZA, h: 0.06, r: 2.3, segments: 32, x: cx, y: y0, z: cz });
  groundLoop(sketch, ellipse(1.6, 1.6, 32, cx, cz), y0 + 0.065, "hair", "accentYellow");
  box(
    sketch,
    { colors: paint("screen"), d: 0.5, h: 0.004, w: 2.4, x: cx - 0.2, y: y0 + 0.06, z: cz - 0.25 },
    "hair",
  );
  gantry(sketch, cx + 0.5, cz - 0.62, y0 + 0.06, 2.9);
  line(
    sketch,
    [
      [cx + 0.5, y0 + 2.2, cz - 0.4],
      [cx + 0.15, y0 + 2.2, cz - 0.1],
    ],
    "fine",
  );
  drawRocket(part(sketch, "init:rocket", [cx, y0 + 0.06, cz]), title);
  // Fuel tanks on stilts and the bunker that counts down.
  for (const [tx, tz] of [
    [cx - 1.55, cz + 0.9],
    [cx - 1.05, cz + 1.45],
  ] satisfies Point2[]) {
    for (const [lx, lz] of [
      [-0.18, -0.18],
      [0.18, -0.18],
      [0.18, 0.18],
      [-0.18, 0.18],
    ] satisfies Point2[]) {
      line(
        sketch,
        [
          [tx + lx, y0 + 0.06, tz + lz],
          [tx + lx, y0 + 0.4, tz + lz],
        ],
        "hair",
      );
    }
    ball(sketch, {
      colors: paint("white", "white", "wallRight"),
      detail: 14,
      r: 0.32,
      x: tx,
      y: y0 + 0.66,
      z: tz,
    });
  }
  const bunker = { d: 0.9, w: 1.3, x: site.x + site.w - 1.6, z: site.z + site.d - 1.15 };
  box(sketch, { ...bunker, colors: WALLS, h: 0.42, y: y0 });
  board(sketch, bunker, {
    along: 0.15,
    colors: paint("navy"),
    h: 0.24,
    ink: "white",
    side: "front",
    text: title.toUpperCase(),
    w: 1,
    y: y0 + 0.15,
  });
  round(sketch, {
    colors: METAL,
    h: 0.04,
    r: 0.22,
    segments: 12,
    top: 0.05,
    x: bunker.x + 0.35,
    y: y0 + 0.42,
    z: bunker.z + 0.3,
  });
  return bounds({ d: 4.6, w: 4.6, x: cx - 2.3, z: cz - 2.3 }, y0, 2.9);
};
