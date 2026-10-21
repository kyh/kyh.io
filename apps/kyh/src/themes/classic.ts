// The default theme: plain light or dark, the visitor's own, on any day no
// other theme runs. A find throws golden eggs; the town stays as it is and
// flies the site's own blimp.
import { GOLD } from "@/lib/color";
import type { Art } from "./art";
import type { Theme } from "./theme";
import { EGG, GLOSS } from "./art";
import { namedConfetti } from "./theme";

/** The shadowed side of a golden egg. */
const DEEP_GOLD = "hsl(34, 90%, 30%)";

const GOLDEN_EGG = {
  gradients: {
    body: {
      at: [0.38, 0.34],
      kind: "radial",
      r: 0.75,
      stops: [
        [0, "#fffbe8"],
        [0.3, GOLD.hue],
        [0.75, GOLD.color],
        [1, DEEP_GOLD],
      ],
    },
    // Light bounced back up into the shadowed underside.
    rim: {
      at: [0.6, 1.05],
      kind: "radial",
      r: 0.45,
      stops: [
        [0, GOLD.hue, 0.55],
        [1, GOLD.hue, 0],
      ],
    },
  },
  layers: [
    { d: EGG, gradient: "body", shadow: true, stroke: DEEP_GOLD, strokeWidth: 0.75 },
    { d: EGG, gradient: "rim" },
    { d: GLOSS, fill: "white", opacity: 0.85 },
  ],
} satisfies Art;

export const theme = {
  art: GOLDEN_EGG,
  confetti: namedConfetti("gold", "gold", "crimson", "blue", "green", "plum"),
  drift: null,
  glyph: null,
  id: "classic",
  mode: null,
  name: "Light / Dark",
  tint: null,
  town: {},
} as const satisfies Theme;
