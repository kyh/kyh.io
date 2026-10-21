// The site's themes, one file each: everything a theme does lives in its
// file (`theme.ts` says what that is). The calendar picks one for today,
// unless the themes menu round the theme toggle has (`store.ts`). The
// default theme is plain light or dark, the visitor's own.
// Adding a theme is adding its file and listing it here. Pure.
import type { Theme } from "./theme";
import { dayKey } from "./calendar";
import { theme as christmas } from "./christmas";
import { theme as classic } from "./classic";
import { theme as easter } from "./easter";
import { theme as halloween } from "./halloween";
import { theme as lunarNewYear } from "./lunar-new-year";
import { theme as stPatricks } from "./st-patricks";
import { theme as thanksgiving } from "./thanksgiving";
import { theme as valentines } from "./valentines";

/** In calendar order; where two overlap, the one listed first runs. */
export const THEMES = [
  classic,
  lunarNewYear,
  valentines,
  stPatricks,
  easter,
  halloween,
  thanksgiving,
  christmas,
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]["id"];

/** One of the themes listed, its id narrowed to the list's. */
export type ListedTheme = Theme & { id: ThemeId };

export const DEFAULT_THEME: ThemeId = "classic";

export const themeOf = (id: ThemeId): ListedTheme =>
  THEMES.find((theme) => theme.id === id) ?? classic;

/** A theme's days in a year, if it has any then. */
export const windowIn = (theme: Theme, year: number) => theme.days?.(year) ?? null;

/** The theme the calendar picks for a day: the first whose days it is, else the default. No theme's days run past December 31st. */
export const themeOn = (date: Date): ThemeId => {
  const key = dayKey(date);
  const runs = (theme: Theme) => {
    const days = windowIn(theme, date.getFullYear());
    return days !== null && key >= days[0] && key <= days[1];
  };
  return THEMES.find(runs)?.id ?? DEFAULT_THEME;
};
