import assert from "node:assert/strict";
import test from "node:test";

import { LAG, SPELL, scrambleFrame, scrambleTicks } from "./scramble";

const noise = ["#"];
const frame = (text: string, tick: number, reading = "") =>
  scrambleFrame(text, reading, tick, noise, Math.random);

test("the text types itself out one glyph a tick, keeping its spaces", () => {
  assert.equal(frame("ab cd", 0), "");
  assert.equal(frame("ab cd", 2), "##");
  assert.equal(frame("ab cd", 4), "## #");
});

test("letters settle left to right LAG ticks behind the typing", () => {
  assert.equal(frame("ab cd", LAG + 1), "a# ##");
  assert.equal(frame("ab cd", LAG + 4), "ab c#");
});

test("the text is whole once every letter has settled, and stays so", () => {
  assert.equal(scrambleTicks("ab cd"), 5 + LAG);
  assert.equal(frame("ab cd", scrambleTicks("ab cd")), "ab cd");
  assert.equal(frame("ab cd", scrambleTicks("ab cd") + 5), "ab cd");
});

test("each glyph scrambles SPELL ticks, then lands on its letter of the reading", () => {
  assert.equal(frame("ab cd", SPELL, "xy z"), "## ##");
  assert.equal(frame("abc d", SPELL, "xy z"), "## ##");
  assert.equal(frame("ab cd", SPELL + 2, "xy z"), "xy ##");
  assert.equal(frame("ab cd", SPELL + 5, "xy z"), "xy z#");
  assert.equal(frame("ab cd", LAG + 2, "xy z"), "ab z#");
});

test("a reading longer than the text shows whole until the text settles over it", () => {
  assert.equal(scrambleTicks("ab", "wxyz"), 4 + LAG);
  assert.equal(frame("ab", SPELL + 4, "wxyz"), "wxyz");
  assert.equal(frame("ab", LAG + 3, "wxyz"), "abz");
  assert.equal(frame("ab", scrambleTicks("ab", "wxyz"), "wxyz"), "ab");
});
