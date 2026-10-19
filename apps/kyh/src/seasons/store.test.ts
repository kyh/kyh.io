import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SEASON, SEASONS, seasonOf, seasonOn } from "./seasons";
import {
  calendarSeason,
  chooseTheme,
  currentSeason,
  currentTheme,
  subscribeToTheme,
  themeIdOf,
  toggleTheme,
} from "./store";

test("the calendar's season plays until another is chosen, and choosing it again hands it back", () => {
  assert.equal(calendarSeason(), seasonOn(new Date()));
  assert.equal(currentSeason(), calendarSeason());
  const other = SEASONS.find(({ id }) => id !== calendarSeason() && id !== DEFAULT_SEASON);
  assert.ok(other);
  let heard = 0;
  const stop = subscribeToTheme(() => {
    heard += 1;
  });
  chooseTheme(other.id);
  assert.equal(currentSeason(), other.id);
  chooseTheme(calendarSeason());
  assert.equal(currentSeason(), seasonOn(new Date()));
  stop();
  chooseTheme(other.id);
  assert.equal(heard, 2);
  chooseTheme(calendarSeason());
});

test("a season brings its own light or dark; plain light or dark is the visitor's", () => {
  chooseTheme("halloween");
  assert.deepEqual(currentTheme(), { mode: "dark", season: "halloween" });
  assert.equal(themeIdOf(currentTheme()), "halloween");
  chooseTheme("dark");
  assert.deepEqual(currentTheme(), { mode: "dark", season: DEFAULT_SEASON });
  assert.equal(themeIdOf(currentTheme()), "dark");
  chooseTheme("light");
  assert.equal(currentTheme().mode, "light");
  chooseTheme(calendarSeason());
});

test("a tap flips plain light or dark, and takes a season back to plain", () => {
  chooseTheme("light");
  toggleTheme();
  assert.equal(themeIdOf(currentTheme()), "dark");
  toggleTheme();
  assert.equal(themeIdOf(currentTheme()), "light");
  chooseTheme("christmas");
  toggleTheme();
  assert.equal(themeIdOf(currentTheme()), "light");
  chooseTheme(calendarSeason());
});

test("a theme is the same object until it changes, as a snapshot must be", () => {
  assert.equal(currentTheme(), currentTheme());
});

test("every season but the default brings its own light or dark", () => {
  for (const { id, mode } of SEASONS) {
    assert.equal(mode === null, id === DEFAULT_SEASON, id);
  }
  assert.equal(seasonOf("halloween").mode, "dark");
});
