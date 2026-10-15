import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";

import { dialValue, readDial, restoreScript, TAP_GAP_MS, TAPS, tapStreak, themeOf } from "./dial";

test("quick taps build a streak; a pause starts over", () => {
  let taps: number[] = [];
  for (let i = 0; i < TAPS; i += 1) {
    taps = tapStreak(taps, i * 200);
  }
  assert.equal(taps.length, TAPS);
  assert.deepEqual(tapStreak(taps, 800 + TAP_GAP_MS + 1), [800 + TAP_GAP_MS + 1]);
  assert.deepEqual(tapStreak([], 5), [5]);
});

test("the light half wears the light theme", () => {
  assert.equal(themeOf(100), "light");
  assert.equal(themeOf(50), "light");
  assert.equal(themeOf(49), "dark");
  assert.equal(themeOf(0), "dark");
});

test("brightness is a clamped percentage; none clears it", () => {
  assert.equal(dialValue(null), null);
  assert.equal(dialValue(42.4), "42%");
  assert.equal(dialValue(140), "100%");
});

test("a stored brightness reads back; junk reads as none", () => {
  assert.equal(readDial("30"), 30);
  assert.equal(readDial("0"), 0);
  assert.equal(readDial(null), null);
  assert.equal(readDial(""), null);
  assert.equal(readDial("nope"), null);
  assert.equal(readDial("200"), null);
  assert.equal(readDial("70,257"), null);
});

const restoreWith = (stored: string | null) => {
  const style = new Map<string, string>();
  const dataset: Record<string, string> = {};
  const documentElement = {
    dataset,
    style: { setProperty: (name: string, value: string) => style.set(name, value) },
  };
  runInNewContext(restoreScript, {
    document: { documentElement },
    localStorage: { getItem: () => stored },
  });
  return { dial: "dial" in dataset, light: style.get("--dial-light") };
};

test("the restore script applies a stored brightness and ignores anything else", () => {
  assert.deepEqual(restoreWith("30"), { dial: true, light: "30%" });
  assert.deepEqual(restoreWith(null), { dial: false, light: undefined });
  assert.deepEqual(restoreWith("nope"), { dial: false, light: undefined });
});
