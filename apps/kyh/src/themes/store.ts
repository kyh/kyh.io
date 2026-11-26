import { useSyncExternalStore } from "react";

import { dayKey } from "./calendar";
import { BAR_SELECTOR, MODE_KEY, paintTheme } from "./paint";
import type { ThemeId } from "./index";
import type { Mode } from "./theme";
import { DEFAULT_THEME, themeOf, themeOn } from "./index";

/** The theme in play and the light or dark it shows in. */
export interface Appearance {
  theme: ThemeId;
  mode: Mode;
  /** The visitor's own light or dark, which a theme's may override and the toggle goes back to. */
  own: Mode;
}

let chosen: ThemeId | null = null;
let flipped = false;
let today = { key: 0, theme: DEFAULT_THEME };
let picked: Mode | null | undefined;
let system: MediaQueryList | null = null;
const listeners = new Set<() => void>();
let painted = "";
let listening: AbortController | null = null;

/** The calendar's theme for today. */
export const calendarTheme = () => {
  const now = new Date();
  const key = dayKey(now);

  if (key !== today.key) {
    today = { key, theme: themeOn(now) };
  }

  return today.theme;
};

export const currentTheme = () => chosen ?? calendarTheme();

const storedMode = () => {
  try {
    const stored = localStorage.getItem(MODE_KEY);

    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
};

const keepMode = (mode: "light" | "dark" | null) => {
  try {
    if (mode) {
      localStorage.setItem(MODE_KEY, mode);
    } else {
      localStorage.removeItem(MODE_KEY);
    }

    return true;
  } catch {
    return false;
  }
};

const systemMode = () => (system?.matches === true ? "dark" : "light") satisfies Mode;

const ownMode = () => {
  if (typeof window === "undefined") {
    return (picked ?? "light") satisfies Mode;
  }

  if (picked === undefined) {
    picked = storedMode();
  }

  system ??= window.matchMedia("(prefers-color-scheme: dark)");

  return (picked ?? systemMode()) satisfies Mode;
};

const appearances = new Map<string, Appearance>();

const appearanceAt = (theme: ThemeId, visitor: Mode) => {
  const key = `${theme}|${visitor}`;
  let appearance = appearances.get(key);

  if (!appearance) {
    appearance = { mode: themeOf(theme).mode ?? visitor, own: visitor, theme };
    appearances.set(key, appearance);
  }

  return appearance;
};

export const currentAppearance = () => appearanceAt(currentTheme(), ownMode());

const page = () => {
  let bar = document.querySelector<HTMLMetaElement>(BAR_SELECTOR);

  if (!bar) {
    bar = document.createElement("meta");
    bar.name = "theme-color";
    document.head.prepend(bar);
  }

  return { bar, root: document.documentElement };
};

const shownAs = ({ mode, theme }: Appearance) => `${theme}|${mode}`;

const withoutTransitions = (repaint: () => void) => {
  const still = document.createElement("style");
  still.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(still);
  repaint();
  getComputedStyle(document.body).getPropertyValue("color");
  setTimeout(() => {
    still.remove();
  }, 1);
};

const paint = (change: boolean) => {
  const appearance = currentAppearance();

  if (shownAs(appearance) === painted) {
    return;
  }

  painted = shownAs(appearance);
  const { mode, theme } = appearance;

  const repaint = () => {
    paintTheme(page(), theme, mode);
  };

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

const onStorage = (event: StorageEvent) => {
  if (event.key === MODE_KEY || event.key === null) {
    picked = storedMode();
    changed();
  }
};

const onVisible = () => {
  if (document.visibilityState === "visible" && shownAs(currentAppearance()) !== painted) {
    changed();
  }
};

/** Picks a theme over the calendar's; picking the calendar's own hands it back, and the default is plain light or dark. */
export const chooseTheme = (id: ThemeId) => {
  chosen = id === calendarTheme() ? null : id;
  flipped = false;
  changed();
};

/**
 * Where the toggle's tap goes: a holiday's theme to plain light or dark, and
 * plain flips. On a holiday the tap cycles through it: the visitor's own,
 * then the other, then today's holiday again. Takes the appearance shown, so
 * a label rendered from it hydrates as the server rendered it.
 */
export const nextTap = ({ mode, own, theme }: Appearance = currentAppearance()) => {
  if (theme !== DEFAULT_THEME) {
    return { mode: own, theme: DEFAULT_THEME } satisfies Pick<Appearance, "mode" | "theme">;
  }

  const holiday = flipped ? calendarTheme() : DEFAULT_THEME;

  if (holiday !== DEFAULT_THEME) {
    return { mode: themeOf(holiday).mode ?? own, theme: holiday } satisfies Pick<
      Appearance,
      "mode" | "theme"
    >;
  }

  return { mode: mode === "light" ? "dark" : "light", theme: DEFAULT_THEME } satisfies Pick<
    Appearance,
    "mode" | "theme"
  >;
};

/** The toggle's tap (`nextTap`): plain light or dark flips and is kept, unless it's the system's again. */
export const toggleTheme = () => {
  const next = nextTap();

  if (next.theme !== DEFAULT_THEME || currentTheme() !== DEFAULT_THEME) {
    chooseTheme(next.theme);

    return;
  }

  const kept = next.mode === systemMode() ? null : next.mode;
  flipped = true;
  picked = kept;

  keepMode(kept);
  changed();
};

export const subscribeToTheme = (listener: () => void) => {
  if (listeners.size === 0 && typeof window !== "undefined") {
    paint(false);
    listening = new AbortController();
    const { signal } = listening;
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

const serverAppearance = () => appearanceAt(DEFAULT_THEME, "light");
const serverTheme = () => DEFAULT_THEME;

/** The theme in play and its light or dark; the default until hydrated. */
export const useAppearance = () =>
  useSyncExternalStore(subscribeToTheme, currentAppearance, serverAppearance);

/** Just the theme in play, for what follows the theme alone. */
export const useTheme = () => useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
