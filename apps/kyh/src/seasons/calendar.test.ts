import assert from "node:assert/strict";
import test from "node:test";

import {
  around,
  dateOf,
  dayKey,
  dayOf,
  easterSunday,
  lunarNewYear,
  nthWeekday,
  span,
} from "./calendar";

test("a day is yyyymmdd, and rolls over months and years", () => {
  assert.equal(dayKey(new Date(2026, 9, 28, 23, 59)), 20_261_028);
  assert.equal(dayOf(2026, 12, 31, 1), 20_270_101);
  assert.equal(dayOf(2026, 3, 1, -1), 20_260_228);
  assert.equal(dayKey(dateOf(20_280_229)), 20_280_229);
});

test("a span past New Year ends in the next year", () => {
  assert.deepEqual(span(2026, [10, 25], [10, 31]), [20_261_025, 20_261_031]);
  assert.deepEqual(span(2026, [12, 30], [1, 2]), [20_261_230, 20_270_102]);
});

test("days around a date cross into other months", () => {
  assert.deepEqual(around(20_260_301, 2, 1), [20_260_227, 20_260_302]);
});

test("Easter falls on its known Sundays", () => {
  const known = {
    2008: 20_080_323,
    2024: 20_240_331,
    2025: 20_250_420,
    2026: 20_260_405,
    2027: 20_270_328,
    2038: 20_380_425,
  };
  for (const [year, sunday] of Object.entries(known)) {
    assert.equal(easterSunday(Number(year)), sunday, year);
    assert.equal(dateOf(sunday).getDay(), 0);
  }
});

test("Thanksgiving is the fourth Thursday of November", () => {
  assert.equal(nthWeekday(2025, 11, 4, 4), 20_251_127);
  assert.equal(nthWeekday(2026, 11, 4, 4), 20_261_126);
  assert.equal(nthWeekday(2027, 11, 4, 4), 20_271_125);
});

test("Lunar New Year comes from its table, and nothing past it", () => {
  assert.equal(lunarNewYear(2026), 20_260_217);
  assert.equal(lunarNewYear(2030), 20_300_203);
  assert.equal(lunarNewYear(2099), null);
});
