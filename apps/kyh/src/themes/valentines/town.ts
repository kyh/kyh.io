// How the showcase's town dresses for Valentine's Day (`Town` in city/town-theme.ts).
import { heartCrest } from "@/app/showcase/_components/city/blimp";
import { fountainHeart } from "@/app/showcase/_components/city/decor-giants";
import { balloon } from "@/app/showcase/_components/city/decor-props";
import { paint, RED, WHITE } from "@/app/showcase/_components/city/palette";
import type { Token } from "@/app/showcase/_components/city/palette";
import type { Town } from "@/app/showcase/_components/city/town-theme";
import { HEART } from ".";

const PINK = paint("accentPink");

export const town: Town = {
  blimp: {
    banner: "accentPink",
    fins: "festiveRed",
    lettering: "white",
    text: "BE MINE",
    trim: heartCrest,
  },
  centerpiece: fountainHeart,
  emote: { d: HEART, fill: "#ff4f7b" },
  lights: ["festiveRed", "accentPink", "white"],
  porch: (sketch, x, z, random) => {
    if (random.chance(0.6)) {
      balloon(sketch, x, z, 0.3, random.pick([RED, PINK]));
    }
  },
  square: (sketch, x, z, random) => {
    for (const [dx, dz, height] of [
      [0, 0, 0.55],
      [0.06, 0.04, 0.45],
      [-0.05, 0.05, 0.5],
      [0.03, -0.06, 0.4],
      [-0.04, -0.03, 0.62],
    ] as const) {
      balloon(sketch, x + dx, z + dz, height, random.pick([RED, PINK, WHITE]));
    }
  },
  vivid: new Set<Token>(["roofPink", "roofPinkShade"]),
};
