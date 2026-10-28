// Each theme's hat for the logo, pictured on the server from the hat the
// showcase's town draws (`hat` on its `Town`), in the theme's light or dark:
// the page gets an <svg>'s paths, never the town's drawing code.
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
