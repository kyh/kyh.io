// The theme in play: a season's, which brings its own light or dark, or on a
// plain day the visitor's own light or dark. The calendar picks the season
// for today unless the themes menu has picked another (gone on reload); the
// visitor's light or dark is theirs to keep (localStorage, else their
// system's). One store, so whatever follows it (the toggle, the menu, the
// bursts, the drift, the showcase) reads the same theme; it's painted onto
// <html> too (`paint.ts`). Before the page runs, `script.ts` paints the
// calendar's.
import { useSyncExternalStore } from "react";

import { dayKey } from "./calendar";
import { MODE_KEY, paintTheme } from "./paint";
import type { Mode, SeasonId } from "./seasons";
import { DEFAULT_SEASON, seasonOf, seasonOn } from "./seasons";

export interface Theme {
  season: SeasonId;
  mode: Mode;
}

/** What the themes menu offers: plain light or dark, or a season (the default season is plain). */
export type ThemeId = Mode | SeasonId;

let chosen: SeasonId | null = null;
// The calendar's answer, worked out once a day rather than on every read.
let today = { key: 0, season: DEFAULT_SEASON };
/** The visitor's own light or dark once read: what they last picked, or null to follow their system. */
let own: { mode: Mode | null } | null = null;
let system: MediaQueryList | null = null;
const listeners = new Set<() => void>();

/** The calendar's season for today. */
export const calendarSeason = () => {
  const now = new Date();
  const key = dayKey(now);
  if (key !== today.key) {
    today = { key, season: seasonOn(now) };
  }
  return today.season;
};

export const currentSeason = (): SeasonId => chosen ?? calendarSeason();

const storedMode = (): Mode | null => {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    // No storage (a server, a locked-down browser): follow the system.
    return null;
  }
};

/** The visitor's own light or dark: what they last picked, else their system's. */
export const ownMode = (): Mode => {
  if (typeof window === "undefined") {
    return own?.mode ?? "light";
  }
  own ??= { mode: storedMode() };
  system ??= window.matchMedia("(prefers-color-scheme: dark)");
  return own.mode ?? (system.matches ? "dark" : "light");
};

// One object per theme, so a snapshot is the same object until the theme changes.
const themes = new Map<string, Theme>();
const themeAt = (season: SeasonId, mode: Mode) => {
  const key = `${season}|${mode}`;
  let theme = themes.get(key);
  if (!theme) {
    theme = { mode, season };
    themes.set(key, theme);
  }
  return theme;
};

export const currentTheme = (): Theme => {
  const season = currentSeason();
  return themeAt(season, seasonOf(season).mode ?? ownMode());
};

/** The menu's name for a theme: its season, or plain light or dark. */
export const themeIdOf = ({ mode, season }: Theme): ThemeId =>
  season === DEFAULT_SEASON ? mode : season;

const changed = () => {
  if (typeof document !== "undefined") {
    const { mode, season } = currentTheme();
    paintTheme(document.documentElement, season, mode);
  }
  for (const listener of listeners) {
    listener();
  }
};

const keepMode = (mode: Mode) => {
  own = { mode };
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Kept for this page load only.
  }
};

/** Leaves the season for plain light or dark, over the calendar's if it has one. */
const plain = () => {
  chosen = calendarSeason() === DEFAULT_SEASON ? null : DEFAULT_SEASON;
};

/** Picks a theme: a season over the calendar's (picking the calendar's own hands it back), or plain light or dark, which the visitor keeps. */
export const chooseTheme = (id: ThemeId) => {
  if (id === "light" || id === "dark") {
    plain();
    keepMode(id);
  } else if (id === DEFAULT_SEASON) {
    plain();
  } else {
    chosen = id === calendarSeason() ? null : id;
  }
  changed();
};

/** The toggle's tap: plain light or dark flips; a season goes back to plain light or dark. */
export const toggleTheme = () => {
  const { mode, season } = currentTheme();
  if (season === DEFAULT_SEASON) {
    keepMode(mode === "light" ? "dark" : "light");
  } else {
    plain();
  }
  changed();
};

export const subscribeToTheme = (listener: () => void) => {
  if (listeners.size === 0 && typeof window !== "undefined") {
    // Following the system, the theme turns when it does.
    ownMode();
    system?.addEventListener("change", changed);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      system?.removeEventListener("change", changed);
    }
  };
};

// The server can't know the visitor's date or their light or dark, so it renders the default.
const serverTheme = () => themeAt(DEFAULT_SEASON, "light");
const serverSeason = () => DEFAULT_SEASON;

/** The theme in play; the default until hydrated. */
export const useTheme = () => useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);

/** Just the season in play, for what follows the season alone. */
export const useSeason = () => useSyncExternalStore(subscribeToTheme, currentSeason, serverSeason);
