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
  // Five quick taps on the theme toggle bloom out the seasons (components/dock.tsx).
  "bloom",
  // Long-press a Side Quests icon and drag it somewhere new (side-quests-grid.tsx).
  "reorder",
  // Open the speed reader, /rsvp (app/rsvp/_components/rsvp-reader.tsx).
  "speedread",
] as const;

export type EasterEggId = (typeof EASTER_EGGS)[number];

// Sending a chat line needs a keyboard, so a phone's hunt leaves it out.
const NEEDS_KEYBOARD: ReadonlySet<EasterEggId> = new Set(["chat"]);

/** The eggs a visitor can find: all of them, less the keyboard's on a touch-only device. */
export const huntedEggs = (touchOnly: boolean): readonly EasterEggId[] =>
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
