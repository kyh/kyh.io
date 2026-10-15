// The site's easter eggs and which this visitor has found, for this page load
// only: a refresh starts the hunt over. Module-level, so anything finds one with
// a single `discoverEgg(id)` where it hides, a React component or the town's
// engine alike; `provider.tsx` celebrates each find.

export const EASTER_EGGS = [
  // Pick up a car or person in /showcase (city/engine.ts).
  "lift",
  // Send a line of chat: typing anywhere talks (lib/chat-input.ts).
  "chat",
  // Tap the homepage's figure canvas to drop shapes (figure-canvas.tsx).
  "shapes",
] as const;

export type EasterEggId = (typeof EASTER_EGGS)[number];

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
