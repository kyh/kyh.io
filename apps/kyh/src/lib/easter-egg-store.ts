// This visitor's found eggs, kept in their browser. Module-level so anything
// can find one — a React component or the town's engine — with one call.
import type { EasterEggId, Found } from "@/lib/easter-eggs";
import { discover, isComplete, readFound } from "@/lib/easter-eggs";

const KEY = "kyh:easter-eggs";
const NONE: Found = [];

/** The egg just found, for the toast; `at` tells two finds apart. */
export interface Discovery {
  id: EasterEggId;
  at: number;
}

interface Snapshot {
  found: Found;
  latest: Discovery | null;
}

const EMPTY: Snapshot = { found: NONE, latest: null };

let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();

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

export const getEggs = (): Snapshot => {
  snapshot ??= { found: load(), latest: null };
  return snapshot;
};

export const getServerEggs = (): Snapshot => EMPTY;

export const subscribeToEggs = (listener: () => void) => {
  listeners.add(listener);
  // Another tab found one.
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      snapshot = { found: load(), latest: getEggs().latest };
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

/** Found it: counted once, announced once. */
export const discoverEgg = (id: EasterEggId) => {
  const current = getEggs();
  const { found, fresh } = discover(current.found, id);
  if (!fresh) {
    return;
  }
  save(found);
  snapshot = { found, latest: { at: Date.now(), id } };
  for (const listener of listeners) {
    listener();
  }
};

/** Whether this visitor has found every egg; false through the server render. */
export const eggsComplete = () => typeof window !== "undefined" && isComplete(getEggs().found);
