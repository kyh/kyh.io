// Hats for the logo's corner, the blimp's (city/hats.ts) drawn flat: each a
// piece in the 24×24 box, its brim's middle at (12, 19), which `hat.tsx`
// tilts onto the logo. Pure.
import type { Art } from "./art";
import { circle, ellipse } from "./art";

const WITCH_BLACK = "hsl(270, 30%, 9%)";
/** A faint moonlit edge, so the hat still shows against the night. */
const MOONLIT = "hsl(270 45% 78% / 0.7)";

/** A witch's hat: a wide brim, a purple band and a crown bent over at the top. */
export const WITCH_HAT = {
  layers: [
    { d: ellipse(12, 19, 10.6, 2.4), fill: WITCH_BLACK, stroke: MOONLIT, strokeWidth: 0.5 },
    {
      d: "M7.2 18.8C8.6 14.2 9.6 10.4 11 7.6 12.2 5.2 14.8 3.6 18.2 4.4 15.6 5.2 14 6.8 13.6 9 14.4 12.4 15.4 15.6 16.8 18.8Z",
      fill: WITCH_BLACK,
      stroke: MOONLIT,
      strokeWidth: 0.5,
    },
    {
      d: "M7.9 16.4C10.6 17.2 13.4 17.2 16.1 16.4L16.6 18.2C13.6 19 10.4 19 7.4 18.2Z",
      fill: "#8b5cf6",
    },
    { d: "M10.9 16.7h2.2v1.9h-2.2Z", stroke: "#f5c04a", strokeWidth: 0.6 },
  ],
} satisfies Art;

/** A Santa hat: a red cone flopping over, a white brim and a pom-pom at the tip. */
export const SANTA_HAT = {
  gradients: {
    cone: {
      from: [0, 0],
      kind: "linear",
      stops: [
        [0, "#ef4444"],
        [1, "#b91c1c"],
      ],
      to: [1, 1],
    },
  },
  layers: [
    {
      d: "M6 17.6C6.4 11.2 9 6.2 14 4.8 17 4 19.6 5.4 20.4 8.8 18.6 7.6 16.6 7.8 15.6 9.6 16.6 12.2 17.4 15 18 17.6Z",
      gradient: "cone",
      stroke: "#7f1d1d",
      strokeWidth: 0.5,
    },
    {
      d: "M4.8 16.6h14.4a2.2 2.2 0 0 1 0 4.4H4.8a2.2 2.2 0 0 1 0-4.4Z",
      fill: "#ffffff",
      stroke: "#cbd5e1",
      strokeWidth: 0.5,
    },
    { d: circle(20.2, 9.6, 2), fill: "#ffffff", stroke: "#cbd5e1", strokeWidth: 0.5 },
  ],
} satisfies Art;

/** A top hat in a crown color, its band and a gold buckle on the front. */
export const topHat = (crown: string, band: string, edge: string): Art => ({
  layers: [
    { d: ellipse(12, 19.2, 9.6, 2), fill: crown, stroke: edge, strokeWidth: 0.5 },
    {
      d: `M6.9 19 7.5 6.4C10.4 5.6 13.6 5.6 16.5 6.4L17.1 19C13.8 19.8 10.2 19.8 6.9 19Z${ellipse(12, 6.4, 4.5, 0.9)}`,
      fill: crown,
      stroke: edge,
      strokeWidth: 0.5,
    },
    {
      d: "M7.2 14C10.3 14.8 13.7 14.8 16.8 14L16.9 16.8C13.7 17.6 10.3 17.6 7.1 16.8Z",
      fill: band,
    },
    { d: "M10.5 14.3h3v2.8h-3Z", stroke: "#f5c04a", strokeWidth: 0.8 },
  ],
});

/** Bunny ears: one standing, one flopped, pink inside. */
export const BUNNY_EARS = {
  layers: [
    { d: ellipse(9, 11.4, 2.8, 7.6, -10), fill: "#ffffff", stroke: "#b8a6d9", strokeWidth: 0.6 },
    { d: ellipse(9.1, 11.8, 1.3, 5.6, -10), fill: "#ffb3cf" },
    { d: ellipse(16, 13, 2.7, 6.8, 28), fill: "#ffffff", stroke: "#b8a6d9", strokeWidth: 0.6 },
    { d: ellipse(15.9, 13.3, 1.2, 4.9, 28), fill: "#ffb3cf" },
  ],
} satisfies Art;
