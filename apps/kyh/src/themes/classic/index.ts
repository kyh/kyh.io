import type { Art } from "../art";
import type { Theme } from "../theme";
import { EGG } from "../art";
import { namedConfetti } from "../theme";

const GOLDEN_EGG = {
  layers: [{ d: EGG, fill: "gold", shade: "goldShade" }],
} satisfies Art;

export const theme = {
  art: GOLDEN_EGG,
  confetti: namedConfetti("gold", "gold", "crimson", "blue", "green", "plum"),
  corners: null,
  drift: null,
  garland: null,
  glyph: null,
  id: "classic",
  mode: null,
  name: "Light / Dark",
  sky: null,
  tint: null,
} as const satisfies Theme;
