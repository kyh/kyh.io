import assert from "node:assert/strict";
import test from "node:test";

import {
  DIAL_PROPERTIES,
  dialVars,
  NO_DIAL,
  readDial,
  TAP_GAP_MS,
  TAPS,
  tapStreak,
  themeOf,
  writeDial,
} from "./dial";

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

test("no dial sets nothing", () => {
  assert.deepEqual(dialVars(NO_DIAL), []);
});

test("brightness is a clamped percentage", () => {
  assert.deepEqual(dialVars({ hue: null, light: 42.4 }), [["--dial-light", "42%"]]);
  assert.deepEqual(dialVars({ hue: null, light: 140 }), [["--dial-light", "100%"]]);
});

test("hue retints every grey and wraps the wheel", () => {
  const vars = new Map(dialVars({ hue: 380, light: null }));
  assert.equal(vars.size, 13);
  assert.equal(vars.get("--colors-gray500"), "oklch(55.4% 0.092 20)");
  assert.ok([...vars.values()].every((value) => value.endsWith(" 20)")));
});

test("every property a dial sets is one it can clear", () => {
  const set = dialVars({ hue: 90, light: 30 }).map(([property]) => property);
  assert.deepEqual(set, DIAL_PROPERTIES);
});

test("a dial round-trips through storage; junk reads as none", () => {
  for (const dial of [NO_DIAL, { hue: 120, light: 30 }, { hue: null, light: 0 }]) {
    assert.deepEqual(readDial(writeDial(dial)), dial);
  }
  assert.deepEqual(readDial(null), NO_DIAL);
  assert.deepEqual(readDial("nope"), NO_DIAL);
  assert.deepEqual(readDial("200,-5"), NO_DIAL);
});
