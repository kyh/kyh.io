import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptOrder,
  applyReorder,
  hostReorder,
  ordersEntry,
  parseReorder,
  readSharedOrder,
} from "./shared-order";

test("a reorder intent parses only in the right shape", () => {
  assert.deepEqual(parseReorder({ grid: "side-quests", n: 3, order: ["a", "b"] }), {
    grid: "side-quests",
    n: 3,
    order: ["a", "b"],
  });
  assert.equal(parseReorder(null), null);
  assert.equal(parseReorder(["a"]), null);
  assert.equal(parseReorder({ grid: "", n: 1, order: ["a"] }), null);
  assert.equal(parseReorder({ grid: "g", n: -1, order: ["a"] }), null);
  assert.equal(parseReorder({ grid: "g", n: 1.5, order: ["a"] }), null);
  assert.equal(parseReorder({ grid: "g", n: 1, order: ["a", "a"] }), null);
  assert.equal(parseReorder({ grid: "g", n: 1, order: ["a", 2] }), null);
  assert.equal(parseReorder({ grid: "g", n: 1, order: ["x".repeat(81)] }), null);
  assert.equal(
    parseReorder({ grid: "g", n: 1, order: Array.from({ length: 65 }, (_, i) => `k${i}`) }),
    null,
  );
});

test("prototype keys are never grids or tiles", () => {
  assert.equal(parseReorder({ grid: "__proto__", n: 1, order: ["a"] }), null);
  assert.equal(parseReorder({ grid: "g", n: 1, order: ["constructor"] }), null);
  const orders = applyReorder(
    JSON.parse('{"__proto__": {"by": "p", "n": 0, "order": []}}'),
    { grid: "g", n: 0, order: ["a"] },
    "p",
  );
  assert.deepEqual(Object.keys(orders ?? {}), ["g"]);
  assert.equal(Object.getPrototypeOf(orders), Object.prototype);
});

test("the host writes an intent under its grid and keeps the others", () => {
  const before = { folder: { by: "p1", n: 1, order: ["x"] } };
  assert.deepEqual(applyReorder(before, { grid: "home", n: 2, order: ["b", "a"] }, "p2"), {
    folder: { by: "p1", n: 1, order: ["x"] },
    home: { by: "p2", n: 2, order: ["b", "a"] },
  });
  assert.deepEqual(applyReorder(undefined, { grid: "home", n: 0, order: ["a"] }, "p1"), {
    home: { by: "p1", n: 0, order: ["a"] },
  });
});

test("the host drops malformed entries and refuses a seventeenth grid", () => {
  assert.deepEqual(
    applyReorder(
      { bad: 4, home: { by: "p", n: 0, order: [] } },
      { grid: "home", n: 1, order: ["a"] },
      "q",
    ),
    {
      home: { by: "q", n: 1, order: ["a"] },
    },
  );
  const full = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`g${i}`, { by: "p", n: 0, order: [] }]),
  );
  assert.equal(applyReorder(full, { grid: "new", n: 0, order: ["a"] }, "p"), null);
  assert.notEqual(applyReorder(full, { grid: "g3", n: 1, order: ["a"] }, "p"), null);
});

test("a shared order is read against the tiles this page has", () => {
  assert.deepEqual(readSharedOrder({ by: "p", n: 4, order: ["c", "gone", "a"] }, ["a", "b", "c"]), {
    by: "p",
    n: 4,
    order: ["c", "a", "b"],
  });
  assert.equal(readSharedOrder(undefined, ["a"]), null);
  assert.equal(readSharedOrder({ n: 1, order: ["a"] }, ["a"]), null);
  assert.equal(readSharedOrder({ by: "p", n: "1", order: ["a"] }, ["a"]), null);
  assert.equal(readSharedOrder({ by: "p", n: 1, order: "a" }, ["a"]), null);
});

test("a grid's entry is found under the room's orders", () => {
  const entry = { by: "p", n: 0, order: ["a"] };
  assert.equal(ordersEntry({ orders: { home: entry } }, "home"), entry);
  assert.equal(ordersEntry({ orders: [] }, "home"), undefined);
  assert.equal(ordersEntry(undefined, "home"), undefined);
});

test("the host applies a raw intent, or leaves the room be", () => {
  assert.deepEqual(hostReorder(undefined, { grid: "home", n: 1, order: ["a"] }, "p"), {
    home: { by: "p", n: 1, order: ["a"] },
  });
  assert.equal(hostReorder(undefined, { grid: "home" }, "p"), null);
});

test("a visitor's own drop shows until the room moves past it", () => {
  const base = { by: "other", n: 3, order: ["a", "b"] };
  const mine = { by: "me", n: 2, order: ["b", "a"] };
  const drop = { base, entry: mine };
  // No drop: the room's entry, as is.
  assert.equal(acceptOrder(base), base);
  // The room hasn't heard yet: this visitor's drop.
  assert.equal(acceptOrder(base, drop), mine);
  // A late echo of an earlier drop of theirs is still behind it.
  assert.equal(acceptOrder({ by: "me", n: 1, order: ["a", "b"] }, drop), mine);
  // Its own echo, or anyone's newer drop, is the room moving on.
  const echo = { by: "me", n: 2, order: ["b", "a"] };
  assert.equal(acceptOrder(echo, drop), echo);
  const theirs = { by: "other", n: 4, order: ["a", "b"] };
  assert.equal(acceptOrder(theirs, drop), theirs);
});
