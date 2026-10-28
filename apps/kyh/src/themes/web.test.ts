import assert from "node:assert/strict";
import test from "node:test";

import { HANG, spiderLegs, WALK, WEB_PATH, WEB_SIZE } from "./web";

const legsIn = (gait: 0 | 1) => spiderLegs(gait).split("M").length - 1;

const numbers = (path: string) => [...path.matchAll(/-?\d+(?:\.\d+)?/gu)].map(([n]) => Number(n));

test("the web stays in its corner's box, and the spider hangs on it", () => {
  for (const n of numbers(WEB_PATH)) {
    assert.ok(n >= 0 && n <= WEB_SIZE, `${n}`);
  }
  assert.ok(WEB_PATH.includes(WALK));
  assert.ok(HANG.x > 0 && HANG.y > 0 && Math.hypot(HANG.x, HANG.y) < WEB_SIZE);
});

test("a spider's two gaits split its eight legs four and four", () => {
  assert.equal(legsIn(0), 4);
  assert.equal(legsIn(1), 4);
});
