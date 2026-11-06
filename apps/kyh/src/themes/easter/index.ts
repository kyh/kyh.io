// Easter: Good Friday to Easter Monday, light and turned lilac. A find throws
// painted eggs (`dress.ts`); the town hides pastel eggs by the doors, in the
// gardens and round the pond, keeps its pastel roofs in their colors, stands a
// giant egg in the fountain and flies HAPPY EASTER with bunny ears.
import type { Theme } from "../theme";
import { EGG } from "../art";
import { around, easterSunday } from "../calendar";

export const theme = {
  // Good Friday to Easter Monday.
  days: (year) => around(easterSunday(year), 2, 1),
  glyph: EGG,
  id: "easter",
  mode: "light",
  name: "Easter",
  tint: { chroma: 1.5, hue: 320 },
} as const satisfies Theme;
