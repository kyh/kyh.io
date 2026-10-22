// How the showcase's town dresses for Christmas (`Town` in city/town-theme.ts).
import { santaTrim } from "@/app/showcase/_components/city/blimp";
import { townTree } from "@/app/showcase/_components/city/decor-giants";
import { christmasTree, present, snowman } from "@/app/showcase/_components/city/decor-props";
import { GREEN, RED, snowfall } from "@/app/showcase/_components/city/palette";
import { drawSleigh } from "@/app/showcase/_components/city/sky";
import type { Town } from "@/app/showcase/_components/city/town-theme";

export const town: Town = {
  blimp: {
    banner: "festiveRed",
    fins: "festiveGreen",
    lettering: "white",
    text: "HO HO HO",
    trim: santaTrim,
  },
  centerpiece: townTree,
  flyer: drawSleigh,
  lights: ["festiveRed", "gold", "festiveGreen", "accentBlue"],
  porch: (sketch, x, z, random) => christmasTree(sketch, x, z, random, 0.42),
  repaint: snowfall(),
  square: (sketch, x, z, random) => {
    christmasTree(sketch, x, z, random, 1.25);
    present(sketch, x + 0.2, z + 0.16, RED);
    present(sketch, x - 0.18, z + 0.2, GREEN, 0.8);
  },
  yard: (sketch, x, z) => snowman(sketch, x, z),
};
