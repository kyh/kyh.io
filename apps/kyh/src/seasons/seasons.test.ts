import assert from "node:assert/strict";
import test from "node:test";

import { missingGradients } from "./art";
import { DEFAULT_SEASON, SEASONS, seasonOn, windowIn } from "./seasons";

const on = (year: number, month: number, day: number) => seasonOn(new Date(year, month - 1, day));

test("the calendar picks each holiday's season, and the default between them", () => {
  assert.equal(on(2026, 1, 1), DEFAULT_SEASON);
  assert.equal(on(2026, 2, 17), "lunarNewYear");
  assert.equal(on(2026, 2, 14), "valentines");
  assert.equal(on(2026, 3, 17), "stPatricks");
  assert.equal(on(2026, 4, 5), "easter");
  assert.equal(on(2026, 4, 6), "easter");
  assert.equal(on(2026, 7, 4), DEFAULT_SEASON);
  assert.equal(on(2026, 10, 24), DEFAULT_SEASON);
  assert.equal(on(2026, 10, 25), "halloween");
  assert.equal(on(2026, 10, 31), "halloween");
  assert.equal(on(2026, 11, 1), DEFAULT_SEASON);
  assert.equal(on(2026, 11, 26), "thanksgiving");
  assert.equal(on(2026, 12, 25), "christmas");
});

test("where two overlap, the one listed first runs", () => {
  // 2029's Lunar New Year's Eve, Feb 12, falls in Valentine's week.
  assert.equal(on(2029, 2, 12), "lunarNewYear");
  assert.equal(on(2029, 2, 10), "valentines");
});

test("each season is whole: one id, its art's gradients, confetti, and only the default runs always, keeps the visitor's light or dark and wears the sun or moon", () => {
  assert.equal(new Set(SEASONS.map(({ id }) => id)).size, SEASONS.length);
  for (const season of SEASONS) {
    assert.ok(season.art.layers.length > 0, season.id);
    assert.deepEqual(missingGradients(season.art), [], season.id);
    assert.ok(season.confetti.length > 0, season.id);
    assert.equal("days" in season, season.id !== DEFAULT_SEASON, season.id);
    assert.equal(season.tint === null, season.id === DEFAULT_SEASON, season.id);
    assert.equal(season.mode === null, season.id === DEFAULT_SEASON, season.id);
    assert.equal(season.glyph === null, season.id === DEFAULT_SEASON, season.id);
  }
});

test("every season's days fall within one year, as the calendar looks only in the day's own", () => {
  for (const season of SEASONS) {
    for (let year = 2024; year <= 2040; year += 1) {
      const days = windowIn(season, year);
      const inYear = (key: number) => Math.floor(key / 10_000) === year;
      assert.ok(
        days === null || (inYear(days[0]) && inYear(days[1]) && days[0] <= days[1]),
        `${season.id} ${year}`,
      );
    }
  }
});
