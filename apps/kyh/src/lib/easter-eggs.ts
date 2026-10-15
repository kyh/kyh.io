// The site's easter eggs: what there is to find, and which of them this
// visitor has found. Pure, so the rules are asserted without a browser; the
// store that keeps them and the burst that celebrates them sit on top.

/** Every egg on the site. Add one here and `discoverEgg(id)` it where it hides. */
export const EASTER_EGGS = [
  {
    id: "lift",
    name: "Heavy lifter",
    note: "You picked someone up in the town.",
  },
  {
    id: "chat",
    name: "Say anything",
    note: "No text box needed: typing anywhere talks.",
  },
  {
    id: "shapes",
    name: "Shape shifter",
    note: "Tapping the empty space at the bottom of the homepage drops more shapes.",
  },
] as const;

export type EasterEgg = (typeof EASTER_EGGS)[number];
export type EasterEggId = EasterEgg["id"];

/** Found eggs, in the order they were found. */
export type Found = readonly EasterEggId[];

/** Find an egg; `fresh` is false when it was already found. */
export const discover = (found: Found, id: EasterEggId): { found: Found; fresh: boolean } =>
  found.includes(id) ? { found, fresh: false } : { found: [...found, id], fresh: true };

/** Whether every egg is found. */
export const isComplete = (found: Found) => EASTER_EGGS.every((egg) => found.includes(egg.id));
