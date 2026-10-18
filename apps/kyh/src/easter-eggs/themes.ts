// What a find throws, by the season: golden eggs most of the year, bats over
// Halloween week. A theme is its pieces (drawn in `pieces.tsx`, one per theme,
// so a new theme won't typecheck without one), its confetti, and the days it
// runs. The calendar picks unless something has chosen one (`chooseEggTheme`,
// for a switcher later). Pure but for that choice, so the calendar is asserted.
import { colorNamed, GOLD } from "@/lib/color";

/** One side of a bit of confetti and its flip side. */
export interface ConfettiSide {
  front: string;
  back: string;
}

export interface EggTheme {
  /** What flies home, for people: "eggs", "bats". */
  name: string;
  confetti: readonly ConfettiSide[];
  /** The days it runs, local time; the default theme has none. */
  runs?: (day: Date) => boolean;
}

const named = (...names: string[]): ConfettiSide[] =>
  names.map((name) => {
    const look = colorNamed(name) ?? GOLD;
    return { back: look.hue, front: look.color };
  });

/** October 25 to 31: the week up to Halloween. */
const halloweenWeek = (day: Date) => day.getMonth() === 9 && day.getDate() >= 25;

export const EGG_THEMES = {
  // Pumpkin, witch's purple and the night.
  bats: {
    confetti: [
      ...named("orange", "orange", "plum", "gold"),
      { back: "hsl(270, 20%, 30%)", front: "hsl(270, 25%, 12%)" },
    ],
    name: "bats",
    runs: halloweenWeek,
  },
  // Mostly gold, flecked with the visitors' own colors.
  eggs: {
    confetti: named("gold", "gold", "crimson", "blue", "green", "plum"),
    name: "eggs",
  },
} as const satisfies Record<string, EggTheme>;

export type EggThemeId = keyof typeof EGG_THEMES;

export const DEFAULT_EGG_THEME: EggThemeId = "eggs";

const IDS = Object.keys(EGG_THEMES).filter((id): id is EggThemeId => id in EGG_THEMES);

/** The theme the calendar picks for a day: the first whose days it is, else eggs. */
export const eggThemeOn = (day: Date): EggThemeId =>
  IDS.find((id) => {
    const theme: EggTheme = EGG_THEMES[id];
    return theme.runs?.(day) ?? false;
  }) ?? DEFAULT_EGG_THEME;

let chosen: EggThemeId | null = null;
const listeners = new Set<() => void>();

/** The theme in play: the one chosen, else the calendar's for today. */
export const currentEggTheme = (): EggThemeId => chosen ?? eggThemeOn(new Date());

/** Pick a theme over the calendar's, or `null` to hand it back. For the page load only. */
export const chooseEggTheme = (id: EggThemeId | null) => {
  chosen = id;
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeToEggTheme = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
