import assert from "node:assert/strict";
import test from "node:test";

import { discover, EASTER_EGGS, isComplete, readFound } from "./easter-eggs";

test("stored eggs read back; junk, unknown ids and repeats are dropped", () => {
  assert.deepEqual(readFound(null), []);
  assert.deepEqual(readFound("not json"), []);
  assert.deepEqual(readFound('{"lift":true}'), []);
  assert.deepEqual(readFound('["chat","nope",3,"chat","lift"]'), ["chat", "lift"]);
});

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
