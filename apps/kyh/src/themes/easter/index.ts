// Easter: Good Friday to Easter Monday, light and turned lilac. A find throws
// painted eggs; the town hides pastel eggs by the doors, in the gardens and
// round the pond, keeps its pastel roofs in their colors, stands a giant egg
// in the fountain and flies HAPPY EASTER with bunny ears.
import type { Art } from "../art";
import type { Theme } from "../theme";
import { circle, EGG, GLOSS } from "../art";
import { around, easterSunday } from "../calendar";

const PAINTED_EGG = {
  gradients: {
    body: {
      from: [0, 0],
      kind: "linear",
      stops: [
        [0, "#f6eeff"],
        [1, "#c6a3f0"],
      ],
      to: [0, 1],
    },
  },
  layers: [
    { d: EGG, gradient: "body", shadow: true, stroke: "#9b7cc8", strokeWidth: 0.6 },
    { d: `${circle(9, 8.4, 0.8)}${circle(12, 8, 0.8)}${circle(15, 8.4, 0.8)}`, fill: "#ff8fbb" },
    {
      d: "M5.2 13l1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6 1.7-1.6 1.7 1.6",
      stroke: "#f5c400",
      strokeWidth: 1.2,
    },
    { d: "M5.6 16.6h12.8", stroke: "#4fcf9f", strokeWidth: 1.1 },
    { d: GLOSS, fill: "white", opacity: 0.7 },
  ],
} satisfies Art;

export const theme = {
  art: PAINTED_EGG,
  confetti: [
    { back: "#efe3ff", front: "#c4a1f0" },
    { back: "#d6f7ea", front: "#7fdcb8" },
    { back: "#fff3bf", front: "#ffd84d" },
    { back: "#ffe0ec", front: "#ff9fc3" },
    { back: "#dcefff", front: "#8cc8f5" },
  ],
  // Good Friday to Easter Monday.
  corners: null,
  days: (year) => around(easterSunday(year), 2, 1),
  drift: null,
  glyph: EGG,
  id: "easter",
  mode: "light",
  name: "Easter",
  tint: { chroma: 1.5, hue: 320 },
  trail: true,
} as const satisfies Theme;
