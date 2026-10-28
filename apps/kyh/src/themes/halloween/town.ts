// How the showcase's town dresses for Halloween (`Town` in city/town-theme.ts).
import { witchTrim } from "@/app/showcase/_components/city/blimp";
import { witchHat } from "@/app/showcase/_components/city/hats";
import { giantSkeleton } from "@/app/showcase/_components/city/decor-giants";
import { deadTree, gravestone, pumpkin } from "@/app/showcase/_components/city/decor-props";
import { drawWitch } from "@/app/showcase/_components/city/sky";
import type { Town } from "@/app/showcase/_components/city/town-theme";

export const town: Town = {
  blimp: {
    banner: "pumpkin",
    fins: "accentPurple",
    lettering: "screen",
    text: "BOO!",
    trim: witchTrim,
  },
  centerpiece: giantSkeleton,
  flyer: drawWitch,
  hat: witchHat,
  lights: ["pumpkin", "accentPurple"],
  porch: (sketch, x, z, random) => {
    pumpkin(sketch, x, z);
    if (random.chance(0.5)) {
      pumpkin(sketch, x - 0.1, z + 0.04, 0.7);
    }
  },
  // Every window lit pumpkin orange after dark.
  repaint: {
    glass: { day: "#dbe6ea", night: "#ff9a3c" },
    glassDim: { day: "#dbe6ea", night: "#d9661f" },
  },
  shore: (sketch, x, z) => pumpkin(sketch, x, z, 0.9),
  square: (sketch, x, z, random) => {
    deadTree(sketch, x, z, random);
    gravestone(sketch, x - 0.22, z + 0.12);
    gravestone(sketch, x + 0.18, z + 0.16);
    pumpkin(sketch, x + 0.06, z + 0.24, 1.2);
  },
  yard: (sketch, x, z) => {
    gravestone(sketch, x - 0.08, z);
    gravestone(sketch, x + 0.1, z + 0.04);
  },
};
