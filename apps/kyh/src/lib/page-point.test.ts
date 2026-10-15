import assert from "node:assert/strict";
import test from "node:test";

import { toPage, toScreen } from "./page-point";

test("a spot over the same content lands on it at any width and scroll", () => {
  const wide = { scrollX: 0, scrollY: 0, width: 1600 };
  const narrow = { scrollX: 0, scrollY: 900, width: 1000 };
  const point = toPage(900, 1200, wide);
  assert.deepEqual(point, { fromCenter: 100, fromTop: 1200 });
  assert.deepEqual(toScreen(point, narrow), { x: 600, y: 300 });
});

test("scrolled senders send where they are on the page, not on screen", () => {
  assert.deepEqual(toPage(500, 100, { scrollX: 0, scrollY: 2000, width: 1000 }), {
    fromCenter: 0,
    fromTop: 2100,
  });
});

test("the round trip is exact on one screen", () => {
  const view = { scrollX: 30, scrollY: 450, width: 1280 };
  assert.deepEqual(toScreen(toPage(17, 88, view), view), { x: 17, y: 88 });
});
