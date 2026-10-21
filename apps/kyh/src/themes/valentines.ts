// Valentine's Day: the days up to the 14th, light and turned pink. A find
// throws candy hearts; the town ties balloons by the doors and in the
// square, keeps its pink roofs pink, puts a heart in the fountain, sends up
// hearts and flies BE MINE.
import { heartCrest } from "@/app/showcase/_components/city/blimp";
import { fountainHeart } from "@/app/showcase/_components/city/decor-giants";
import { balloon } from "@/app/showcase/_components/city/decor-props";
import { paint, RED, WHITE } from "@/app/showcase/_components/city/palette";
import type { Token } from "@/app/showcase/_components/city/palette";
import type { Art } from "./art";
import type { Theme } from "./theme";
import { ellipse } from "./art";
import { span } from "./calendar";

/** A heart, for a piece or anything else drawn in its 24×24 box. */
const HEART =
  "M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21Z";

const CANDY_HEART = {
  gradients: {
    body: {
      at: [0.35, 0.3],
      kind: "radial",
      r: 0.8,
      stops: [
        [0, "#ffd6e2"],
        [0.4, "#ff5c8a"],
        [1, "#c2185b"],
      ],
    },
  },
  layers: [
    { d: HEART, gradient: "body", shadow: true, stroke: "#9c1048", strokeWidth: 0.6 },
    { d: ellipse(7.9, 9.6, 1.3, 2.1, -30), fill: "white", opacity: 0.8 },
  ],
} satisfies Art;

const PINK = paint("accentPink");

export const theme = {
  art: CANDY_HEART,
  confetti: [
    { back: "#ffc2d6", front: "#ff4d8d" },
    { back: "#fda4af", front: "#e11d48" },
    { back: "#ffe4ec", front: "#ffffff" },
  ],
  days: (year) => span(year, [2, 10], [2, 14]),
  drift: null,
  glyph: HEART,
  id: "valentines",
  mode: "light",
  name: "Valentine's Day",
  tint: { chroma: 2, hue: 350 },
  town: {
    blimp: {
      banner: "accentPink",
      fins: "festiveRed",
      lettering: "white",
      text: "BE MINE",
      trim: heartCrest,
    },
    centerpiece: fountainHeart,
    emote: { d: HEART, fill: "#ff4f7b" },
    lights: ["festiveRed", "accentPink", "white"],
    porch: (sketch, x, z, random) => {
      if (random.chance(0.6)) {
        balloon(sketch, x, z, 0.3, random.pick([RED, PINK]));
      }
    },
    square: (sketch, x, z, random) => {
      for (const [dx, dz, height] of [
        [0, 0, 0.55],
        [0.06, 0.04, 0.45],
        [-0.05, 0.05, 0.5],
        [0.03, -0.06, 0.4],
        [-0.04, -0.03, 0.62],
      ] as const) {
        balloon(sketch, x + dx, z + dz, height, random.pick([RED, PINK, WHITE]));
      }
    },
    vivid: new Set<Token>(["roofPink", "roofPinkShade"]),
  },
} as const satisfies Theme;
