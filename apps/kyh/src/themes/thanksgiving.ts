// Thanksgiving: the week round the fourth Thursday of November, light and
// turned amber, with leaves tumbling down every page. A find throws maple
// leaves; the town turns its trees, puts out pumpkins and hay bales, stands
// a turkey in the fountain and flies GIVE THANKS under a top hat.
import { topHatTrim } from "@/app/showcase/_components/city/blimp";
import { giantTurkey } from "@/app/showcase/_components/city/decor-giants";
import { cornShock, GROUND, hayBale, pumpkin } from "@/app/showcase/_components/city/decor-props";
import type { Art } from "./art";
import type { Theme } from "./theme";
import { around, nthWeekday } from "./calendar";
import { namedConfetti } from "./theme";

/** The maple leaf's outline, for its piece and its glyph alike. */
const MAPLE_OUTLINE =
  "M12 2l1.6 4.2 2.8-1.4-.6 4.2 4-1.4-1.2 3.2 3.4 1.6-4.4 2 .8 2.2-5.2-1-.4 2.8h-1.6l-.4-2.8-5.2 1 .8-2.2-4.4-2 3.4-1.6-1.2-3.2 4 1.4-.6-4.2 2.8 1.4Z";

const MAPLE_LEAF = {
  gradients: {
    body: {
      from: [0, 0],
      kind: "linear",
      stops: [
        [0, "#ffb347"],
        [0.55, "#e8590c"],
        [1, "#a61e0d"],
      ],
      to: [1, 1],
    },
  },
  layers: [
    { d: "M12 14v8", stroke: "#7a3b12", strokeWidth: 1.1 },
    {
      d: MAPLE_OUTLINE,
      gradient: "body",
      shadow: true,
      stroke: "#7a2a0a",
      strokeWidth: 0.5,
    },
    {
      d: "M12 15.6V5.5M12 13.4l5.4-2.6M12 13.4 6.6 10.8",
      opacity: 0.55,
      stroke: "#7a2a0a",
      strokeWidth: 0.5,
    },
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
  days: (year) => around(nthWeekday(year, 11, 4, 4), 3, 3),
  drift: "leaves",
  glyph: MAPLE_GLYPH,
  id: "thanksgiving",
  mode: "light",
  name: "Thanksgiving",
  tint: { chroma: 2, hue: 60 },
  town: {
    blimp: {
      banner: "pumpkin",
      fins: "festiveRed",
      lettering: "white",
      text: "GIVE THANKS",
      trim: topHatTrim("screen", "screen"),
    },
    centerpiece: giantTurkey,
    lights: ["pumpkin", "gold", "festiveRed"],
    porch: (sketch, x, z) => {
      pumpkin(sketch, x, z);
      pumpkin(sketch, x - 0.09, z + 0.05, 0.6);
    },
    // The trees turned: maples orange and red, pines left green.
    repaint: {
      hedge: { day: "#e3b35c", night: "#7a5a24" },
      tree: { day: "#f0a85a", night: "#9a5522" },
      treeShade: { day: "#dd7f3c", night: "#7e3f18" },
    },
    shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
    square: (sketch, x, z) => {
      hayBale(sketch, x - 0.12, z);
      hayBale(sketch, x + 0.12, z);
      hayBale(sketch, x, z, GROUND + 0.1);
      cornShock(sketch, x + 0.3, z - 0.1);
      pumpkin(sketch, x - 0.05, z + 0.17, 1.1);
    },
    yard: (sketch, x, z) => {
      hayBale(sketch, x, z);
      pumpkin(sketch, x + 0.02, z + 0.12, 0.8);
    },
  },
} as const satisfies Theme;
