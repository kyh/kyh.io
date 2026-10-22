// How the showcase's town dresses for Easter (`Town` in city/town-theme.ts).
import { bunnyEars } from "@/app/showcase/_components/city/blimp";
import { giantEgg } from "@/app/showcase/_components/city/decor-giants";
import { egg } from "@/app/showcase/_components/city/decor-props";
import { PASTEL_ROOFS, slopesOf } from "@/app/showcase/_components/city/palette";
import type { Prop, Town } from "@/app/showcase/_components/city/town-theme";

/** An egg in a pastel, by a door or the pond. */
const pastelEgg: Prop = (sketch, x, z, random) => egg(sketch, x, z, random.pick(PASTEL_ROOFS));

export const town: Town = {
  blimp: {
    banner: "accentPurple",
    fins: "accentPink",
    lettering: "white",
    text: "HAPPY EASTER",
    trim: bunnyEars,
  },
  centerpiece: giantEgg,
  lights: ["accentPink", "accentYellow", "accentTeal", "accentPurple"],
  porch: pastelEgg,
  shore: pastelEgg,
  square: (sketch, x, z, random) => {
    egg(sketch, x, z, random.pick(PASTEL_ROOFS), 3.2);
    egg(sketch, x + 0.22, z + 0.1, random.pick(PASTEL_ROOFS));
    egg(sketch, x - 0.2, z + 0.14, random.pick(PASTEL_ROOFS));
  },
  // Pastel roofs stay pastel while the rest of the town is grey.
  vivid: new Set(slopesOf(PASTEL_ROOFS)),
  yard: (sketch, x, z, random) => {
    egg(sketch, x, z, random.pick(PASTEL_ROOFS));
    egg(sketch, x + 0.12, z + 0.06, random.pick(PASTEL_ROOFS));
    egg(sketch, x - 0.05, z + 0.13, random.pick(PASTEL_ROOFS));
  },
};
