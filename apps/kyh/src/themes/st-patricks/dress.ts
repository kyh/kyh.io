// What St. Patrick's Day puts on: a find throws shamrocks.
import type { Art } from "../art";
import type { Dress } from "../theme";
import { placed } from "../art";
import { namedConfetti } from "../theme";
import { LEAF } from ".";

const SHAMROCK_CENTER = [12, 10.6] as const;

const SHAMROCK_STEM = "M12 11c.4 3.4 1.6 6.4 3.6 8.6";

const SHAMROCK = {
  layers: [
    // A green stem, outlined in ink.
    { d: SHAMROCK_STEM, strokeWidth: 2.3 },
    { d: SHAMROCK_STEM, stroke: "festiveGreen", strokeWidth: 1.1 },
    {
      // Up, then down to either side.
      d: [180, -60, 60].map((angle) => placed(LEAF, SHAMROCK_CENTER, angle)).join(""),
      fill: "festiveGreen",
      shade: "festiveGreenShade",
    },
  ],
} satisfies Art;

export const dress = {
  art: SHAMROCK,
  confetti: [{ back: "#86efac", front: "#15803d" }, ...namedConfetti("green", "green", "gold")],
  corners: null,
  drift: null,
} as const satisfies Dress;
