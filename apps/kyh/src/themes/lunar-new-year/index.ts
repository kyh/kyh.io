// Lunar New Year: New Year's Eve and the week after, dark and turned red. A
// find throws red lanterns; the town hangs lanterns by the doors and the
// pond, lights its windows red after dark, raises a lantern gate in the
// square and flies HAPPY NEW YEAR.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { ellipse } from "../art";
import { around, lunarNewYear } from "../calendar";
import { namedConfetti } from "../theme";

const LANTERN_GOLD = "#f5c04a";
const LANTERN_GOLD_EDGE = "#a8741a";

const LANTERN = {
  gradients: {
    body: {
      at: [0.4, 0.35],
      kind: "radial",
      r: 0.75,
      stops: [
        [0, "#ffd27a"],
        [0.3, "#ff4a3d"],
        [1, "#a3121b"],
      ],
    },
  },
  layers: [
    { d: "M12 1.8v3.6", stroke: LANTERN_GOLD_EDGE, strokeWidth: 1 },
    {
      d: ellipse(12, 12.6, 7.4, 6),
      gradient: "body",
      shadow: true,
      stroke: "#7a0d14",
      strokeWidth: 0.6,
    },
    {
      d: "M12 6.7v11.8M8.4 7.6c-1.7 3-1.7 7.8 0 10M15.6 7.6c1.7 3 1.7 7.8 0 10",
      opacity: 0.7,
      stroke: "#8f1018",
      strokeWidth: 0.5,
    },
    {
      d: "M9.2 5.2h5.6a.8.8 0 0 1 .8.8v1.2H8.4V6a.8.8 0 0 1 .8-.8ZM8.4 18h7.2v1.2a.8.8 0 0 1-.8.8H9.2a.8.8 0 0 1-.8-.8Z",
      fill: LANTERN_GOLD,
      stroke: LANTERN_GOLD_EDGE,
      strokeWidth: 0.4,
    },
    { d: "M12 20v3M10.8 20.2l-.4 2.4M13.2 20.2l.4 2.4", stroke: "#e2362b", strokeWidth: 0.9 },
  ],
} satisfies Art;

/** The lantern: hung from a hook, a rib down its middle, a tassel below. */
const LANTERN_GLYPH = `M12 2v3.6${ellipse(12, 12, 8.4, 6.4)}${ellipse(12, 12, 3.2, 6.4)}M12 18.4V22`;

export const theme = {
  art: LANTERN,
  confetti: [
    { back: "#ff8a80", front: "#e11d2e" },
    { back: "#ff8a80", front: "#e11d2e" },
    ...namedConfetti("gold", "gold"),
  ],
  // New Year's Eve and the week after it.
  corners: null,
  days: (year) => {
    const first = lunarNewYear(year);
    return first === null ? null : around(first, 1, 6);
  },
  drift: null,
  glyph: LANTERN_GLYPH,
  hat: null,
  id: "lunarNewYear",
  mode: "dark",
  name: "Lunar New Year",
  tint: { chroma: 2.5, hue: 25 },
  trail: true,
} as const satisfies Theme;
