// How the showcase's town dresses for St. Patrick's Day (`Town` in city/town-theme.ts).
import { topHatTrim } from "@/app/showcase/_components/city/blimp";
import { topHat } from "@/app/showcase/_components/city/hats";
import { giantShamrock } from "@/app/showcase/_components/city/decor-giants";
import { potOfGold, rainbow } from "@/app/showcase/_components/city/decor-props";
import type { Town } from "@/app/showcase/_components/city/town-theme";

export const town: Town = {
  blimp: {
    banner: "festiveGreen",
    fins: "gold",
    lettering: "gold",
    text: "LUCKY",
    trim: topHatTrim("festiveGreen", "screen"),
  },
  centerpiece: giantShamrock,
  hat: (hat) => topHat(hat, "festiveGreen", "screen"),
  lights: ["festiveGreen", "gold"],
  porch: (sketch, x, z, random) => {
    if (random.chance(0.4)) {
      potOfGold(sketch, x, z);
    }
  },
  repaint: {
    fieldGreen: { day: "#bfe3a8", night: "#24502c" },
    hedge: { day: "#9fd08a", night: "#2b5a30" },
    lawn: { day: "#c9eab4", night: "#1f4a28" },
  },
  square: (sketch, x, z) => {
    potOfGold(sketch, x - 0.35, z);
    rainbow(sketch, x - 0.35, z, 0.4);
  },
};
