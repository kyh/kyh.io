import assert from "node:assert/strict";
import test from "node:test";

import {
  HOLD,
  LAG,
  scrambleFrame,
  scrambleTicks,
  translateFrame,
  translateTicks,
} from "./scramble";

const noise = ["#"];
const frame = (text: string, tick: number) => scrambleFrame(text, tick, noise, Math.random);

test("the text types itself out one glyph a tick, keeping its spaces", () => {
  assert.equal(frame("ab cd", 0), "");
  assert.equal(frame("ab cd", 1), "#");
  assert.equal(frame("ab cd", 2), "##");
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

const translate = (tick: number) => translateFrame("ab cd", "xy z", tick, noise, Math.random);
const read = scrambleTicks("xy z") + HOLD;

test("a reading types out and holds before the text", () => {
  assert.equal(translate(1), "#");
  assert.equal(translate(scrambleTicks("xy z")), "xy z");
  assert.equal(translate(read - 1), "xy z");
});

test("the text then types out over the rest of the reading", () => {
  assert.equal(translate(read), "xy z");
  assert.equal(translate(read + 1), "#y z");
  assert.equal(translate(read + 2), "## z");
  assert.equal(translate(read + LAG + 1), "a# ##");
  assert.equal(translateTicks("ab cd", "xy z"), read + scrambleTicks("ab cd"));
  assert.equal(translate(translateTicks("ab cd", "xy z")), "ab cd");
});

test("a heading with no reading just scrambles", () => {
  assert.equal(translateTicks("ab cd", ""), scrambleTicks("ab cd"));
  assert.equal(translateFrame("ab cd", "", 3, noise, Math.random), "## #");
});
