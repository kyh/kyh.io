// Outside the grid: woods, farms with barns and windmills, wind turbines on
// the far shore, a lighthouse on the point and a pier for the boats.
import type { CityPlan, Field, Spot } from "./plan";
import type { Sketch, Vec3 } from "./sketch";
import { tree } from "./draw-kit";
import { paint, WALLS } from "./palette";
import { ball, box, face, gable, line, part, round } from "./sketch";
import type { Steps } from "./steps";
import { finish } from "./steps";

const CROPS: Record<Field["crop"], "field" | "fieldGreen" | "soil"> = {
  green: "fieldGreen",
  soil: "soil",
  wheat: "field",
};

const drawField = (sketch: Sketch, field: Field) => {
  const y = 0.012;
  const { x, z, w, d } = field;
  face(
    sketch,
    CROPS[field.crop],
    [
      [x, y, z],
      [x + w, y, z],
      [x + w, y, z + d],
      [x, y, z + d],
    ],
    "hair",
  );
  const rows = field.rows === "x" ? d : w;
  for (let offset = 0.25; offset < rows - 0.1; offset += 0.25) {
    const points: [Vec3, Vec3] =
      field.rows === "x"
        ? [
            [x + 0.12, y + 0.002, z + offset],
            [x + w - 0.12, y + 0.002, z + offset],
          ]
        : [
            [x + offset, y + 0.002, z + 0.12],
            [x + offset, y + 0.002, z + d - 0.12],
          ];
    line(sketch, points, "hair", "inkSoft");
  }
};

const BARN = paint("roofTerracotta", "roofTerracotta", "roofTerracottaShade");

const drawBarn = (sketch: Sketch, { x, z }: Spot) => {
  const walls = { d: 1, w: 1.3, x: x - 0.65, z: z - 0.5 };
  box(sketch, { ...walls, colors: paint("top", "roofPink", "roofPinkShade"), h: 0.5, y: 0.01 });
  gable(sketch, {
    ...walls,
    colors: paint("roofGray", "roofGray", "roofGrayShade"),
    ends: paint("top", "roofPink", "roofPinkShade"),
    ridge: "x",
    rise: 0.42,
    y: 0.51,
  });
  face(
    sketch,
    "door",
    [
      [walls.x + 0.45, 0.02, walls.z + walls.d + 0.004],
      [walls.x + 0.85, 0.02, walls.z + walls.d + 0.004],
      [walls.x + 0.85, 0.36, walls.z + walls.d + 0.004],
      [walls.x + 0.45, 0.36, walls.z + walls.d + 0.004],
    ],
    "fine",
  );
  round(sketch, {
    colors: WALLS,
    h: 0.85,
    r: 0.24,
    segments: 14,
    x: walls.x + walls.w + 0.3,
    y: 0.01,
    z: walls.z + 0.35,
  });
  ball(sketch, {
    colors: BARN,
    detail: 12,
    r: 0.24,
    ry: 0.6,
    x: walls.x + walls.w + 0.3,
    y: 0.86,
    z: walls.z + 0.35,
  });
};

/** Four sails on a cross, drawn flat facing +z so they can turn. */
const drawSails = (sketch: Sketch, length: number, width: number, blades: number) => {
  for (let index = 0; index < blades; index += 1) {
    const angle = (index / blades) * Math.PI * 2;
    const along: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
    const across: Vec3 = [-Math.sin(angle) * width, Math.cos(angle) * width, 0];
    const start = 0.06;
    face(
      sketch,
      "white",
      [
        [along[0] * start, along[1] * start, 0],
        [along[0] * length, along[1] * length, 0],
        [along[0] * length + across[0], along[1] * length + across[1], 0],
        [along[0] * start + across[0], along[1] * start + across[1], 0],
      ],
      "fine",
    );
  }
};

const drawWindmill = (sketch: Sketch, spot: Spot, index: number) => {
  const { x, z } = spot;
  round(sketch, { colors: WALLS, h: 1.15, r: 0.36, segments: 8, top: 0.24, x, y: 0.01, z });
  round(sketch, {
    colors: paint("roofGray", "roofGray", "roofGrayShade"),
    h: 0.32,
    r: 0.29,
    segments: 8,
    top: 0,
    x,
    y: 1.16,
    z,
  });
  face(
    sketch,
    "door",
    [
      [x - 0.08, 0.02, z + 0.355],
      [x + 0.08, 0.02, z + 0.355],
      [x + 0.08, 0.26, z + 0.335],
      [x - 0.08, 0.26, z + 0.335],
    ],
    "fine",
  );
  const sails = part(sketch, `windmill:${index}`, [x, 1.2, z + 0.33], true);
  drawSails(sails, 0.95, 0.2, 4);
};

const drawTurbine = (sketch: Sketch, spot: Spot, index: number) => {
  const { x, z } = spot;
  round(sketch, { colors: WALLS, h: 2.6, r: 0.07, segments: 8, top: 0.04, x, y: 0.01, z });
  box(
    sketch,
    { colors: WALLS, d: 0.3, h: 0.12, w: 0.14, x: x - 0.07, y: 2.58, z: z - 0.12 },
    "hair",
  );
  const blades = part(sketch, `turbine:${index}`, [x, 2.64, z + 0.2], true);
  drawSails(blades, 1, 0.06, 3);
  ball(blades, { colors: WALLS, detail: 8, r: 0.05, x: 0, y: 0, z: 0.02 }, "hair");
};

const STRIPE = paint("accentRed", "accentRed", "accentRed");

const drawLighthouse = (sketch: Sketch, { x, z }: Spot) => {
  round(sketch, {
    colors: paint("paving", "wallLeft", "wallRight"),
    h: 0.12,
    r: 0.7,
    segments: 16,
    x,
    y: 0,
    z,
  });
  const bands = 5;
  for (let index = 0; index < bands; index += 1) {
    const bottom = 0.12 + index * 0.42;
    const r0 = 0.36 - index * 0.035;
    round(sketch, {
      colors: index % 2 === 0 ? WALLS : STRIPE,
      h: 0.42,
      r: r0,
      segments: 14,
      top: r0 - 0.035,
      x,
      y: bottom,
      z,
    });
  }
  const top = 0.12 + bands * 0.42;
  round(sketch, { colors: paint("metalDark"), h: 0.05, r: 0.3, segments: 14, x, y: top, z });
  round(sketch, {
    colors: paint("lamp", "glass", "glass"),
    h: 0.26,
    r: 0.16,
    segments: 12,
    x,
    y: top + 0.05,
    z,
  });
  round(sketch, { colors: STRIPE, h: 0.18, r: 0.2, segments: 12, top: 0, x, y: top + 0.31, z });
};

const drawPier = (sketch: Sketch, pier: { x: number; z: number; w: number; d: number }) => {
  const deck = paint("sand", "wallLeft", "wallRight");
  box(sketch, {
    colors: deck,
    d: pier.d,
    h: 0.06,
    w: pier.w * 0.6,
    x: pier.x + pier.w * 0.2,
    y: 0.08,
    z: pier.z,
  });
  for (let along = 0.4; along < pier.d; along += 0.9) {
    for (const side of [0.2, 0.8]) {
      line(
        sketch,
        [
          [pier.x + pier.w * side, -0.05, pier.z + along],
          [pier.x + pier.w * side, 0.14, pier.z + along],
        ],
        "fine",
      );
    }
  }
  box(sketch, {
    colors: WALLS,
    d: 0.6,
    h: 0.32,
    w: 0.7,
    x: pier.x + pier.w * 0.5 - 0.35,
    y: 0.14,
    z: pier.z + pier.d - 0.8,
  });
  gable(sketch, {
    colors: paint("roofBlue", "roofBlue", "roofBlueShade"),
    d: 0.6,
    ends: WALLS,
    ridge: "z",
    rise: 0.22,
    w: 0.7,
    x: pier.x + pier.w * 0.5 - 0.35,
    y: 0.46,
    z: pier.z + pier.d - 0.8,
  });
};

/** The countryside a piece at a time, yielding between pieces. */
export const countrysideSteps = function* countrysideSteps(
  sketch: Sketch,
  plan: CityPlan,
): Steps<void> {
  const { countryside } = plan;
  for (const field of countryside.fields) {
    drawField(sketch, field);
    yield;
  }
  for (const barn of countryside.barns) {
    drawBarn(sketch, barn);
    yield;
  }
  for (const [index, spot] of countryside.windmills.entries()) {
    drawWindmill(sketch, spot, index);
    yield;
  }
  for (const [index, spot] of countryside.turbines.entries()) {
    drawTurbine(sketch, spot, index);
    yield;
  }
  if (countryside.lighthouse) {
    drawLighthouse(sketch, countryside.lighthouse);
    yield;
  }
  if (countryside.pier) {
    drawPier(sketch, countryside.pier);
    yield;
  }
  for (const spot of countryside.trees) {
    tree(sketch, spot, 0);
  }
};

/** The same, all at once. */
export const drawCountryside = (sketch: Sketch, plan: CityPlan) =>
  finish(countrysideSteps(sketch, plan));
