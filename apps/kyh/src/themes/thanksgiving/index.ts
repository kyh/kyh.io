// Thanksgiving: the week round the fourth Thursday of November, light and
// turned amber, with maple, oak and birch leaves fluttering and tumbling
// down every page (`dress.ts`). A find throws maple leaves, a turkey struts
// after the mouse (`follower.tsx`); the town turns its trees, puts out
// pumpkins and hay bales, stands a turkey in the fountain and flies GIVE
// THANKS under a top hat.
import type { Theme } from "../theme";
import { around, nthWeekday } from "../calendar";

/** The maple leaf's outline, for its pieces and its glyph alike. */
export const MAPLE_OUTLINE =
  "M12 2l1.6 4.2 2.8-1.4-.6 4.2 4-1.4-1.2 3.2 3.4 1.6-4.4 2 .8 2.2-5.2-1-.4 2.8h-1.6l-.4-2.8-5.2 1 .8-2.2-4.4-2 3.4-1.6-1.2-3.2 4 1.4-.6-4.2 2.8 1.4Z";

const MAPLE_GLYPH = `${MAPLE_OUTLINE}M12 16.6V22`;

export const theme = {
  // Thanksgiving week, Monday to Sunday.
  days: (year) => around(nthWeekday(year, 11, 4, 4), 3, 3),
  glyph: MAPLE_GLYPH,
  id: "thanksgiving",
  mode: "light",
  name: "Thanksgiving",
  tint: { chroma: 2, hue: 60 },
} as const satisfies Theme;
