// What Halloween puts on: a find throws bats, and cobwebs hang in the page's
// corners.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { ellipse, point } from "../art";
import { namedConfetti } from "../theme";

/**
 * A bat's wing on one side (-1 left, 1 right), `x` measured out from the
 * body: a curved leading edge out to a pointed tip, and a trailing edge
 * scalloped between the fingers. It beats about its shoulder, high above
 * the body and then just below it.
 */
const batWing = (side: -1 | 1) => {
  const at = (x: number, y: number) => point(12 + side * x, y);
  return {
    d: `M${at(1.1, 10.2)}C${at(2.4, 8.6)} ${at(4.2, 7.4)} ${at(6.4, 7)}C${at(8.6, 7.4)} ${at(10.2, 8.4)} ${at(11.6, 10.9)}Q${at(10.1, 10.2)} ${at(9.2, 12.6)}Q${at(7.5, 11.4)} ${at(6, 13.6)}Q${at(3.8, 12.2)} ${at(1.4, 14.4)}Z`,
    fill: "screen",
    swing: { at: [12 + side * 1.2, 11.4], from: side * -32, to: side * 16 },
  } as const;
};

/** The body, and the head and its ears wound the same way so they fill as one. */
const BAT_BODY = `${ellipse(12, 13.2, 1.8, 2.9)}M13.6 9 13.5 6.2l-1.1 1.7h-.8l-1.1-1.7-.1 2.8a1.9 1.9 0 1 0 3.2 0Z`;

// A flat silhouette in the town's black, after a cartoon bat: ears up, wings beating.
const BAT = {
  layers: [
    batWing(-1),
    batWing(1),
    // Its ink, then the body over it, so the seam where head meets body is hidden.
    { d: BAT_BODY, strokeWidth: 1.2 },
    { d: BAT_BODY, fill: "screen", ink: 0 },
  ],
} satisfies Art;

export const dress = {
  art: BAT,
  confetti: [
    ...namedConfetti("orange", "orange", "plum", "gold"),
    { back: "hsl(270, 20%, 30%)", front: "hsl(270, 25%, 12%)" },
  ],
  corners: "webs",
  drift: null,
} as const satisfies Dress;
