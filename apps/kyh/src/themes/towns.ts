import type { Town } from "@/app/showcase/_components/city/town-theme";
import type { ThemeId } from ".";
import { town as christmas } from "./christmas/town";
import { town as classic } from "./classic/town";
import { town as easter } from "./easter/town";
import { town as halloween } from "./halloween/town";
import { town as lunarNewYear } from "./lunar-new-year/town";
import { town as stPatricks } from "./st-patricks/town";
import { town as thanksgiving } from "./thanksgiving/town";
import { town as valentines } from "./valentines/town";

export const TOWNS: Record<ThemeId, Town> = {
  christmas,
  classic,
  easter,
  halloween,
  lunarNewYear,
  stPatricks,
  thanksgiving,
  valentines,
};
