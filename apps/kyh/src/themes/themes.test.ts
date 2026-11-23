import assert from "node:assert/strict";
import test from "node:test";

import { dateOf, lunarNewYear } from "./calendar";
import { FOLLOWERS } from "./followers";
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
  assert.equal(on(2026, 10, 17), DEFAULT_THEME);
  assert.equal(on(2026, 10, 18), "halloween");
  assert.equal(on(2026, 11, 2), "halloween");
  assert.equal(on(2026, 11, 3), DEFAULT_THEME);
  assert.equal(on(2026, 11, 26), "thanksgiving");
  assert.equal(on(2026, 11, 30), "thanksgiving");
  assert.equal(on(2026, 12, 1), "christmas");
  assert.equal(on(2026, 12, 31), "christmas");
});

test("where two overlap, the one listed first runs", () => {
  assert.equal(on(2029, 2, 12), "lunarNewYear");
  assert.equal(on(2029, 2, 10), "valentines");
  assert.equal(on(2035, 3, 20), "easter");
  assert.equal(on(2035, 3, 19), "stPatricks");
});

test("Valentine's interrupts Lunar New Year's long run, but not its eve or first three days", () => {
  assert.equal(on(2027, 2, 6), "lunarNewYear");
  assert.equal(on(2027, 2, 8), "lunarNewYear");
  assert.equal(on(2027, 2, 9), "valentines");
  assert.equal(on(2027, 2, 14), "valentines");
  assert.equal(on(2027, 2, 16), "lunarNewYear");
  assert.equal(on(2027, 2, 20), "lunarNewYear");
  assert.equal(on(2026, 2, 7), "valentines");
  assert.equal(on(2026, 2, 15), "valentines");
  assert.equal(on(2026, 2, 16), "lunarNewYear");
  assert.equal(on(2026, 3, 3), "lunarNewYear");
  assert.equal(on(2029, 2, 14), "lunarNewYear");
  assert.equal(on(2029, 2, 16), "lunarNewYear");
});

test("every year from 2024 to 2040 keeps some Valentine's days and Lunar New Year's day", () => {
  for (let year = 2024; year <= 2040; year += 1) {
    const days = Array.from({ length: 9 }, (_, offset) => on(year, 2, 7 + offset));
    const first = lunarNewYear(year);
    assert.ok(days.includes("valentines"), `${year}`);
    assert.ok(first !== null && themeOn(dateOf(first)) === "lunarNewYear", `${year}`);
  }
});

test("each theme is whole: one id, its art, confetti, and only the default runs always, keeps the visitor's light or dark wears the sun or moon, and only it has nothing following the mouse", () => {
  assert.equal(new Set(THEMES.map(({ id }) => id)).size, THEMES.length);

  for (const theme of THEMES) {
    assert.ok(theme.art.layers.length > 0, theme.id);
    assert.ok(theme.confetti.length > 0, theme.id);
    assert.equal("days" in theme, theme.id !== DEFAULT_THEME, theme.id);
    assert.equal(theme.tint === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(theme.mode === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(theme.glyph === null, theme.id === DEFAULT_THEME, theme.id);
    assert.equal(FOLLOWERS[theme.id] === null, theme.id === DEFAULT_THEME, theme.id);
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
