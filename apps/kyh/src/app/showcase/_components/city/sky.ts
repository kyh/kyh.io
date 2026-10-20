// What moves over and around the town besides the blimp (blimp.ts): hot-air
// balloons, drones, boats sailing round the island, and what a season flies
// across the sky (Santa's sleigh, a witch on her broom). Each is drawn once as
// a sketch and then only moved, so its baked outline stays true.
import type { Point2, Sketch, Triangle, Vec3 } from "./sketch";
import { santaHat, wearing, witchHat } from "./hats";
import { BLACK, paint, RED, WHITE } from "./palette";
import {
  ballTriangles,
  box,
  boxTriangles,
  createSketch,
  ellipse,
  extrude,
  face,
  FLANK_ON,
  headedTo,
  line,
  placed,
  rotate,
  solid,
} from "./sketch";

const STRIPES = [
  paint("accentRed", "accentRed", "accentRed"),
  paint("accentYellow", "accentYellow", "accentYellow"),
] as const;

/** A balloon in vertical stripes: recolor every other band of a sphere. */
export const drawBalloon = (stripe: number, view: Vec3, covers: readonly Vec3[]): Sketch => {
  const sketch = createSketch(view, covers);
  const [first, second] = STRIPES;
  const triangles: Triangle[] = ballTriangles({
    colors: first,
    detail: 16,
    r: 0.42,
    ry: 1.12,
    x: 0,
    y: 0.5,
    z: 0,
  }).map((triangle) => {
    const angle = Math.atan2(
      triangle.a[2] + triangle.b[2] + triangle.c[2],
      triangle.a[0] + triangle.b[0] + triangle.c[0],
    );
    const band = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8 + stripe);
    return band % 2 === 0 ? triangle : { ...triangle, token: second.left };
  });
  solid(sketch, triangles, "fine", 70);
  box(
    sketch,
    {
      colors: paint("trunk", "roofTerracotta", "roofTerracottaShade"),
      d: 0.14,
      h: 0.12,
      w: 0.14,
      x: -0.07,
      y: -0.24,
      z: -0.07,
    },
    "fine",
  );
  for (const [x, z] of [
    [-0.06, -0.06],
    [0.06, -0.06],
    [0.06, 0.06],
    [-0.06, 0.06],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [x, -0.12, z],
        [x * 3, 0.1, z * 3],
      ],
      "hair",
    );
  }
  return sketch;
};

/** A sailboat, nose along +x, drawn whole so it can turn as it sails. */
export const drawBoat = (sail: "white" | "accentRed" | "accentBlue"): Sketch => {
  const sketch = createSketch(null);
  const outline: Point2[] = [
    [-0.32, -0.1],
    [0.2, -0.1],
    [0.38, 0],
    [0.2, 0.1],
    [-0.32, 0.1],
  ];
  extrude(
    sketch,
    outline,
    { origin: [0, 0.02, 0], u: [1, 0, 0], v: [0, 0, 1] },
    [0, 0.07, 0],
    paint("white", "white", "wallRight"),
  );
  line(
    sketch,
    [
      [0, 0.09, 0],
      [0, 0.82, 0],
    ],
    "fine",
  );
  face(
    sketch,
    sail,
    [
      [0.02, 0.14, 0],
      [0.02, 0.8, 0],
      [0.32, 0.16, 0],
    ],
    "fine",
  );
  face(
    sketch,
    "white",
    [
      [-0.02, 0.18, 0],
      [-0.02, 0.64, 0],
      [-0.26, 0.2, 0],
    ],
    "fine",
  );
  return sketch;
};

/** A ferry for the pier, nose along +x. */
export const drawFerry = (): Sketch => {
  const sketch = createSketch(null);
  box(sketch, {
    colors: paint("white", "white", "wallRight"),
    d: 0.32,
    h: 0.1,
    w: 0.9,
    x: -0.45,
    y: 0.02,
    z: -0.16,
  });
  box(
    sketch,
    {
      colors: paint("navy", "navy", "navy"),
      d: 0.33,
      h: 0.03,
      w: 0.91,
      x: -0.455,
      y: 0.04,
      z: -0.165,
    },
    "hair",
  );
  box(sketch, {
    colors: paint("top", "glass", "glassDim"),
    d: 0.22,
    h: 0.14,
    w: 0.45,
    x: -0.28,
    y: 0.12,
    z: -0.11,
  });
  box(
    sketch,
    {
      colors: paint("accentRed", "accentRed", "accentRed"),
      d: 0.08,
      h: 0.12,
      w: 0.08,
      x: -0.12,
      y: 0.26,
      z: -0.04,
    },
    "hair",
  );
  return sketch;
};

/** A delivery drone: a body and four rotors, buzzing between the towers. */
export const drawDrone = (view: Vec3, covers: readonly Vec3[]): Sketch => {
  const sketch = createSketch(view, covers);
  box(
    sketch,
    {
      colors: paint("white", "white", "wallRight"),
      d: 0.14,
      h: 0.06,
      w: 0.14,
      x: -0.07,
      y: 0,
      z: -0.07,
    },
    "hair",
  );
  for (const [x, z] of [
    [-0.12, -0.12],
    [0.12, -0.12],
    [0.12, 0.12],
    [-0.12, 0.12],
  ] satisfies Point2[]) {
    line(
      sketch,
      [
        [0, 0.05, 0],
        [x, 0.07, z],
      ],
      "hair",
    );
    face(
      sketch,
      "metal",
      ellipse(0.06, 0.06, 10).map(([a, b]) => [x + a, 0.075, z + b] satisfies Vec3),
      "hair",
    );
  }
  box(
    sketch,
    {
      colors: paint("roofTerracotta", "roofTerracotta", "roofTerracottaShade"),
      d: 0.08,
      h: 0.07,
      w: 0.08,
      x: -0.04,
      y: -0.09,
      z: -0.04,
    },
    "hair",
  );
  return sketch;
};

/** Santa's sleigh and the witch fly the other way from the blimp, so they show their flank too. */
export const FLYER_HEADING = FLANK_ON + Math.PI;

/** Something a season flies across the sky, on a heading, drawn whole for its view. */
export type Flyer = (heading: number, view: Vec3, covers: readonly Vec3[]) => Sketch;

/** A flyer's frame (nose along +x), scaled up to be seen from the street and turned onto its heading. */
const flying = (heading: number, view: Vec3, covers: readonly Vec3[]) => {
  const turn = headedTo(heading);
  return placed(createSketch(view, covers), ([x, y, z]) => turn([x * 1.6, y * 1.6, z * 1.6]));
};

const DEER = paint("skinDark");

/** Santa in his sleigh with his sack, four reindeer ahead, the lead one's nose red. */
export const drawSleigh: Flyer = (heading, view, covers) => {
  const pen = flying(heading, view, covers);
  for (const z of [-0.13, 0.13]) {
    pen.line(
      [
        [-0.34, 0, z],
        [0.24, 0, z],
        [0.36, 0.05, z],
        [0.38, 0.14, z],
        [0.31, 0.17, z],
      ],
      "bold",
      "gold",
    );
    for (const x of [-0.2, 0.15]) {
      pen.line([
        [x, 0, z],
        [x, 0.07, z],
      ]);
    }
  }
  pen.solid(boxTriangles({ colors: RED, d: 0.28, h: 0.16, w: 0.5, x: -0.3, y: 0.07, z: -0.14 }));
  pen.solid(boxTriangles({ colors: RED, d: 0.28, h: 0.3, w: 0.08, x: -0.32, y: 0.07, z: -0.14 }));
  pen.ball({ colors: paint("hay"), detail: 10, r: 0.11, ry: 0.9, x: -0.2, y: 0.32, z: 0 });
  pen.ball({ colors: RED, detail: 10, r: 0.1, ry: 1.05, x: 0, y: 0.32, z: 0 });
  pen.ball({ colors: paint("skin"), detail: 8, r: 0.068, x: 0.01, y: 0.47, z: 0 });
  pen.ball({ colors: WHITE, detail: 8, r: 0.06, ry: 1.1, x: 0.06, y: 0.42, z: 0 });
  santaHat(wearing(pen, [-0.01, 0.51, 0], 0.2, 0.6));
  for (const [x, lead] of [
    [0.72, false],
    [1.12, true],
  ] as const) {
    for (const z of [-0.1, 0.1]) {
      pen.ball({ colors: DEER, detail: 10, r: 0.075, rx: 1.7, x, y: 0.13, z });
      pen.rod([x + 0.09, 0.15, z], [x + 0.15, 0.21, z], 0.026, DEER);
      pen.ball({ colors: DEER, detail: 8, r: 0.042, rx: 1.3, x: x + 0.17, y: 0.22, z });
      // Mid-gallop: forelegs reaching, hind legs kicked back; antlers up.
      pen.line([
        [x + 0.08, 0.09, z],
        [x + 0.18, 0.03, z],
      ]);
      pen.line([
        [x - 0.08, 0.09, z],
        [x - 0.2, 0.04, z],
      ]);
      pen.line([
        [x + 0.16, 0.25, z],
        [x + 0.13, 0.33, z],
        [x + 0.09, 0.36, z],
      ]);
      pen.line([
        [x + 0.14, 0.3, z],
        [x + 0.2, 0.35, z],
      ]);
      if (lead && z > 0) {
        pen.ball({ colors: RED, detail: 6, r: 0.03, x: x + 0.23, y: 0.215, z });
      }
    }
  }
  for (const z of [-0.1, 0.1]) {
    pen.line(
      [
        [0.24, 0.2, z * 0.6],
        [0.82, 0.17, z],
        [1.22, 0.17, z],
      ],
      "hair",
    );
  }
  return pen.sketch;
};

const ROBE = paint("accentPurple");

/** A witch on her broomstick, her cat riding behind. */
export const drawWitch: Flyer = (heading, view, covers) => {
  const pen = flying(heading, view, covers);
  pen.rod([-0.42, 0, 0], [0.5, 0.04, 0], 0.022, DEER);
  // The bristles flare from the stick's tail.
  pen
    .moved((point) => {
      const [x, y, z] = rotate(point, [0, 0, 0], "z", Math.PI / 2);
      return [x - 0.42, y, z];
    })
    .round({ colors: paint("hay"), h: 0.3, r: 0.035, segments: 10, top: 0.11, x: 0, z: 0 });
  pen
    .moved((point) => rotate(point, [0.02, 0.02, 0], "z", -0.25))
    .round({ colors: ROBE, h: 0.36, r: 0.15, segments: 10, top: 0.05, x: 0.02, y: 0.02, z: 0 });
  pen.ball({ colors: paint("accentGreen"), detail: 8, r: 0.07, x: 0.13, y: 0.44, z: 0 });
  // Her arms reach down to the stick.
  for (const z of [-0.06, 0.06]) {
    pen.rod([0.08, 0.32, z], [0.3, 0.06, z * 0.5], 0.026, ROBE);
  }
  witchHat(wearing(pen, [0.11, 0.5, 0], 0.25, 0.35));
  // The cat, ears up.
  pen.ball({ colors: BLACK, detail: 8, r: 0.05, rx: 1.3, x: -0.27, y: 0.06, z: 0 });
  pen.ball({ colors: BLACK, detail: 8, r: 0.035, x: -0.21, y: 0.12, z: 0 });
  for (const z of [-0.018, 0.018]) {
    pen.round({ colors: BLACK, h: 0.035, r: 0.012, segments: 5, top: 0, x: -0.21, y: 0.145, z });
  }
  return pen.sketch;
};
