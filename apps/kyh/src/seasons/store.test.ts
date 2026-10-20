import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_SEASON, SEASONS, seasonOn } from "./seasons";
import {
  calendarSeason,
  chooseTheme,
  currentSeason,
  currentTheme,
  subscribeToTheme,
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

test("a season brings its own light or dark; plain light or dark is the visitor's, which a tap flips", () => {
  chooseTheme("halloween");
  assert.deepEqual(currentTheme(), { mode: "dark", own: "light", season: "halloween" });
  // A tap takes a season back to plain, as the visitor had it.
  toggleTheme();
  assert.deepEqual(currentTheme(), { mode: "light", own: "light", season: DEFAULT_SEASON });
  toggleTheme();
  assert.deepEqual(currentTheme(), { mode: "dark", own: "dark", season: DEFAULT_SEASON });
  chooseTheme("easter");
  assert.deepEqual(currentTheme(), { mode: "light", own: "dark", season: "easter" });
  toggleTheme();
  assert.equal(currentTheme().mode, "dark");
  toggleTheme();
  chooseTheme(calendarSeason());
});

test("a theme is the same object until it changes, as a snapshot must be", () => {
  assert.equal(currentTheme(), currentTheme());
});

test("a tap back to the system's own light or dark forgets the pick, so the theme follows the system again", () => {
  const kept = new Map<string, string>();
  const storage = {
    getItem: (key: string) => kept.get(key) ?? null,
    removeItem: (key: string) => kept.delete(key),
    setItem: (key: string, value: string) => kept.set(key, value),
  };
  Object.assign(globalThis, { localStorage: storage });
  try {
    chooseTheme(DEFAULT_SEASON);
    // Without a window the system is light.
    if (currentTheme().mode === "dark") {
      toggleTheme();
    }
    toggleTheme();
    assert.equal(currentTheme().mode, "dark");
    assert.equal(kept.get("theme"), "dark");
    toggleTheme();
    assert.equal(currentTheme().mode, "light");
    assert.equal(kept.has("theme"), false);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
    chooseTheme(calendarSeason());
  }
});
