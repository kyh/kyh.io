// Valentine's Day: the days up to the 14th, light and turned pink. A find
// throws candy hearts; the town ties balloons by the doors and in the
// square, keeps its pink roofs pink, puts a heart in the fountain, sends up
// hearts and flies BE MINE.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { ellipse } from "../art";
import { span } from "../calendar";

/** A heart, for a piece or anything else drawn in its 24×24 box. */
export const HEART =
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

export const theme = {
  art: CANDY_HEART,
  confetti: [
    { back: "#ffc2d6", front: "#ff4d8d" },
    { back: "#fda4af", front: "#e11d48" },
    { back: "#ffe4ec", front: "#ffffff" },
  ],
  corners: null,
  days: (year) => span(year, [2, 10], [2, 14]),
  drift: null,
  glyph: HEART,
  hat: null,
  id: "valentines",
  mode: "light",
  name: "Valentine's Day",
  tint: { chroma: 2, hue: 350 },
  trail: true,
} as const satisfies Theme;
