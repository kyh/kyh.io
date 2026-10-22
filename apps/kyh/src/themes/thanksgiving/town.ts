// How the showcase's town dresses for Thanksgiving (`Town` in city/town-theme.ts).
import { topHatTrim } from "@/app/showcase/_components/city/blimp";
import { giantTurkey } from "@/app/showcase/_components/city/decor-giants";
import { cornShock, GROUND, hayBale, pumpkin } from "@/app/showcase/_components/city/decor-props";
import type { Town } from "@/app/showcase/_components/city/town-theme";

export const town: Town = {
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
};
