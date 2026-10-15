// The machines that build the town on arrival (crews.ts says where and
// when): a truck-mounted tower crane whose mast and jib move, and a dump
// truck. Drawn whole, nose along -x, as they drive and turn.
import type { Sketch } from "./sketch";
import { paint } from "./palette";
import { box, createSketch, line, part } from "./sketch";

const BODY = paint("accentYellow", "accentYellow", "accentOrange");
const STEEL = paint("roofGray", "roofGray", "roofGrayShade");
const CAB = paint("white", "white", "wallRight");

/** A truck's chassis and cab, nose to -x, on its wheels at the origin. */
const chassis = (sketch: Sketch, length: number) => {
  box(sketch, { colors: STEEL, d: 0.3, h: 0.08, w: length, x: -length / 2, y: 0.04, z: -0.15 });
  box(sketch, { colors: CAB, d: 0.28, h: 0.18, w: 0.24, x: -length / 2, y: 0.12, z: -0.14 });
  for (const x of [-length / 2 + 0.12, length / 2 - 0.12]) {
    for (const z of [-0.17, 0.17]) {
      box(sketch, { colors: STEEL, d: 0.04, h: 0.08, w: 0.1, x: x - 0.05, y: 0, z: z - 0.02 });
    }
  }
};

/**
 * A crane on a truck: its mast (the "mast" part, scaled up from nothing as
 * it's raised) and its jib on top (the "jib" part, which swings round).
 */
export const drawCrane = (mast: number): Sketch => {
  const sketch = createSketch(null);
  chassis(sketch, 0.9);
  box(sketch, { colors: BODY, d: 0.26, h: 0.1, w: 0.5, x: -0.15, y: 0.12, z: -0.13 });
  const tower = part(sketch, "mast", [0.2, 0.22, 0], true);
  box(tower, { colors: BODY, d: 0.12, h: mast, w: 0.12, x: -0.06, y: 0, z: -0.06 });
  for (let y = 0.3; y < mast; y += 0.3) {
    line(tower, [
      [-0.06, y - 0.3, 0.061],
      [0.06, y, 0.061],
    ]);
  }
  const jib = part(sketch, "jib", [0.2, 0.22 + mast, 0], true);
  box(jib, { colors: BODY, d: 0.08, h: 0.08, w: 2.6, x: -0.6, y: 0, z: -0.04 });
  box(jib, { colors: STEEL, d: 0.16, h: 0.16, w: 0.22, x: -0.62, y: -0.12, z: -0.08 });
  box(jib, { colors: CAB, d: 0.12, h: 0.12, w: 0.14, x: -0.07, y: -0.12, z: 0.05 });
  line(jib, [
    [1.6, 0, 0],
    [1.6, -0.9, 0],
  ]);
  box(jib, { colors: STEEL, d: 0.08, h: 0.06, w: 0.08, x: 1.56, y: -0.96, z: -0.04 });
  return sketch;
};

/** A dump truck with its load. */
export const drawTruck = (): Sketch => {
  const sketch = createSketch(null);
  chassis(sketch, 0.7);
  box(sketch, { colors: BODY, d: 0.28, h: 0.14, w: 0.42, x: -0.1, y: 0.12, z: -0.14 });
  box(sketch, { colors: STEEL, d: 0.2, h: 0.05, w: 0.32, x: -0.05, y: 0.26, z: -0.1 });
  return sketch;
};
