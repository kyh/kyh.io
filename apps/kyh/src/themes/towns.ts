// How the showcase's town dresses for each theme: every theme folder's
// `town.ts`, keyed by theme so a new one won't compile without its entry.
// Only the showcase imports this, so the town's drawing code stays in its
// own chunk.
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
