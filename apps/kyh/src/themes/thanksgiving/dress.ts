// What Thanksgiving puts on: a find throws maple leaves, and maple, oak and
// birch leaves flutter and tumble down every page.
import type { Token } from "@/app/showcase/_components/city/palette";
import type { Art } from "../art";
import type { Dress } from "../theme";
import { namedConfetti } from "../theme";
import { MAPLE_OUTLINE } from ".";

const MAPLE_VEINS = "M12 15.6V5.5M12 13.4l5.4-2.6M12 13.4 6.6 10.8";

/** A leaf on its stem, its face in one color and its side from the light in the other. */
const leaf = (outline: string, veins: string, stem: number, fill: Token, shade: Token): Art => ({
  layers: [
    { d: `M12 ${stem}v${22 - stem}`, strokeWidth: 1.9 },
    { d: `M12 ${stem}v${22 - stem}`, stroke: shade, strokeWidth: 0.8 },
    { d: outline, fill, shade },
    { d: veins, strokeWidth: 0.4 },
  ],
});

const MAPLE_LEAF = leaf(MAPLE_OUTLINE, MAPLE_VEINS, 14, "pumpkin", "pumpkinShade");
const RED_MAPLE_LEAF = leaf(MAPLE_OUTLINE, MAPLE_VEINS, 14, "festiveRed", "festiveRedShade");

/** An oak leaf: round lobes down either side of its midrib. */
const OAK_LEAF = leaf(
  "M12 2C14 2 14.5 4 14 5C16 4.5 17.5 5.5 16.5 7.5C18.5 7.5 19.5 9.5 17.5 11C19.5 11.5 19.5 14 17 14.2C18 16 16.5 17.5 14.5 16.5C14.5 18 13.5 19 12 19C10.5 19 9.5 18 9.5 16.5C7.5 17.5 6 16 7 14.2C4.5 14 4.5 11.5 6.5 11C4.5 9.5 5.5 7.5 7.5 7.5C6.5 5.5 8 4.5 10 5C9.5 4 10 2 12 2Z",
  "M12 18V4M12 8.5l3 -1.2M12 8.5 9 7.3M12 12.4l3.6-1.4M12 12.4 8.4 11M12 15.6l2.4-1M12 15.6 9.6 14.6",
  18.5,
  "bronze",
  "bronzeShade",
);

/** A birch leaf: a plain pointed oval, yellow. */
const BIRCH_LEAF = leaf(
  "M12 2.5C15.6 6 18 9.6 17.6 13.6C17.2 17 15 19.4 12 19.4C9 19.4 6.8 17 6.4 13.6C6 9.6 8.4 6 12 2.5Z",
  "M12 18.6V5M12 9.4l3 -1.6M12 9.4 9 7.8M12 13l3.8-1.8M12 13 8.2 11.2M12 16.4l3-1.2M12 16.4 9 15.2",
  19,
  "gold",
  "goldShade",
);

export const dress = {
  art: MAPLE_LEAF,
  confetti: [
    { back: "#fcd34d", front: "#b45309" },
    { back: "#fca5a5", front: "#991b1b" },
    ...namedConfetti("orange", "gold"),
  ],
  corners: null,
  drift: { kind: "leaves", pieces: [MAPLE_LEAF, RED_MAPLE_LEAF, OAK_LEAF, BIRCH_LEAF] },
} as const satisfies Dress;
