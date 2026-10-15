// This visitor's found eggs, kept in their browser. Module-level so anything
// can find one — a React component or the town's engine — with one call.
import type { EasterEggId, Found } from "@/lib/easter-eggs";
import { discover, isComplete, readFound } from "@/lib/easter-eggs";

const KEY = "kyh:easter-eggs";
const NONE: Found = [];

let snapshot: Found | null = null;
const listeners = new Set<() => void>();
const finders = new Set<(id: EasterEggId) => void>();

// Storage can throw (private windows, blocked site data): then eggs last the page load.
const load = (): Found => {
  try {
    return readFound(window.localStorage.getItem(KEY));
  } catch {
    return NONE;
  }
};

const save = (found: Found) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    /* kept in memory only */
  }
};

/** This visitor's found eggs. */
export const getEggs = (): Found => {
  snapshot ??= load();
  return snapshot;
};

export const getServerEggs = (): Found => NONE;

export const subscribeToEggs = (listener: () => void) => {
  listeners.add(listener);
  // Another tab found one.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      snapshot = load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Hear each new find as it happens (another tab's finds aren't celebrated here). */
export const onDiscover = (finder: (id: EasterEggId) => void) => {
  finders.add(finder);
  return () => {
    finders.delete(finder);
  };
};

/** Found it: counted once, celebrated once. */
export const discoverEgg = (id: EasterEggId) => {
  const { found, fresh } = discover(getEggs(), id);
  if (!fresh) {
    return;
  }
  save(found);
  snapshot = found;
  for (const finder of finders) {
    finder(id);
  }
  for (const listener of listeners) {
    listener();
  }
};

/** Whether this visitor has found every egg; false through the server render. */
export const eggsComplete = () => typeof window !== "undefined" && isComplete(getEggs());
