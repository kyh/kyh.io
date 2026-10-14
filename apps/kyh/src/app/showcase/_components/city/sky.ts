// What moves over and around the town: a blimp trailing the site's name,
// hot-air balloons, and boats sailing round the island. Each is drawn once
// as a sketch and then only moved, so its baked outline stays true.
import type { Point2, Sketch, Triangle, Vec3 } from "./sketch";
import { paint } from "./palette";
import {
  ballTriangles,
  box,
  createSketch,
  ellipse,
  extrude,
  face,
  line,
  mapTriangles,
  rotate,
  solid,
} from "./sketch";

/** The blimp flies along the screen's width, so it shows its flank. */
export const BLIMP_HEADING = -Math.PI / 4;

const turn = (point: Vec3) => rotate(point, [0, 0, 0], "y", -BLIMP_HEADING);

export const drawBlimp = (text: string, view: Vec3, covers: readonly Vec3[]): Sketch => {
  const sketch = createSketch(view, covers);
  const hull = ballTriangles({
    colors: paint("white", "white", "wallRight"),
    detail: 28,
    r: 0.62,
    rx: 2.6,
    x: 0,
    y: 0,
    z: 0,
  });
  solid(sketch, mapTriangles(hull, turn), "fine", 70);
  // Tail fins, a gondola, and a banner on the flank facing the camera.
  const fin = (points: Vec3[]) => face(sketch, "accentRed", points.map(turn), "fine");
  fin([
    [-1.3, 0.1, 0],
    [-1.75, 0.62, 0],
    [-1.95, 0.62, 0],
    [-1.7, 0.05, 0],
  ]);
  fin([
    [-1.3, -0.05, 0.05],
    [-1.75, -0.05, 0.62],
    [-1.95, -0.05, 0.62],
    [-1.7, -0.05, 0.05],
  ]);
  const gondola = mapTriangles(
    [
      ...ballTriangles({
        colors: paint("roofGray", "roofGray", "roofGrayShade"),
        detail: 10,
        r: 0.13,
        rx: 2.4,
        x: 0,
        y: -0.66,
        z: 0,
      }),
    ],
    turn,
  );
  solid(sketch, gondola, "fine", 70);
  const along = turn([1, 0, 0]);
  const out = turn([0, 0, 1]);
  const width = 2.2;
  const height = 0.46;
  const centre: Vec3 = [out[0] * 0.64, 0, out[2] * 0.64];
  const corner = (u: number, v: number): Vec3 => [
    centre[0] + along[0] * u,
    centre[1] + v,
    centre[2] + along[2] * u,
  ];
  face(
    sketch,
    "accentRed",
    [
      corner(-width / 2, -height / 2),
      corner(width / 2, -height / 2),
      corner(width / 2, height / 2),
      corner(-width / 2, height / 2),
    ],
    "fine",
  );
  sketch.signs.push({
    across: [along[0] * (width - 0.2), 0, along[2] * (width - 0.2)],
    origin: [
      centre[0] - along[0] * (width / 2 - 0.1) + out[0] * 0.012,
      -height / 2 + 0.04,
      centre[2] - along[2] * (width / 2 - 0.1) + out[2] * 0.012,
    ],
    text,
    token: "white",
    up: [0, height - 0.08, 0],
  });
  return sketch;
};

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
