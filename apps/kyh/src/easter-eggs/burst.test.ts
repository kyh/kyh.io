import assert from "node:assert/strict";
import test from "node:test";

import { burstOf, EGGS_PER_FIND, stepConfetto, throwConfetti } from "./burst";

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

test("confetti leaves the cursor upward, then settles into a slow fall", () => {
  const random = seeded(3);
  const confetti = throwConfetti(random);
  assert.ok(confetti.some((bit) => bit.kind === "paper"));
  assert.ok(confetti.some((bit) => bit.kind === "sequin"));
  for (const bit of confetti) {
    assert.ok(bit.vy < 0, "thrown up");
  }
  for (let frame = 0; frame < 240; frame += 1) {
    for (const bit of confetti) {
      stepConfetto(bit, 1, random);
    }
  }
  for (const bit of confetti) {
    assert.ok(bit.vy > 0 && bit.vy <= 3, "falling, no faster than terminal");
    assert.ok(bit.y > 0, "below where it started");
  }
});

test("paper flips between its two sides as it falls", () => {
  const random = seeded(5);
  const [paper] = throwConfetti(random);
  assert.ok(paper);
  const sides = new Set<boolean>();
  for (let frame = 0; frame < 200; frame += 1) {
    sides.add(stepConfetto(paper, 1, random) > 0);
  }
  assert.equal(sides.size, 2);
});
