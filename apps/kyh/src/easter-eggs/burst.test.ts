import assert from "node:assert/strict";
import test from "node:test";

import { burstOf, EGGS_PER_FIND } from "./burst";

const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
};

test("a find throws a set number of eggs, upward, landing one at a time", () => {
  const { eggs } = burstOf(seeded(7));
  assert.equal(eggs.length, EGGS_PER_FIND);
  for (const egg of eggs) {
    assert.ok(egg.y < 0, "eggs spray up out of the cursor");
  }
  const delays = eggs.map((egg) => egg.delay);
  assert.deepEqual(
    delays,
    delays.toSorted((a, b) => a - b),
  );
  assert.equal(new Set(delays).size, delays.length);
});

test("confetti pops up before it falls", () => {
  const { confetti } = burstOf(seeded(3));
  assert.ok(confetti.length > 0);
  for (const bit of confetti) {
    assert.ok(bit.up < 0);
    assert.ok(bit.fall > 0);
  }
});
