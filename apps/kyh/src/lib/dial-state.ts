// The theme dial's brightness, for the page: null until moved, gone on reload.
// One store, so whatever follows it (the dock's slider, the showcase's city)
// reads the same value; it's written onto <html> too, where global.css takes
// it. The dial's other half, the season, keeps its own store (src/seasons).

import { themeOf } from "./dial";

export interface DialState {
  /** Brightness, dark 0 … light 100. */
  light: number | null;
}

export const UNMOVED: DialState = { light: null };

let state = UNMOVED;
const listeners = new Set<() => void>();

// Sets a custom property on <html>, or clears it for null.
const setRootVar = (name: string, value: string | null) => {
  const { style } = document.documentElement;
  if (value === null) {
    style.removeProperty(name);
  } else {
    style.setProperty(name, value);
  }
};

const update = (next: Partial<DialState>) => {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener();
  }
};

export const setLight = (light: number | null) => {
  setRootVar("--light", light === null ? null : `${light}%`);
  if (light !== null) {
    // The theme flips in the same frame as the brightness, not a render
    // later: global.css reads both together. next-themes writes the same when
    // it catches up.
    const theme = themeOf(light);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }
  update({ light });
};

export const dialState = () => state;

export const subscribeDial = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
