// Hats for whatever in the sky wears one: the blimp in a season's, Santa and
// the witch in their own. Each is drawn in a frame of its own, the brim's
// middle at the origin and the crown up +y, which `wearing` stands on a point
// of its wearer, sized and leaning back. Pure.
import type { Token } from "./palette";
import type { Placed, Vec3 } from "./sketch";
import { BLACK, paint, RED, WHITE } from "./palette";
import { face, rotate } from "./sketch";

/** A hat's frame, its brim on `base`, scaled by `size` and leaning back (toward -x) by `lean`. */
export const wearing = (pen: Placed, base: Vec3, size: number, lean: number) =>
  pen.moved(([x, y, z]) => {
    const [u, v, w] = rotate([x * size, y * size, z * size], [0, 0, 0], "z", lean);
    return [base[0] + u, base[1] + v, base[2] + w];
  });

/** A Santa hat: a red cone on a white brim, a pom-pom at the tip. */
export const santaHat = (hat: Placed) => {
  hat.round({ colors: RED, h: 0.62, r: 0.26, segments: 12, top: 0, x: 0, z: 0 });
  hat.round({ colors: WHITE, h: 0.1, r: 0.3, segments: 12, x: 0, z: 0 });
  hat.ball({ colors: WHITE, detail: 8, r: 0.08, x: 0, y: 0.62, z: 0 });
};

/** A witch's hat: a wide brim, a purple band and a crown bent over at the top. */
export const witchHat = (hat: Placed) => {
  hat.round({ colors: BLACK, h: 0.03, r: 0.5, segments: 16, x: 0, y: 0.04, z: 0 });
  hat.round({ colors: BLACK, h: 0.4, r: 0.24, segments: 12, top: 0.12, x: 0, z: 0 });
  hat.round({
    colors: paint("accentPurple"),
    h: 0.08,
    r: 0.235,
    segments: 12,
    top: 0.215,
    x: 0,
    y: 0.07,
    z: 0,
  });
  // The point flops back from the top of the crown.
  hat
    .moved((point) => rotate(point, [0, 0.4, 0], "z", 0.7))
    .round({ colors: BLACK, h: 0.34, r: 0.12, segments: 10, top: 0, x: 0, y: 0.4, z: 0 });
};

/** A top hat in a crown color and a band, a gold buckle on the side toward +z. */
export const topHat = (hat: Placed, crown: Token, band: Token) => {
  const colors = paint(crown);
  hat.round({ colors, h: 0.03, r: 0.38, segments: 16, x: 0, y: 0.04, z: 0 });
  hat.round({ colors, h: 0.46, r: 0.22, segments: 14, top: 0.25, x: 0, z: 0 });
  hat.round({
    colors: paint(band),
    h: 0.09,
    r: 0.228,
    segments: 14,
    top: 0.232,
    x: 0,
    y: 0.07,
    z: 0,
  });
  const square = (half: number, out: number) => {
    const at = (u: number, v: number) => hat.place([u, 0.115 + v, 0.24 + out]);
    return [at(-half, -half), at(half, -half), at(half, half), at(-half, half)];
  };
  face(hat.sketch, "gold", square(0.06, 0), "hair");
  face(hat.sketch, band, square(0.032, 0.004), null);
};
