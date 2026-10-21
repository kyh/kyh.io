// The blimp over the town: a hull, fins and a gondola, and a banner on the
// flank facing the camera with the site's name, or the theme's greeting in
// its colors (`blimp` in its theme's town), strung along its back with the theme's
// lights and wearing its hat. Drawn once per look and then only moved, so its
// baked outline stays true. Its trims are drawn in its own frame, nose along
// +x, up +y and the banner's flank +z, and turned onto its heading.
import type { Token } from "./palette";
import type { Placed, Sketch, Vec3 } from "./sketch";
import { lantern } from "./decor-props";
import { heart } from "./draw-kit";
import { santaHat, topHat, wearing, witchHat } from "./hats";
import { paint, RED, WHITE } from "./palette";
import { ballTriangles, createSketch, extrudeTriangles, face, headedTo, placed } from "./sketch";

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

/** Something a theme dresses the blimp in, drawn in its frame. */
type Trim = (blimp: Placed) => void;

/** What the blimp's banner says, the colors of its banner, fins and lettering, and what else it wears. */
export interface BlimpLook {
  text: string;
  banner: Token;
  fins: Token;
  lettering: Token;
  /** A hat, or something else it wears. */
  trim?: Trim;
}

/** The site's own blimp, for a day without a theme. */
export const PLAIN_BLIMP: BlimpLook = {
  banner: "accentRed",
  fins: "accentRed",
  lettering: "white",
  text: "KYH.IO",
};

/** A bulb on its back every so often from tail to nose, on a wire. */
const backLights = (blimp: Placed, colors: readonly Token[]) => {
  const bulbs = 15;
  const wire: Vec3[] = [];
  for (let index = 0; index < bulbs; index += 1) {
    const x = -1.3 + (index / (bulbs - 1)) * 2.6;
    const y = backAt(x);
    wire.push([x, y + 0.015, 0]);
    const token = colors[index % colors.length] ?? "gold";
    blimp.ball({ colors: paint(token), detail: 6, r: 0.045, x, y: y + 0.04, z: 0 });
  }
  blimp.line(wire, "hair");
};

/** Where a hat sits on the blimp's brow, sunk a little into it. */
const BROW = 0.5;
const brow: Vec3 = [BROW, backAt(BROW) - 0.06, 0];

export const santaTrim: Trim = (blimp) => santaHat(wearing(blimp, brow, 1, 0.5));

export const witchTrim: Trim = (blimp) => witchHat(wearing(blimp, brow, 1, 0.2));

/** A top hat in a crown color and a band, its gold buckle facing the camera. */
export const topHatTrim =
  (crown: Token, band: Token): Trim =>
  (blimp) =>
    topHat(wearing(blimp, brow, 1, 0.15), crown, band);

/** Bunny ears, white with pink inside, side by side and leaning apart. */
export const bunnyEars: Trim = (blimp) => {
  for (const side of [-1, 1]) {
    const x = BROW + side * 0.13;
    // Each ear stands like a hat of its own, leaning out.
    const ear = wearing(blimp, [x, backAt(x) - 0.06, 0], 1, -side * 0.3);
    ear.ball({ colors: WHITE, detail: 10, r: 0.1, ry: 3.2, rz: 0.45, x: 0, y: 0.32, z: 0 });
    ear.ball({
      colors: paint("accentPink"),
      detail: 8,
      r: 0.055,
      ry: 4.4,
      rz: 0.4,
      x: 0,
      y: 0.32,
      z: 0.035,
    });
  }
};

/** A heart standing on its back. */
export const heartCrest: Trim = (blimp) => {
  const x = 0.2;
  const size = 0.34;
  blimp.solid(
    extrudeTriangles(
      heart(size),
      { origin: [x, backAt(x) + size * 0.85, -0.05], u: [1, 0, 0], v: [0, 1, 0] },
      [0, 0, 0.1],
      RED,
    ),
  );
};

/** Paper lanterns hung under the hull. */
export const lanterns: Trim = (blimp) => {
  for (const x of [-0.8, 0.8]) {
    const hook = -backAt(x) + 0.02;
    const y = hook - 0.36;
    blimp.line([
      [x, hook, 0],
      [x, y + 0.11, 0],
    ]);
    lantern(blimp, [x, y, 0], 2.6);
  }
};

/** How the blimp's drawn: its look, the theme's lights along its back, and its heading. */
export interface BlimpDress {
  look: BlimpLook;
  lights?: readonly Token[];
  heading: number;
}

export const drawBlimp = (
  { heading, lights, look }: BlimpDress,
  view: Vec3,
  covers: readonly Vec3[],
): Sketch => {
  const { banner, fins, lettering, text, trim } = look;
  const blimp = placed(createSketch(view, covers), headedTo(heading));
  const { place, sketch } = blimp;
  blimp.solid(
    ballTriangles({
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
    }),
    "fine",
    70,
  );
  // Tail fins, a gondola, and a banner on the flank facing the camera.
  const fin = (points: Vec3[]) => face(sketch, fins, points.map(place), "fine");
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
  blimp.ball({
    colors: paint("roofGray", "roofGray", "roofGrayShade"),
    detail: 10,
    r: 0.13,
    rx: 2.4,
    x: 0,
    y: -0.66,
    z: 0,
  });
  const width = 2.2;
  const height = 0.46;
  const out = 0.64;
  face(
    sketch,
    banner,
    [
      place([-width / 2, -height / 2, out]),
      place([width / 2, -height / 2, out]),
      place([width / 2, height / 2, out]),
      place([-width / 2, height / 2, out]),
    ],
    "fine",
  );
  sketch.signs.push({
    across: place([width - 0.2, 0, 0]),
    origin: place([-(width / 2 - 0.1), -height / 2 + 0.04, out + 0.012]),
    text,
    token: lettering,
    up: [0, height - 0.08, 0],
  });
  if (lights) {
    backLights(blimp, lights);
  }
  trim?.(blimp);
  return sketch;
};
