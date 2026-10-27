import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { DEFAULT_THEME, THEMES, themeOn } from "./index";
import {
  calendarTheme,
  chooseTheme,
  currentAppearance,
  currentTheme,
  nextTap,
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

test("on a holiday a tap cycles through the visitor's own light or dark, the other, and the holiday", () => {
  mock.timers.enable({ apis: ["Date"], now: new Date(2026, 9, 31) });
  try {
    chooseTheme(calendarTheme());
    assert.equal(currentTheme(), "halloween");
    const seen = [];
    for (let tap = 0; tap < 4; tap += 1) {
      const next = nextTap();
      toggleTheme();
      const { mode, theme } = currentAppearance();
      assert.deepEqual(next, { mode, theme });
      seen.push(`${theme}|${mode}`);
    }
    assert.deepEqual(seen, [
      `${DEFAULT_THEME}|light`,
      `${DEFAULT_THEME}|dark`,
      "halloween|dark",
      // The dark they flipped to is now their own.
      `${DEFAULT_THEME}|dark`,
    ]);
  } finally {
    // Leaves plain light, as the visitor's own.
    if (currentAppearance().mode === "dark") {
      toggleTheme();
    }
    mock.timers.reset();
    chooseTheme(calendarTheme());
  }
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
  // A day without a holiday, where taps only flip.
  mock.timers.enable({ apis: ["Date"], now: new Date(2026, 5, 15) });
  try {
    chooseTheme(DEFAULT_THEME);
    assert.equal(calendarTheme(), DEFAULT_THEME);
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
    mock.timers.reset();
    chooseTheme(calendarTheme());
  }
});
