// Park–Miller minimal standard generator: deterministic across runs and
// machines, so the city is the same town on every visit.
const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;

export interface Random {
  /** Uniform in [0, 1). */
  next: () => number;
  /** Uniform in [min, max). */
  range: (min: number, max: number) => number;
  /** Integer in [min, max). */
  int: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
}

export const createRandom = (seed: number): Random => {
  let state = Math.abs(Math.floor(seed)) % MODULUS;
  if (state === 0) {
    state = 1;
  }
  const next = () => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
  const range = (min: number, max: number) => min + next() * (max - min);
  const int = (min: number, max: number) => Math.floor(range(min, max));
  return {
    chance: (probability) => next() < probability,
    int,
    next,
    pick: (items) => {
      const item = items[int(0, items.length)];
      if (item === undefined) {
        throw new RangeError("Cannot pick from an empty list");
      }
      return item;
    },
    range,
  };
};

/** A stable number for a string, to seed per-building variety. */
export const hashString = (text: string) => {
  let hash = 7;
  for (const char of text) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return hash;
};
