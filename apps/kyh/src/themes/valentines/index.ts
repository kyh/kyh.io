import type { Art } from "../art";
import type { Theme } from "../theme";
import type { Window } from "../calendar";
import { around, dayOf, lunarNewYear, span } from "../calendar";

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
  days: (year) => {
    const days = span(year, [2, 7], [2, 15]);
    const first = lunarNewYear(year);

    if (first === null) {
      return days;
    }

    const [eve, third] = around(first, 1, 2);

    if (third < days[0] || eve > days[1]) {
      return days;
    }

    const clipped: Window =
      dayOf(year, 2, 14) > third
        ? [around(third, 0, 1)[1], days[1]]
        : [days[0], around(eve, 1, 0)[0]];

    return clipped;
  },
  drift: null,
  glyph: HEART,
  id: "valentines",
  mode: "light",
  name: "Valentine's Day",
  tint: { chroma: 2, hue: 350 },
} as const satisfies Theme;
