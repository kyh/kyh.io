import type { Picture } from "@/app/showcase/_components/city/picture";
import { pictureOf } from "@/app/showcase/_components/city/picture";
import type { ThemeId } from ".";
import { THEMES } from ".";
import { TOWNS } from "./towns";

export type HatPictures = Partial<Record<ThemeId, Picture>>;

export const HAT_PICTURES: HatPictures = Object.fromEntries(
  THEMES.flatMap(({ id, mode }) => {
    const { hat } = TOWNS[id];

    return hat ? [[id, pictureOf(hat, mode === "dark" ? "night" : "day")]] : [];
  }),
);
