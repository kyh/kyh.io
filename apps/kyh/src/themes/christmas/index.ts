import type { Art } from "../art";
import type { Theme } from "../theme";
import { circle, point } from "../art";
import { span } from "../calendar";
import { namedConfetti } from "../theme";

const snowflake = (
  branches: readonly (readonly [reach: number, length: number, spread: number])[],
) =>
  Array.from({ length: 6 }, (_, arm) => {
    const angle = ((arm * 60 - 90) * Math.PI) / 180;

    const out = (x: number, y: number, reach: number, turn = 0) =>
      [x + reach * Math.cos(angle + turn), y + reach * Math.sin(angle + turn)] as const;

    const pairs = branches.map(([reach, length, spread]) => {
      const [x, y] = out(12, 12, reach);

      return `M${point(...out(x, y, length, -spread))}L${point(x, y)}L${point(...out(x, y, length, spread))}`;
    });

    return `M12 12L${point(...out(12, 12, 9.5))}${pairs.join("")}`;
  }).join("");

const SNOWFLAKE_PATH = snowflake([
  [6.4, 2.8, 0.75],
  [3.6, 1.8, 0.75],
]);

const SNOWFLAKE = {
  layers: [
    { d: SNOWFLAKE_PATH, strokeWidth: 2.6 },
    { d: SNOWFLAKE_PATH, stroke: "white", strokeWidth: 1.4 },
    { d: circle(12, 12, 1.4), fill: "white", shade: "whiteShade" },
  ],
} satisfies Art;

const SNOWFLAKE_GLYPH = snowflake([[6, 2.6, 0.8]]);

export const theme = {
  art: SNOWFLAKE,
  confetti: [
    { back: "#fca5a5", front: "#dc2626" },
    { back: "#86efac", front: "#15803d" },
    { back: "#e0f2fe", front: "#ffffff" },
    ...namedConfetti("gold"),
  ],
  corners: null,
  days: (year) => span(year, [12, 5], [12, 31]),
  drift: { kind: "snow", pieces: [SNOWFLAKE] },
  glyph: SNOWFLAKE_GLYPH,
  id: "christmas",
  mode: "dark",
  name: "Christmas",
  tint: { chroma: 2, hue: 165 },
} as const satisfies Theme;
