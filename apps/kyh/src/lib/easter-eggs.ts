// The site's easter eggs: what there is to find, and which of them this
// visitor has found. Pure, so the rules are asserted without a browser; the
// store that keeps them and the toast that announces them sit on top.
import type { JsonValue } from "@vibedgames/multiplayer";

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
] as const;

export type EasterEgg = (typeof EASTER_EGGS)[number];
export type EasterEggId = EasterEgg["id"];

/** Found eggs, in the order they were found. */
export type Found = readonly EasterEggId[];

export const isEasterEggId = (value: unknown): value is EasterEggId =>
  EASTER_EGGS.some((egg) => egg.id === value);

export const eggById = (id: EasterEggId): EasterEgg =>
  EASTER_EGGS.find((egg) => egg.id === id) ?? EASTER_EGGS[0];

/** What was stored, as found eggs: anything unreadable, unknown or repeated is dropped. */
export const readFound = (raw: string | null): Found => {
  if (!raw) {
    return [];
  }
  try {
    const parsed: JsonValue = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isEasterEggId))] : [];
  } catch {
    return [];
  }
};

/** Find an egg; `fresh` is false when it was already found. */
export const discover = (found: Found, id: EasterEggId): { found: Found; fresh: boolean } =>
  found.includes(id) ? { found, fresh: false } : { found: [...found, id], fresh: true };

/** Whether every egg is found. */
export const isComplete = (found: Found) => EASTER_EGGS.every((egg) => found.includes(egg.id));
