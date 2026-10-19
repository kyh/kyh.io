// The season in play, for the page load: the calendar's for today, unless
// the theme dial has picked another (gone on reload, like the dial's
// brightness). One store, so whatever follows it (the dial, the bursts, the
// showcase) reads the same season; its tint is written onto <html> too
// (`paint.ts`). Before the page runs, `script.ts` paints the calendar's.
import { useSyncExternalStore } from "react";

import { dayKey } from "./calendar";
import { paintSeason } from "./paint";
import type { SeasonId } from "./seasons";
import { DEFAULT_SEASON, seasonOn } from "./seasons";

let chosen: SeasonId | null = null;
// The calendar's answer, worked out once a day rather than on every read.
let today = { key: 0, season: DEFAULT_SEASON };
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

/** Picks a season over the calendar's; picking the calendar's own hands it back. */
export const chooseSeason = (id: SeasonId) => {
  chosen = id === calendarSeason() ? null : id;
  if (typeof document !== "undefined") {
    paintSeason(document.documentElement, currentSeason());
  }
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeToSeason = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const serverSeason = () => DEFAULT_SEASON;

/** The season in play; the default until hydrated, since the server can't know the visitor's date. */
export const useSeason = () => useSyncExternalStore(subscribeToSeason, currentSeason, serverSeason);
