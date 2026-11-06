// Christmas: the 15th to the 26th of December, dark and turned pine, with
// snow drifting down every page (`dress.ts`). A find throws snowflakes; the
// town lies under snow, puts trees by the doors and snowmen in the gardens,
// raises its tree in the square, flies HO HO HO in Santa's hat and sends his
// sleigh across the sky.
import type { Theme } from "../theme";
import { point } from "../art";
import { span } from "../calendar";

/** Six arms out from the middle, each with a pair of branches at every `[how far out, how long, how wide (radians)]`. */
export const snowflake = (
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

/** A pair of branches on each arm. */
const SNOWFLAKE_GLYPH = snowflake([[6, 2.6, 0.8]]);

export const theme = {
  days: (year) => span(year, [12, 15], [12, 26]),
  glyph: SNOWFLAKE_GLYPH,
  id: "christmas",
  mode: "dark",
  name: "Christmas",
  tint: { chroma: 2, hue: 165 },
} as const satisfies Theme;
