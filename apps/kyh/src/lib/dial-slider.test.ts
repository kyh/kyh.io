import assert from "node:assert/strict";
import test from "node:test";

import { percentOf, roundToStep, rubberStretch, snapToDecile, valueAt } from "./dial-slider";

const hue = { max: 360, min: 0, step: 1 };

test("a fraction maps onto the range, clamped", () => {
  assert.equal(valueAt(0.5, hue), 180);
  assert.equal(valueAt(-1, hue), 0);
  assert.equal(valueAt(2, hue), 360);
  assert.equal(percentOf(90, hue), 25);
});

test("clicks near a tenth land on it; others stay put", () => {
  assert.equal(snapToDecile(37, hue), 36);
  assert.equal(snapToDecile(50, hue), 50);
});

test("values round to the step", () => {
  assert.equal(roundToStep(41.6, hue), 42);
  assert.equal(roundToStep(400, hue), 360);
});

test("the track only gives past a dead zone, and never more than 8px", () => {
  assert.equal(rubberStretch(20, 1), 0);
  assert.ok(rubberStretch(100, 1) > 0);
  assert.ok(rubberStretch(100, -1) < 0);
  assert.equal(rubberStretch(10_000, 1), 8);
});
