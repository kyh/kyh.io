import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_THEME, THEMES, themeOn } from "./index";
import {
  calendarTheme,
  chooseTheme,
  currentAppearance,
  currentTheme,
  subscribeToTheme,
  toggleTheme,
} from "./store";

test("the calendar's theme plays until another is chosen, and choosing it again hands it back", () => {
  assert.equal(calendarTheme(), themeOn(new Date()));
  assert.equal(currentTheme(), calendarTheme());
  const other = THEMES.find(({ id }) => id !== calendarTheme() && id !== DEFAULT_THEME);
  assert.ok(other);
  let heard = 0;
  const stop = subscribeToTheme(() => {
    heard += 1;
  });
  chooseTheme(other.id);
  assert.equal(currentTheme(), other.id);
  chooseTheme(calendarTheme());
  assert.equal(currentTheme(), themeOn(new Date()));
  stop();
  chooseTheme(other.id);
  assert.equal(heard, 2);
  chooseTheme(calendarTheme());
});

test("a holiday's theme brings its own light or dark; plain light or dark is the visitor's, which a tap flips", () => {
  chooseTheme("halloween");
  assert.deepEqual(currentAppearance(), { mode: "dark", own: "light", theme: "halloween" });
  // A tap takes a holiday's theme back to plain, as the visitor had it.
  toggleTheme();
  assert.deepEqual(currentAppearance(), { mode: "light", own: "light", theme: DEFAULT_THEME });
  toggleTheme();
  assert.deepEqual(currentAppearance(), { mode: "dark", own: "dark", theme: DEFAULT_THEME });
  chooseTheme("easter");
  assert.deepEqual(currentAppearance(), { mode: "light", own: "dark", theme: "easter" });
  toggleTheme();
  assert.equal(currentAppearance().mode, "dark");
  toggleTheme();
  chooseTheme(calendarTheme());
});

test("an appearance is the same object until it changes, as a snapshot must be", () => {
  assert.equal(currentAppearance(), currentAppearance());
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
    chooseTheme(DEFAULT_THEME);
    // Without a window the system is light.
    if (currentAppearance().mode === "dark") {
      toggleTheme();
    }
    toggleTheme();
    assert.equal(currentAppearance().mode, "dark");
    assert.equal(kept.get("theme"), "dark");
    toggleTheme();
    assert.equal(currentAppearance().mode, "light");
    assert.equal(kept.has("theme"), false);
  } finally {
    Reflect.deleteProperty(globalThis, "localStorage");
    chooseTheme(calendarTheme());
  }
});
