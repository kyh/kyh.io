// How the showcase's town dresses for Lunar New Year (`Town` in city/town-theme.ts).
import { lanterns } from "@/app/showcase/_components/city/blimp";
import { lanternGate } from "@/app/showcase/_components/city/decor-giants";
import { GROUND, lantern, lanternPost } from "@/app/showcase/_components/city/decor-props";
import { placed as placedIn } from "@/app/showcase/_components/city/sketch";
import type { Town } from "@/app/showcase/_components/city/town-theme";

export const town: Town = {
  blimp: {
    banner: "festiveRed",
    fins: "gold",
    lettering: "white",
    text: "HAPPY NEW YEAR",
    trim: lanterns,
  },
  centerpiece: lanternGate,
  lights: ["festiveRed", "festiveRed", "gold"],
  porch: (sketch, x, z) => lanternPost(sketch, x, z),
  repaint: { glass: { day: "#dbe6ea", night: "#ff7a5c" } },
  shore: (sketch, x, z) => lanternPost(sketch, x, z, 0.3),
  square: (sketch, x, z) => {
    lanternPost(sketch, x - 0.15, z, 0.62);
    lantern(placedIn(sketch), [x + 0.1, GROUND + 0.25, z + 0.08], 1.6);
  },
};
