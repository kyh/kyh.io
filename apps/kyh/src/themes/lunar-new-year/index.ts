// Lunar New Year: New Year's Eve and the week after, dark and turned red. A
// find throws red lanterns (`dress.ts`); the town hangs lanterns by the doors
// and the pond, lights its windows red after dark, raises a lantern gate in
// the square and flies HAPPY NEW YEAR.
import type { Theme } from "../theme";
import { ellipse } from "../art";
import { around, lunarNewYear } from "../calendar";

/** The lantern: hung from a hook, a rib down its middle, a tassel below. */
const LANTERN_GLYPH = `M12 2v3.6${ellipse(12, 12, 8.4, 6.4)}${ellipse(12, 12, 3.2, 6.4)}M12 18.4V22`;

export const theme = {
  // New Year's Eve and the week after it.
  days: (year) => {
    const first = lunarNewYear(year);
    return first === null ? null : around(first, 1, 6);
  },
  glyph: LANTERN_GLYPH,
  id: "lunarNewYear",
  mode: "dark",
  name: "Lunar New Year",
  tint: { chroma: 2.5, hue: 25 },
} as const satisfies Theme;
