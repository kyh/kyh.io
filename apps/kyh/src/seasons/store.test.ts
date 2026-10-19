import assert from "node:assert/strict";
import test from "node:test";

import { SEASONS, seasonOn } from "./seasons";
import { calendarSeason, chooseSeason, currentSeason, subscribeToSeason } from "./store";

test("the calendar's season plays until another is chosen, and choosing it again hands it back", () => {
  assert.equal(calendarSeason(), seasonOn(new Date()));
  assert.equal(currentSeason(), calendarSeason());
  const other = SEASONS.find(({ id }) => id !== calendarSeason());
  assert.ok(other);
  let heard = 0;
  const stop = subscribeToSeason(() => {
    heard += 1;
  });
  chooseSeason(other.id);
  assert.equal(currentSeason(), other.id);
  chooseSeason(calendarSeason());
  assert.equal(currentSeason(), seasonOn(new Date()));
  stop();
  chooseSeason(other.id);
  assert.equal(heard, 2);
  chooseSeason(calendarSeason());
});
