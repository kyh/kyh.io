import assert from "node:assert/strict";
import test from "node:test";

import { LAG, scrambleFrame, scrambleTicks } from "./scramble";

const noise = ["#"];
const frame = (text: string, tick: number) => scrambleFrame(text, tick, noise, Math.random);

test("the text types itself out one glyph a tick, keeping its spaces", () => {
  assert.equal(frame("ab cd", 0), " ");
  assert.equal(frame("ab cd", 1), "# ");
  assert.equal(frame("ab cd", 3), "## #");
});

test("letters settle left to right LAG ticks behind the typing", () => {
  assert.equal(frame("ab cd", LAG + 1), "a# ##");
  assert.equal(frame("ab cd", LAG + 3), "ab c#");
});

test("the text is whole once every letter has settled, and stays so", () => {
  assert.equal(scrambleTicks("ab cd"), 4 + LAG);
  assert.equal(frame("ab cd", scrambleTicks("ab cd")), "ab cd");
  assert.equal(frame("ab cd", scrambleTicks("ab cd") + 5), "ab cd");
});
