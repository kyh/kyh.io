import assert from "node:assert/strict";
import test from "node:test";

import { discover, EASTER_EGGS, isComplete } from "./easter-eggs";

test("finding an egg adds it once", () => {
  const first = discover([], "lift");
  assert.deepEqual(first, { found: ["lift"], fresh: true });
  const again = discover(first.found, "lift");
  assert.equal(again.fresh, false);
  assert.equal(again.found, first.found);
});

test("complete only once every egg is found", () => {
  assert.equal(isComplete([]), false);
  assert.equal(isComplete(["lift"]), false);
  assert.equal(isComplete(EASTER_EGGS.map((egg) => egg.id)), true);
});
