import assert from "node:assert/strict";
import test from "node:test";

import { discoverEgg, foundEggs, subscribeToEggs } from "./store";

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
