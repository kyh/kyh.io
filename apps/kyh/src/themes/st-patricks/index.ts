// St. Patrick's Day: the 14th to the 17th of March, light and turned green.
// A find throws shamrocks (`dress.ts`); the town greens its lawns, leaves pots
// of gold by some doors and under a rainbow in the square, raises a shamrock
// in the fountain and flies LUCKY under a top hat.
import type { Theme } from "../theme";
import { placed } from "../art";
import { span } from "../calendar";

/** One leaf of three, a heart with its tip at the stem, about the origin. */
export const LEAF: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1.3, 1.3],
  [-4, 2.4],
  [-4, 4.9],
  [-4, 6.9],
  [-1.8, 7.8],
  [0, 6.2],
  [1.8, 7.8],
  [4, 6.9],
  [4, 4.9],
  [4, 2.4],
  [1.3, 1.3],
  [0, 0],
];

/** The shamrock: three leaves, a size up from the piece's, on a curling stem. */
const GLYPH_LEAF = LEAF.map(([x, y]) => [x * 1.3, y * 1.3] as const);
const SHAMROCK_GLYPH = `${[180, -60, 60].map((angle) => placed(GLYPH_LEAF, [12, 10], angle)).join("")}M12 10.6c.4 4 1.8 7.4 4 10`;

export const theme = {
  days: (year) => span(year, [3, 14], [3, 17]),
  glyph: SHAMROCK_GLYPH,
  id: "stPatricks",
  mode: "light",
  name: "St. Patrick's Day",
  tint: { chroma: 2, hue: 140 },
} as const satisfies Theme;
