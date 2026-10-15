import assert from "node:assert/strict";
import test from "node:test";

import type { Token } from "./palette";
import { brandTint, dominant, fromOklab, glowOf, oklab, PALETTE, untinted } from "./palette";

const hueOf = (hex: string) => {
  const [, a, b] = oklab(hex);
  return Math.atan2(b, a);
};

const turnBetween = (from: number, to: number) =>
  Math.abs(Math.atan2(Math.sin(to - from), Math.cos(to - from)));

test("OKLab round-trips every color in the palette", () => {
  for (const { day, night } of Object.values(PALETTE)) {
    assert.equal(fromOklab(oklab(day)), day);
    assert.equal(fromOklab(oklab(night)), night);
  }
});

test("a building's main color lands on its project's hue, lightness kept", () => {
  const tint = brandTint("roofBlue", "#de35df");
  const tinted = tint(PALETTE.roofBlue.day);
  assert.ok(turnBetween(hueOf(tinted), hueOf("#de35df")) < 0.05);
  assert.ok(Math.abs(oklab(tinted)[0] - oklab(PALETTE.roofBlue.day)[0]) < 0.01);
});

test("greys stay grey and a neutral icon leaves the building as drawn", () => {
  assert.equal(brandTint("roofBlue", "#de35df")(PALETTE.wallLeft.day), PALETTE.wallLeft.day);
  assert.equal(brandTint("roofBlue", "#2e2e2e"), untinted);
  assert.equal(brandTint(null, "#de35df"), untinted);
  assert.equal(brandTint("roofBlue"), untinted);
});

test("the main color is the colored token covering the most, greys aside", () => {
  const areas = new Map<Token, number>([
    ["wallLeft", 100],
    ["navy", 10],
    ["accentYellow", 1],
  ]);
  assert.equal(dominant(areas), "navy");
  assert.equal(dominant(new Map<Token, number>([["wallLeft", 100]])), null);
});

test("a glow is dark enough by day and light enough by night", () => {
  const pale = glowOf("#f8e778");
  assert.ok(oklab(pale.day)[0] <= 0.721);
  const dark = glowOf("#1a2b50");
  assert.ok(oklab(dark.night)[0] >= 0.679);
});
