import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverEgg,
  EASTER_EGGS,
  foundEggs,
  huntedEggs,
  progressOf,
  subscribeToEggs,
} from "./store";

test("each egg is found once, and only a new find is heard", () => {
  const heard: string[] = [];
  const stop = subscribeToEggs((id) => heard.push(id));
  discoverEgg("lift");
  discoverEgg("lift");
  discoverEgg("chat");
  stop();
  discoverEgg("shapes");
  assert.deepEqual(heard, ["lift", "chat"]);
  assert.deepEqual(foundEggs(), ["lift", "chat", "shapes"]);
});

test("a touch-only hunt leaves out the egg that needs a keyboard", () => {
  assert.deepEqual(huntedEggs(false), EASTER_EGGS);
  assert.ok(!huntedEggs(true).includes("chat"));
  assert.equal(huntedEggs(true).length, EASTER_EGGS.length - 1);
});

test("a hunt is done once every egg in it is found, whatever else was", () => {
  const hunted = huntedEggs(true);
  const allButOne = hunted.slice(1);
  assert.deepEqual(progressOf(["chat", ...allButOne], hunted), {
    count: hunted.length - 1,
    done: false,
    total: hunted.length,
  });
  assert.equal(progressOf([...hunted], hunted).done, true);
});
