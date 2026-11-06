// What each theme puts on (`<theme>/dress.ts`): its piece, its confetti, what
// falls across the page and what hangs in its corners. Keyed by theme, so a
// new one won't compile without its entry. Each is its own chunk, loaded only
// when it's needed: the theme that's on as a page comes up (`useDress`), and
// the rest once the themes menu is near (`loadDresses`), for their pieces. A
// dress, once in, is kept for the visit.
import { useEffect, useSyncExternalStore } from "react";

import type { ThemeId } from ".";
import type { Dress } from "./theme";
import { THEMES } from ".";

const LOADS: Record<ThemeId, () => Promise<{ dress: Dress }>> = {
  christmas: () => import("./christmas/dress"),
  classic: () => import("./classic/dress"),
  easter: () => import("./easter/dress"),
  halloween: () => import("./halloween/dress"),
  lunarNewYear: () => import("./lunar-new-year/dress"),
  stPatricks: () => import("./st-patricks/dress"),
  thanksgiving: () => import("./thanksgiving/dress"),
  valentines: () => import("./valentines/dress"),
};

const loaded = new Map<ThemeId, Dress>();
const loading = new Map<ThemeId, Promise<Dress>>();
const listeners = new Set<() => void>();

/** A theme's dress if it's in, else null. */
export const dressOf = (id: ThemeId): Dress | null => loaded.get(id) ?? null;

/** Loads a theme's dress, once: every call while it loads, or after, shares the one fetch. */
export const loadDress = (id: ThemeId): Promise<Dress> => {
  const pending = loading.get(id);
  if (pending) {
    return pending;
  }
  const load = async () => {
    try {
      const { dress } = await LOADS[id]();
      loaded.set(id, dress);
      for (const listener of listeners) {
        listener();
      }
      return dress;
    } catch (error) {
      // Not kept: the next call tries again.
      loading.delete(id);
      throw error;
    }
  };
  const next = load();
  loading.set(id, next);
  return next;
};

/** Loads a theme's dress for something that can do without it: a failed load leaves it for the next call. */
export const fetchDress = async (id: ThemeId) => {
  try {
    await loadDress(id);
  } catch {
    // Left undressed; the next call tries again.
  }
};

/** Starts every theme's dress loading, for the themes menu's pieces. */
export const loadDresses = async () => {
  await Promise.all(THEMES.map(({ id }) => fetchDress(id)));
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A theme's dress, loading it if it isn't in: null until it is (and on the server). */
export const useDress = (id: ThemeId): Dress | null => {
  const dress = useSyncExternalStore(
    subscribe,
    () => dressOf(id),
    () => null,
  );
  useEffect(() => {
    void fetchDress(id);
  }, [id]);
  return dress;
};
