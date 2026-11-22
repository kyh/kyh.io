export const EASTER_EGGS = ["lift", "chat", "shapes", "bloom", "reorder", "speedread"] as const;

export type EasterEggId = (typeof EASTER_EGGS)[number];

const NEEDS_KEYBOARD: ReadonlySet<EasterEggId> = new Set(["chat"]);

/** The eggs a visitor can find: all of them, less the keyboard's on a touch-only device. */
export const huntedEggs = (touchOnly: boolean) =>
  touchOnly ? EASTER_EGGS.filter((id) => !NEEDS_KEYBOARD.has(id)) : EASTER_EGGS;

/** How far along a hunt is; a find outside it (a phone with a keyboard after all) doesn't count. */
export const progressOf = (found: readonly EasterEggId[], hunted: readonly EasterEggId[]) => {
  const count = hunted.filter((id) => found.includes(id)).length;

  return { count, done: count === hunted.length, total: hunted.length };
};

let found: readonly EasterEggId[] = [];
const listeners = new Set<(id: EasterEggId) => void>();

/** This visitor's found eggs, in the order they were found. */
export const foundEggs = () => found;

/** Hear each new find. */
export const subscribeToEggs = (listener: (id: EasterEggId) => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** Found it: counted once, celebrated once. */
export const discoverEgg = (id: EasterEggId) => {
  if (found.includes(id)) {
    return;
  }

  found = [...found, id];

  for (const listener of listeners) {
    listener(id);
  }
};
