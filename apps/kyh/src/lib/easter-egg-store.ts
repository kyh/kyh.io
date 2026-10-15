// This visitor's found eggs, for this page load only: a refresh starts the
// hunt over. Module-level so anything can find one — a React component or the
// town's engine — with one call.
import type { EasterEggId, Found } from "@/lib/easter-eggs";
import { discover, isComplete } from "@/lib/easter-eggs";

const NONE: Found = [];

let found: Found = NONE;
const listeners = new Set<() => void>();
const finders = new Set<(id: EasterEggId) => void>();

/** This visitor's found eggs. */
export const getEggs = (): Found => found;

export const getServerEggs = (): Found => NONE;

export const subscribeToEggs = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Hear each new find as it happens. */
export const onDiscover = (finder: (id: EasterEggId) => void) => {
  finders.add(finder);
  return () => {
    finders.delete(finder);
  };
};

/** Found it: counted once, celebrated once. */
export const discoverEgg = (id: EasterEggId) => {
  const next = discover(found, id);
  if (!next.fresh) {
    return;
  }
  ({ found } = next);
  for (const finder of finders) {
    finder(id);
  }
  for (const listener of listeners) {
    listener();
  }
};

/** Whether this visitor has found every egg. */
export const eggsComplete = () => isComplete(found);
