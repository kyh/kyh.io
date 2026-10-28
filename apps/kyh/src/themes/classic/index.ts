// The default theme: plain light or dark, the visitor's own, on any day no
// other theme runs. A find throws golden eggs; the town stays as it is and
// flies the site's own blimp.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { EGG } from "../art";
import { namedConfetti } from "../theme";

/** A golden egg, its shaded side dotted. */
const GOLDEN_EGG = {
  layers: [{ d: EGG, fill: "gold", shade: "goldShade" }],
} satisfies Art;

export const theme = {
  art: GOLDEN_EGG,
  confetti: namedConfetti("gold", "gold", "crimson", "blue", "green", "plum"),
  corners: null,
  drift: null,
  glyph: null,
  id: "classic",
  mode: null,
  name: "Light / Dark",
  tint: null,
  trail: false,
} as const satisfies Theme;
