import type { Art } from "../art";
import type { Theme } from "../theme";
import { span } from "../calendar";

/** A heart, for a piece or anything else drawn in its 24×24 box. */
export const HEART =
  "M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21Z";

const CANDY_HEART = {
  layers: [{ d: HEART, fill: "festiveRed", shade: "festiveRedShade" }],
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
  garland: null,
  glyph: HEART,
  id: "valentines",
  mode: "light",
  name: "Valentine's Day",
  sky: null,
  tint: { chroma: 2, hue: 350 },
} as const satisfies Theme;
