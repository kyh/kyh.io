import assert from "node:assert/strict";
import test from "node:test";

import { WALLS } from "./palette";
import { box, createSketch } from "./sketch";
import { createHeights } from "./heights";

test("over a building its roof is the top; off it the floor is", () => {
  const sketch = createSketch();
  box(sketch, { colors: WALLS, d: 2, h: 1.5, w: 2, x: 4, y: 0, z: 4 });
  const heights = createHeights([sketch], () => 0.04);
  assert.equal(heights(5, 5), 1.5);
  assert.equal(heights(4.1, 5.9), 1.5);
  assert.equal(heights(8, 8), 0.04);
  assert.equal(heights(-50, 50), 0.04);
});

test("the higher of two stacked tops wins, and walls are no tops", () => {
  const sketch = createSketch();
  box(sketch, { colors: WALLS, d: 4, h: 0.5, w: 4, x: 0, y: 0, z: 0 });
  box(sketch, { colors: WALLS, d: 1, h: 2, w: 1, x: 1, y: 0.5, z: 1 });
  const heights = createHeights([sketch], () => 0);
  assert.equal(heights(1.5, 1.5), 2.5);
  assert.equal(heights(3.5, 3.5), 0.5);
});
