import assert from "node:assert/strict";
import test from "node:test";

import { missingGradients } from "./art";
import { DEFAULT_THEME, THEMES, themeOn, windowIn } from "./index";

const on = (year: number, month: number, day: number) => themeOn(new Date(year, month - 1, day));

test("the calendar picks each holiday's theme, and the default between them", () => {
  assert.equal(on(2026, 1, 1), DEFAULT_THEME);
  assert.equal(on(2026, 2, 17), "lunarNewYear");
  assert.equal(on(2026, 2, 14), "valentines");
  assert.equal(on(2026, 3, 17), "stPatricks");
  assert.equal(on(2026, 4, 5), "easter");
  assert.equal(on(2026, 4, 6), "easter");
  assert.equal(on(2026, 7, 4), DEFAULT_THEME);
  assert.equal(on(2026, 10, 24), DEFAULT_THEME);
  assert.equal(on(2026, 10, 25), "halloween");
  assert.equal(on(2026, 10, 31), "halloween");
  assert.equal(on(2026, 11, 1), DEFAULT_THEME);
  assert.equal(on(2026, 11, 26), "thanksgiving");
  assert.equal(on(2026, 12, 25), "christmas");
});

test("where two overlap, the one listed first runs", () => {
  // 2029's Lunar New Year's Eve, Feb 12, falls in Valentine's week.
  assert.equal(on(2029, 2, 12), "lunarNewYear");
  assert.equal(on(2029, 2, 10), "valentines");
});

test("each theme is whole: one id, its art's gradients, confetti, and only the default runs always, keeps the visitor's light or dark wears the sun or moon, and only it leaves no trail", () => {
  assert.equal(new Set(THEMES.map(({ id }) => id)).size, THEMES.length);
  for (const theme of THEMES) {
    assert.ok(theme.art.layers.length > 0, theme.id);
    assert.deepEqual(missingGradients(theme.art), [], theme.id);
    assert.ok(theme.confetti.length > 0, theme.id);
    assert.equal("days" in theme, theme.id !== DEFAULT_THEME, theme.id);
    assert.equal(theme.tint === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(theme.mode === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(theme.glyph === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(theme.trail, theme.id !== DEFAULT_THEME, theme.id);
  }
});

test("every theme's days fall within one year, as the calendar looks only in the day's own", () => {
  for (const theme of THEMES) {
    for (let year = 2024; year <= 2040; year += 1) {
      const days = windowIn(theme, year);
      const inYear = (key: number) => Math.floor(key / 10_000) === year;
      assert.ok(
        days === null || (inYear(days[0]) && inYear(days[1]) && days[0] <= days[1]),
        `${theme.id} ${year}`,
      );
    }
  }
});
