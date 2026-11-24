import type { Art } from "../art";
import type { Theme } from "../theme";
import { placed } from "../art";
import { span } from "../calendar";
import { namedConfetti } from "../theme";

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

const SHAMROCK_STEM = "M12 11c.4 3.4 1.6 6.4 3.6 8.6";

const SHAMROCK = {
  layers: [
    { d: SHAMROCK_STEM, strokeWidth: 2.3 },
    { d: SHAMROCK_STEM, stroke: "festiveGreen", strokeWidth: 1.1 },
    {
      d: [180, -60, 60].map((angle) => placed(LEAF, SHAMROCK_CENTER, angle)).join(""),
      fill: "festiveGreen",
      shade: "festiveGreenShade",
    },
  ],
} satisfies Art;

const GLYPH_LEAF = LEAF.map(([x, y]) => [x * 1.3, y * 1.3] as const);
const SHAMROCK_GLYPH = `${[180, -60, 60].map((angle) => placed(GLYPH_LEAF, [12, 10], angle)).join("")}M12 10.6c.4 4 1.8 7.4 4 10`;

export const theme = {
  art: SHAMROCK,
  confetti: [{ back: "#86efac", front: "#15803d" }, ...namedConfetti("green", "green", "gold")],
  corners: null,
  days: (year) => span(year, [3, 10], [3, 19]),
  drift: null,
  garland: null,
  glyph: SHAMROCK_GLYPH,
  id: "stPatricks",
  mode: "light",
  name: "St. Patrick's Day",
  sky: null,
  tint: { chroma: 2, hue: 140 },
} as const satisfies Theme;
