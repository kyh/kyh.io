import assert from "node:assert/strict";
import test from "node:test";

import { percentOf, roundToStep, rubberStretch, snapToDecile } from "./dial-slider";

const degrees = { max: 360, min: 0, step: 1 };

test("a value's place along the track", () => {
  assert.equal(percentOf(90, degrees), 25);
});

test("clicks near a tenth land on it; others stay put", () => {
  assert.equal(snapToDecile(37, degrees), 36);
  assert.equal(snapToDecile(50, degrees), 50);
});

test("values round to the step", () => {
  assert.equal(roundToStep(41.6, degrees), 42);
  assert.equal(roundToStep(400, degrees), 360);
});

test("the track only gives past a dead zone, and never more than 8px", () => {
  assert.equal(rubberStretch(20), 0);
  assert.equal(rubberStretch(0), 0);
  assert.ok(rubberStretch(100) > 0);
  assert.ok(rubberStretch(-100) < 0);
  assert.equal(rubberStretch(10_000), 8);
  assert.equal(rubberStretch(-10_000), -8);
});
