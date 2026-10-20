// The blimp over the town: a hull, fins and a gondola, and a banner on the
// flank facing the camera with the site's name, or the season's greeting in
// its colors (`blimp` in DECOR), strung along its back with the season's
// lights and wearing its hat. Drawn once per look and then only moved, so its
// baked outline stays true. Its trims are drawn in its own frame, nose along
// +x, up +y and the banner's flank +z, and turned onto its heading.
import type { Token } from "./palette";
import type { Sketch, Triangle, Vec3 } from "./sketch";
import { heart } from "./draw-kit";
import { paint } from "./palette";
import {
  ballTriangles,
  createSketch,
  extrudeTriangles,
  face,
  line,
  mapTriangles,
  rotate,
  roundTriangles,
  solid,
} from "./sketch";

/** The blimp flies along the screen's width, so it shows its flank. */
export const BLIMP_HEADING = -Math.PI / 4;

const turn = (point: Vec3) => rotate(point, [0, 0, 0], "y", -BLIMP_HEADING);

/** The hull's radius, and its length as a multiple of it. */
const HULL_R = 0.62;
const HULL_RX = 2.6;

/** How high the hull's back is, so far along it. */
const backAt = (x: number) => HULL_R * Math.sqrt(Math.max(0, 1 - (x / (HULL_R * HULL_RX)) ** 2));

/**
 * Where the blimp's shadow starts, by how far along it (nose +x): level along
 * the back, sweeping up over the nose so its cap falls in shadow. Cut clean,
 * triangle by triangle, where shading face by face leaves a ragged patch.
 */
const blimpShadowLine = (x: number) => 0.08 + 0.6 * Math.max(0, x - 0.55) ** 2;

/** Something a season dresses the blimp in, drawn in its frame: `place` turns a point onto its heading. */
export type Trim = (sketch: Sketch, place: (point: Vec3) => Vec3) => void;

/** What the blimp's banner says, the colors of its banner, fins and lettering, and how a season dresses it. */
export interface BlimpLook {
  text: string;
  banner: Token;
  fins: Token;
  lettering: Token;
  /** Bulbs strung along its back, the colors in turn. */
  lights?: readonly Token[];
  /** A hat, or something else it wears. */
  trim?: Trim;
}

/** The site's own blimp, for a day without a season. */
export const PLAIN_BLIMP: BlimpLook = {
  banner: "accentRed",
  fins: "accentRed",
  lettering: "white",
  text: "KYH.IO",
};

const RED = paint("festiveRed", "festiveRed", "festiveRedShade");
const SNOW = paint("white", "white", "whiteShade");
const GOLD = paint("gold", "gold", "goldShade");
const BLACK = paint("screen");

const solidIn = (sketch: Sketch, place: (point: Vec3) => Vec3, triangles: readonly Triangle[]) =>
  solid(sketch, mapTriangles(triangles, place));

/** A bulb on its back every so often from tail to nose, on a wire. */
const backLights = (sketch: Sketch, colors: readonly Token[]) => {
  const bulbs = 15;
  const wire: Vec3[] = [];
  for (let index = 0; index < bulbs; index += 1) {
    const x = -1.3 + (index / (bulbs - 1)) * 2.6;
    const y = backAt(x);
    wire.push([x, y + 0.015, 0]);
    const token = colors[index % colors.length] ?? "gold";
    solidIn(
      sketch,
      turn,
      ballTriangles({ colors: paint(token), detail: 6, r: 0.045, x, y: y + 0.04, z: 0 }),
    );
  }
  line(sketch, wire.map(turn), "hair");
};

/** Where a hat sits on the blimp's brow, sunk a little into it. */
const BROW = 0.5;
const brow: Vec3 = [BROW, backAt(BROW) - 0.06, 0];

/** A hat leaning back by `lean`, about its brim. */
const leaning = (place: (point: Vec3) => Vec3, lean: number) => (point: Vec3) =>
  place(rotate(point, brow, "z", lean));

/** A Santa hat, its white pom-pom at the tip. */
export const santaHat: Trim = (sketch, place) => {
  const lean = 0.5;
  const tilt = leaning(place, lean);
  const [x, y, z] = brow;
  solidIn(
    sketch,
    tilt,
    roundTriangles({ colors: RED, h: 0.62, r: 0.26, segments: 12, top: 0, x, y, z }),
  );
  solidIn(sketch, tilt, roundTriangles({ colors: SNOW, h: 0.1, r: 0.3, segments: 12, x, y, z }));
  const tip = rotate([x, y + 0.62, z], brow, "z", lean);
  solidIn(
    sketch,
    place,
    ballTriangles({ colors: SNOW, detail: 8, r: 0.08, x: tip[0], y: tip[1], z: tip[2] }),
  );
};

/** A witch's hat: a wide brim, a purple band and a crown bent over at the top. */
export const witchHat: Trim = (sketch, place) => {
  const tilt = leaning(place, 0.2);
  const [x, y, z] = brow;
  solidIn(
    sketch,
    tilt,
    roundTriangles({ colors: BLACK, h: 0.03, r: 0.5, segments: 16, x, y: y + 0.04, z }),
  );
  solidIn(
    sketch,
    tilt,
    roundTriangles({ colors: BLACK, h: 0.4, r: 0.24, segments: 12, top: 0.12, x, y, z }),
  );
  solidIn(
    sketch,
    tilt,
    roundTriangles({
      colors: paint("accentPurple"),
      h: 0.08,
      r: 0.235,
      segments: 12,
      top: 0.215,
      x,
      y: y + 0.07,
      z,
    }),
  );
  // The point flops back from the top of the crown.
  const bend: Vec3 = [x, y + 0.4, z];
  const flop = (point: Vec3) => tilt(rotate(point, bend, "z", 0.7));
  solidIn(
    sketch,
    flop,
    roundTriangles({ colors: BLACK, h: 0.34, r: 0.12, segments: 10, top: 0, x, y: y + 0.4, z }),
  );
};

/** A top hat in a crown color, a band, and a gold buckle on the side facing the camera. */
export const topHat =
  (crown: Token, band: Token): Trim =>
  (sketch, place) => {
    const tilt = leaning(place, 0.15);
    const [x, y, z] = brow;
    const colors = paint(crown);
    solidIn(
      sketch,
      tilt,
      roundTriangles({ colors, h: 0.03, r: 0.38, segments: 16, x, y: y + 0.04, z }),
    );
    solidIn(
      sketch,
      tilt,
      roundTriangles({ colors, h: 0.46, r: 0.22, segments: 14, top: 0.25, x, y, z }),
    );
    solidIn(
      sketch,
      tilt,
      roundTriangles({
        colors: paint(band),
        h: 0.09,
        r: 0.228,
        segments: 14,
        top: 0.232,
        x,
        y: y + 0.07,
        z,
      }),
    );
    const front = z + 0.24;
    const middle = y + 0.115;
    const square = (half: number, out: number): Vec3[] => [
      tilt([x - half, middle - half, front + out]),
      tilt([x + half, middle - half, front + out]),
      tilt([x + half, middle + half, front + out]),
      tilt([x - half, middle + half, front + out]),
    ];
    face(sketch, "gold", square(0.06, 0), "hair");
    face(sketch, band, square(0.032, 0.004), null);
  };

/** Bunny ears, white with pink inside, side by side and leaning apart. */
export const bunnyEars: Trim = (sketch, place) => {
  for (const side of [-1, 1]) {
    const x = BROW + side * 0.13;
    const root: Vec3 = [x, backAt(x) - 0.06, 0];
    const lean = (point: Vec3) => place(rotate(point, root, "z", -side * 0.3));
    const y = root[1] + 0.32;
    solidIn(
      sketch,
      lean,
      ballTriangles({ colors: SNOW, detail: 10, r: 0.1, ry: 3.2, rz: 0.45, x, y, z: 0 }),
    );
    solidIn(
      sketch,
      lean,
      ballTriangles({
        colors: paint("accentPink"),
        detail: 8,
        r: 0.055,
        ry: 4.4,
        rz: 0.4,
        x,
        y,
        z: 0.035,
      }),
    );
  }
};

/** A heart standing on its back. */
export const heartCrest: Trim = (sketch, place) => {
  const x = 0.2;
  const size = 0.34;
  solidIn(
    sketch,
    place,
    extrudeTriangles(
      heart(size),
      { origin: [x, backAt(x) + size * 0.85, -0.05], u: [1, 0, 0], v: [0, 1, 0] },
      [0, 0, 0.1],
      RED,
    ),
  );
};

/** Paper lanterns hung under the hull, gold caps and tassels. */
export const lanterns: Trim = (sketch, place) => {
  for (const x of [-0.8, 0.8]) {
    const hook = -backAt(x) + 0.02;
    const y = hook - 0.36;
    line(sketch, [place([x, hook, 0]), place([x, y + 0.11, 0])], "fine");
    solidIn(
      sketch,
      place,
      ballTriangles({ colors: RED, detail: 10, r: 0.13, ry: 0.85, x, y, z: 0 }),
    );
    for (const cap of [y + 0.1, y - 0.13]) {
      solidIn(
        sketch,
        place,
        roundTriangles({ colors: GOLD, h: 0.03, r: 0.06, segments: 8, x, y: cap, z: 0 }),
      );
    }
    line(sketch, [place([x, y - 0.13, 0]), place([x, y - 0.27, 0])], "bold", "festiveRed");
  }
};

export const drawBlimp = (
  { banner, fins, lettering, lights, text, trim }: BlimpLook,
  view: Vec3,
  covers: readonly Vec3[],
): Sketch => {
  const sketch = createSketch(view, covers);
  const hull = ballTriangles({
    colors: paint("white"),
    detail: 28,
    r: HULL_R,
    rx: HULL_RX,
    x: 0,
    y: 0,
    z: 0,
  }).map((triangle) => {
    const x = (triangle.a[0] + triangle.b[0] + triangle.c[0]) / 3;
    const y = (triangle.a[1] + triangle.b[1] + triangle.c[1]) / 3;
    return y < blimpShadowLine(x) ? { ...triangle, colors: paint("whiteShade") } : triangle;
  });
  solid(sketch, mapTriangles(hull, turn), "fine", 70);
  // Tail fins, a gondola, and a banner on the flank facing the camera.
  const fin = (points: Vec3[]) => face(sketch, fins, points.map(turn), "fine");
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
    banner,
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
    token: lettering,
    up: [0, height - 0.08, 0],
  });
  if (lights) {
    backLights(sketch, lights);
  }
  trim?.(sketch, turn);
  return sketch;
};
