import assert from "node:assert/strict";
import test from "node:test";

import { readDrop } from "./net";

test("a drop off the wire is read only when it's well formed", () => {
  const from = { x: 1, y: 0.9, z: 3 };
  assert.deepEqual(readDrop({ from, key: "c4", state: [1, 2, 3.5, 7, 9] }), {
    from,
    key: "c4",
    state: [1, 2, 3.5, 7, 9],
  });
  assert.equal(readDrop({ from, key: "zz", state: [1] }), null);
  assert.equal(readDrop({ from: { x: 1, y: 2 }, key: "c4", state: [1] }), null);
  assert.equal(readDrop({ from, key: "c4", state: ["1"] }), null);
  assert.equal(readDrop({ from, key: "c4", state: Array.from({ length: 20 }, () => 1) }), null);
  assert.equal(readDrop({ from, key: 4, state: [1] }), null);
  assert.equal(readDrop("nope"), null);
});
