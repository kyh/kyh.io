// St. Patrick's Day: the 14th to the 17th of March, light and turned green.
// A find throws shamrocks; the town greens its lawns, leaves pots of gold by
// some doors and under a rainbow in the square, raises a shamrock in the
// fountain and flies LUCKY under a top hat.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { placed } from "../art";
import { span } from "../calendar";
import { namedConfetti } from "../theme";

// One leaf of three, a heart with its tip at the stem, about the origin.
const LEAF: readonly (readonly [number, number])[] = [
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
const SHAMROCK_CENTER = [12, 10.6] as const;

const SHAMROCK = {
  gradients: {
    body: {
      at: [0.4, 0.3],
      kind: "radial",
      r: 0.8,
      stops: [
        [0, "#c4f7b4"],
        [0.45, "#3fae4a"],
        [1, "#1d6b2a"],
      ],
    },
  },
  layers: [
    { d: "M12 11c.4 3.4 1.6 6.4 3.6 8.6", shadow: true, stroke: "#1f6b2c", strokeWidth: 1.5 },
    {
      // Up, then down to either side.
      d: [180, -60, 60].map((angle) => placed(LEAF, SHAMROCK_CENTER, angle)).join(""),
      gradient: "body",
      shadow: true,
      stroke: "#155a22",
      strokeWidth: 0.6,
    },
  ],
} satisfies Art;

/** The shamrock: three leaves, a size up from the piece's, on a curling stem. */
const GLYPH_LEAF = LEAF.map(([x, y]) => [x * 1.3, y * 1.3] as const);
const SHAMROCK_GLYPH = `${[180, -60, 60].map((angle) => placed(GLYPH_LEAF, [12, 10], angle)).join("")}M12 10.6c.4 4 1.8 7.4 4 10`;

export const theme = {
  art: SHAMROCK,
  confetti: [{ back: "#86efac", front: "#15803d" }, ...namedConfetti("green", "green", "gold")],
  corners: null,
  days: (year) => span(year, [3, 14], [3, 17]),
  drift: null,
  glyph: SHAMROCK_GLYPH,
  id: "stPatricks",
  mode: "light",
  name: "St. Patrick's Day",
  tint: { chroma: 2, hue: 140 },
  trail: true,
} as const satisfies Theme;
