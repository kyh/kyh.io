// What the default theme puts on: a find throws golden eggs. Nothing falls
// and nothing hangs in the corners.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { EGG } from "../art";
import { namedConfetti } from "../theme";

/** A golden egg, its shaded side dotted. */
const GOLDEN_EGG = {
  layers: [{ d: EGG, fill: "gold", shade: "goldShade" }],
} satisfies Art;

export const dress = {
  art: GOLDEN_EGG,
  confetti: namedConfetti("gold", "gold", "crimson", "blue", "green", "plum"),
  corners: null,
  drift: null,
} as const satisfies Dress;
