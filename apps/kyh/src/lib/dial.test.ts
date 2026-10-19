import assert from "node:assert/strict";
import test from "node:test";

import { TAP_GAP_MS, TAPS, tapStreak } from "./dial";

test("quick taps build a streak; a pause starts over", () => {
  let taps: number[] = [];
  for (let i = 0; i < TAPS; i += 1) {
    taps = tapStreak(taps, i * 200);
  }
  assert.equal(taps.length, TAPS);
  assert.deepEqual(tapStreak(taps, 800 + TAP_GAP_MS + 1), [800 + TAP_GAP_MS + 1]);
  assert.deepEqual(tapStreak([], 5), [5]);
});
