// What builds the town on arrival (crews.ts says where and when): tower
// cranes, dump trucks and cement mixers, a site's fence and stacked
// materials, and the scaffolding round a building. All drawn whole, since
// they move and turn; a truck's nose is along -x.
import type { Rect } from "./plan";
import type { Sketch, Vec3 } from "./sketch";
import { CURB_TOP } from "./draw-blocks";
import { FLOOR } from "./draw-kit";
import { paint } from "./palette";
import { ball, box, createSketch, line, part } from "./sketch";

/** How much larger than life the trucks are drawn, so they read from the whole island's distance. */
export const TRUCK_SCALE = 1.6;

const BODY = paint("accentYellow", "accentYellow", "accentOrange");
const STEEL = paint("roofGray", "roofGray", "roofGrayShade");
const CAB = paint("white", "white", "wallRight");
const CONCRETE = paint("plate", "wallLeft", "wallRight");
const TIMBER = paint("trunk", "trunk", "trunk");
const FENCE = paint("accentOrange", "accentOrange", "accentOrange");

/** A truck's chassis, wheels and cab, nose to -x, at the origin. */
const chassis = (sketch: Sketch, length: number) => {
  box(sketch, { colors: STEEL, d: 0.3, h: 0.08, w: length, x: -length / 2, y: 0.04, z: -0.15 });
  box(sketch, { colors: CAB, d: 0.28, h: 0.18, w: 0.24, x: -length / 2, y: 0.12, z: -0.14 });
  for (const x of [-length / 2 + 0.12, length / 2 - 0.12]) {
    for (const z of [-0.17, 0.17]) {
      box(sketch, { colors: STEEL, d: 0.04, h: 0.08, w: 0.1, x: x - 0.05, y: 0, z: z - 0.02 });
    }
  }
};

export const drawDumpTruck = (): Sketch => {
  const sketch = createSketch(null);
  chassis(sketch, 0.7);
  box(sketch, { colors: BODY, d: 0.28, h: 0.14, w: 0.42, x: -0.1, y: 0.12, z: -0.14 });
  box(sketch, { colors: STEEL, d: 0.2, h: 0.05, w: 0.32, x: -0.05, y: 0.26, z: -0.1 });
  return sketch;
};

export const drawMixer = (): Sketch => {
  const sketch = createSketch(null);
  chassis(sketch, 0.72);
  ball(sketch, { colors: BODY, detail: 12, r: 0.13, rx: 1.7, x: 0.12, y: 0.27, z: 0 });
  line(sketch, [
    [-0.02, 0.2, -0.12],
    [0.3, 0.32, 0.12],
  ]);
  return sketch;
};

/**
 * A tower crane on its pad: the mast (the "mast" part, scaled up a section
 * at a time as it's put up) and the jib with its counterweight, cab and hook
 * (the "jib" part, which turns to face the work).
 */
export const drawTowerCrane = (mast: number): Sketch => {
  const sketch = createSketch(null);
  box(sketch, { colors: CONCRETE, d: 0.36, h: 0.06, w: 0.36, x: -0.18, y: 0, z: -0.18 });
  const tower = part(sketch, "mast", [0, 0.06, 0], true);
  box(tower, { colors: BODY, d: 0.16, h: mast, w: 0.16, x: -0.08, y: 0, z: -0.08 });
  for (let y = 0; y + 0.3 <= mast; y += 0.3) {
    line(tower, [
      [-0.08, y, 0.081],
      [0.08, y + 0.3, 0.081],
    ]);
    line(tower, [
      [0.081, y, 0.08],
      [0.081, y + 0.3, -0.08],
    ]);
  }
  const jib = part(sketch, "jib", [0, 0.06 + mast, 0], true);
  box(jib, { colors: BODY, d: 0.1, h: 0.1, w: 2.4, x: -0.6, y: 0, z: -0.05 });
  box(jib, { colors: CONCRETE, d: 0.2, h: 0.2, w: 0.26, x: -0.62, y: -0.16, z: -0.1 });
  box(jib, { colors: CAB, d: 0.14, h: 0.14, w: 0.16, x: 0.1, y: -0.14, z: 0.06 });
  box(jib, { colors: BODY, d: 0.06, h: 0.4, w: 0.06, x: -0.03, y: 0.1, z: -0.03 });
  line(jib, [
    [0, 0.5, 0],
    [1.7, 0.1, 0],
  ]);
  line(jib, [
    [1.4, 0, 0],
    [1.4, -0.8, 0],
  ]);
  box(jib, { colors: STEEL, d: 0.1, h: 0.08, w: 0.1, x: 1.35, y: -0.88, z: -0.05 });
  return sketch;
};

/** A site's fence round its lot (open at the gate), a site cabin and stacks of materials, about its middle. */
export const drawYard = ({ w, d }: Pick<Rect, "w" | "d">): Sketch => {
  const sketch = createSketch(null);
  const x0 = -w / 2 - 0.15;
  const x1 = w / 2 + 0.15;
  const z0 = -d / 2 - 0.15;
  const z1 = d / 2 + 0.15;
  const y = CURB_TOP;
  const corners: Vec3[] = [
    [x1 - 0.5, y, z1],
    [x0, y, z1],
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x1 - 0.2, y, z1],
  ];
  for (const height of [0.06, 0.14]) {
    line(
      sketch,
      corners.map(([x, , z]): Vec3 => [x, y + height, z]),
      "fine",
      "accentOrange",
    );
  }
  for (const [x, , z] of corners) {
    box(sketch, { colors: FENCE, d: 0.03, h: 0.16, w: 0.03, x: x - 0.015, y, z: z - 0.015 });
  }
  box(sketch, { colors: CAB, d: 0.3, h: 0.22, w: 0.5, x: x0 + 0.1, y, z: z0 + 0.1 });
  for (const [index, h] of [0.08, 0.14, 0.1].entries()) {
    box(sketch, {
      colors: index === 1 ? STEEL : TIMBER,
      d: 0.2,
      h,
      w: 0.24,
      x: x1 - 0.35 - index * 0.28,
      y,
      z: z0 + 0.12,
    });
  }
  return sketch;
};

/**
 * Scaffolding round a building as tall as `top`: standards at the corners
 * and along the sides, a ledger at every storey, a brace on each face. Drawn
 * where it stands, so it rises with the building it's round.
 */
export const drawScaffold = ({ x, z, w, d }: Rect, top: number): Sketch => {
  const sketch = createSketch(null);
  const x0 = x - 0.1;
  const x1 = x + w + 0.1;
  const z0 = z - 0.1;
  const z1 = z + d + 0.1;
  const y0 = CURB_TOP;
  const ring = (y: number): Vec3[] => [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
    [x0, y, z0],
  ];
  for (let y = y0 + FLOOR; y < top; y += FLOOR) {
    line(sketch, ring(y), "hair", "inkSoft");
  }
  line(sketch, ring(top), "hair", "inkSoft");
  for (const [ax, az, bx, bz] of [
    [x0, z0, x1, z0],
    [x1, z0, x1, z1],
    [x1, z1, x0, z1],
    [x0, z1, x0, z0],
  ] as const) {
    // A standard every 0.6 cells or so along each side.
    const count = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.6));
    for (let index = 0; index < count; index += 1) {
      const px = ax + ((bx - ax) * index) / count;
      const pz = az + ((bz - az) * index) / count;
      line(
        sketch,
        [
          [px, y0, pz],
          [px, top, pz],
        ],
        "hair",
        "inkSoft",
      );
    }
    line(
      sketch,
      [
        [ax, y0, az],
        [bx, top, bz],
      ],
      "hair",
      "inkSoft",
    );
  }
  return sketch;
};
