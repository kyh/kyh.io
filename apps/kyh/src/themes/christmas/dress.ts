// What Christmas puts on: a find throws snowflakes, and snow drifts down
// every page.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { circle } from "../art";
import { namedConfetti } from "../theme";
import { snowflake } from ".";

// A pair of branches near the tip and a pair near the middle.
const SNOWFLAKE_PATH = snowflake([
  [6.4, 2.8, 0.75],
  [3.6, 1.8, 0.75],
]);

const SNOWFLAKE = {
  layers: [
    // White arms outlined in ink.
    { d: SNOWFLAKE_PATH, strokeWidth: 2.6 },
    { d: SNOWFLAKE_PATH, stroke: "white", strokeWidth: 1.4 },
    { d: circle(12, 12, 1.4), fill: "white", shade: "whiteShade" },
  ],
} satisfies Art;

export const dress = {
  art: SNOWFLAKE,
  confetti: [
    { back: "#fca5a5", front: "#dc2626" },
    { back: "#86efac", front: "#15803d" },
    { back: "#e0f2fe", front: "#ffffff" },
    ...namedConfetti("gold"),
  ],
  corners: null,
  drift: { kind: "snow", pieces: [SNOWFLAKE] },
} as const satisfies Dress;
