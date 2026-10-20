// The theme in play: a season's, which brings its own light or dark, or on a
// plain day the visitor's own light or dark. The calendar picks the season
// for today unless the themes menu has picked another (gone on reload); the
// visitor's light or dark is theirs to keep (localStorage, else their
// system's). One store, so whatever follows it (the toggle, the menu, the
// bursts, the drift, the showcase) reads the same theme; it's painted onto
// <html> too (`paint.ts`). Before the page runs, `script.ts` paints the
// calendar's. While subscribed, it follows the system's light or dark, the
// visitor's pick in another tab, and the calendar into a new day.
import { useSyncExternalStore } from "react";

import { dayKey } from "./calendar";
import { BAR_SELECTOR, MODE_KEY, paintTheme } from "./paint";
import type { Mode, SeasonId } from "./seasons";
import { DEFAULT_SEASON, seasonOf, seasonOn } from "./seasons";

export interface Theme {
  season: SeasonId;
  mode: Mode;
  /** The visitor's own light or dark, which a season's may override and the toggle goes back to. */
  own: Mode;
}

let chosen: SeasonId | null = null;
// The calendar's answer, worked out once a day rather than on every read.
let today = { key: 0, season: DEFAULT_SEASON };
/** The visitor's own light or dark: what they last picked, null to follow their system, undefined until read. */
let picked: Mode | null | undefined;
let system: MediaQueryList | null = null;
const listeners = new Set<() => void>();
/** The season and light or dark on <html>, so a change that doesn't show isn't repainted. */
let painted = "";
/** The window and document listeners, while anything is subscribed. */
let listening: AbortController | null = null;

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

const systemMode = (): Mode => (system?.matches ? "dark" : "light");

/** The visitor's own light or dark: what they last picked, else their system's. */
const ownMode = (): Mode => {
  if (typeof window === "undefined") {
    return picked ?? "light";
  }
  if (picked === undefined) {
    picked = storedMode();
  }
  system ??= window.matchMedia("(prefers-color-scheme: dark)");
  return picked ?? systemMode();
};

// One object per theme, so a snapshot is the same object until the theme changes.
const themes = new Map<string, Theme>();
const themeAt = (season: SeasonId, visitor: Mode) => {
  const key = `${season}|${visitor}`;
  let theme = themes.get(key);
  if (!theme) {
    theme = { mode: seasonOf(season).mode ?? visitor, own: visitor, season };
    themes.set(key, theme);
  }
  return theme;
};

export const currentTheme = (): Theme => themeAt(currentSeason(), ownMode());

/** <html> and the browser's bar, its meta made if the head script didn't make it. */
const page = () => {
  let bar = document.querySelector<HTMLMetaElement>(BAR_SELECTOR);
  if (!bar) {
    bar = document.createElement("meta");
    bar.name = "theme-color";
    document.head.prepend(bar);
  }
  return { bar, root: document.documentElement };
};

/** What a theme shows on <html>. */
const shownAs = ({ mode, season }: Theme) => `${season}|${mode}`;

/**
 * Runs a repaint with every transition held still, so nothing fades from the
 * old colors at its own pace (a link's border a beat behind its text).
 */
const withoutTransitions = (repaint: () => void) => {
  const still = document.createElement("style");
  still.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(still);
  repaint();
  // Reading a style applies the repaint while transitions are off.
  getComputedStyle(document.body).getPropertyValue("color");
  setTimeout(() => still.remove(), 1);
};

/** Paints the theme in play on <html>, if it isn't there already; a change is painted without transitions. */
const paint = (change: boolean) => {
  const theme = currentTheme();
  if (shownAs(theme) === painted) {
    return;
  }
  painted = shownAs(theme);
  const { mode, season } = theme;
  const repaint = () => paintTheme(page(), season, mode);
  if (change) {
    withoutTransitions(repaint);
  } else {
    repaint();
  }
};

const changed = () => {
  if (typeof document !== "undefined") {
    paint(true);
  }
  for (const listener of listeners) {
    listener();
  }
};

/** The visitor's light or dark, picked in another tab. */
const onStorage = (event: StorageEvent) => {
  // A null key is storage cleared.
  if (event.key === MODE_KEY || event.key === null) {
    picked = storedMode();
    changed();
  }
};

/** A tab left open into another day takes up that day's season when it's next looked at. */
const onVisible = () => {
  if (document.visibilityState === "visible" && shownAs(currentTheme()) !== painted) {
    changed();
  }
};

/** Picks a season over the calendar's; picking the calendar's own hands it back, and the default is plain light or dark. */
export const chooseTheme = (id: SeasonId) => {
  chosen = id === calendarSeason() ? null : id;
  changed();
};

/** The toggle's tap: plain light or dark flips and is kept, unless it's the system's again; a season goes back to plain. */
export const toggleTheme = () => {
  const { mode, season } = currentTheme();
  if (season !== DEFAULT_SEASON) {
    chooseTheme(DEFAULT_SEASON);
    return;
  }
  const flipped = mode === "light" ? "dark" : "light";
  // Flipped back to their system's, they follow the system again, as they did
  // before they picked (next-themes' "system").
  const kept = flipped === systemMode() ? null : flipped;
  picked = kept;
  try {
    if (kept) {
      localStorage.setItem(MODE_KEY, kept);
    } else {
      localStorage.removeItem(MODE_KEY);
    }
  } catch {
    // Kept for this page load only.
  }
  changed();
};

export const subscribeToTheme = (listener: () => void) => {
  if (listeners.size === 0 && typeof window !== "undefined") {
    // The head script painted the page if it could; this paints it either way.
    paint(false);
    listening = new AbortController();
    const { signal } = listening;
    // Following the system, the theme turns when it does.
    system?.addEventListener("change", changed, { signal });
    window.addEventListener("storage", onStorage, { signal });
    document.addEventListener("visibilitychange", onVisible, { signal });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      listening?.abort();
      listening = null;
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
