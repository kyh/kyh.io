import assert from "node:assert/strict";
import { test } from "node:test";
import { levelCount, levelFor, parentOf, tilesIn } from "./pyramid";

test("the level is the finest one not finer than the screen", () => {
  assert.equal(levelFor(1, 5), 0);
  assert.equal(levelFor(2, 5), 0);
  assert.equal(levelFor(0.5, 5), 1);
  assert.equal(levelFor(0.3, 5), 1);
  assert.equal(levelFor(0.001, 5), 4);
});

test("tiles in a rectangle, negative ones included", () => {
  assert.deepEqual(tilesIn({ h: 10, w: 600, x: -10, y: 0 }, 0, 512), [
    { x: -1, y: 0 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ]);
  assert.equal(tilesIn({ h: 1024, w: 1024, x: 0, y: 0 }, 1, 512).length, 1);
  assert.deepEqual(parentOf({ x: -1, y: 3 }), { x: -1, y: 1 });
});

test("levels stop once a tile spans the map", () => {
  assert.equal(levelCount({ h: 100, w: 100 }, 512), 1);
  assert.equal(levelCount({ h: 512, w: 512 }, 512), 1);
  assert.equal(levelCount({ h: 600, w: 3840 }, 512), 4);
});
