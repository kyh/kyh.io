// Thanksgiving: the week round the fourth Thursday of November, light and
// turned amber, with leaves tumbling down every page. A find throws maple
// leaves; the town turns its trees, puts out pumpkins and hay bales, stands
// a turkey in the fountain and flies GIVE THANKS under a top hat.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { around, nthWeekday } from "../calendar";
import { namedConfetti } from "../theme";

/** The maple leaf's outline, for its piece and its glyph alike. */
const MAPLE_OUTLINE =
  "M12 2l1.6 4.2 2.8-1.4-.6 4.2 4-1.4-1.2 3.2 3.4 1.6-4.4 2 .8 2.2-5.2-1-.4 2.8h-1.6l-.4-2.8-5.2 1 .8-2.2-4.4-2 3.4-1.6-1.2-3.2 4 1.4-.6-4.2 2.8 1.4Z";

const MAPLE_LEAF = {
  layers: [
    { d: "M12 14v8", strokeWidth: 1.9 },
    { d: "M12 14v8", stroke: "pumpkinShade", strokeWidth: 0.8 },
    { d: MAPLE_OUTLINE, fill: "pumpkin", shade: "pumpkinShade" },
    { d: "M12 15.6V5.5M12 13.4l5.4-2.6M12 13.4 6.6 10.8", strokeWidth: 0.4 },
  ],
} satisfies Art;

const MAPLE_GLYPH = `${MAPLE_OUTLINE}M12 16.6V22`;

export const theme = {
  art: MAPLE_LEAF,
  confetti: [
    { back: "#fcd34d", front: "#b45309" },
    { back: "#fca5a5", front: "#991b1b" },
    ...namedConfetti("orange", "gold"),
  ],
  // Thanksgiving week, Monday to Sunday.
  corners: null,
  days: (year) => around(nthWeekday(year, 11, 4, 4), 3, 3),
  drift: "leaves",
  glyph: MAPLE_GLYPH,
  id: "thanksgiving",
  mode: "light",
  name: "Thanksgiving",
  tint: { chroma: 2, hue: 60 },
  trail: "pieces",
} as const satisfies Theme;
