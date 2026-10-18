import assert from "node:assert/strict";
import test from "node:test";

import { throwConfetti } from "./burst";
import {
  chooseEggTheme,
  currentEggTheme,
  DEFAULT_EGG_THEME,
  EGG_THEMES,
  eggThemeOn,
  subscribeToEggTheme,
} from "./themes";

test("bats fly the week up to Halloween, eggs the rest of the year", () => {
  assert.equal(eggThemeOn(new Date(2026, 9, 24)), "eggs");
  assert.equal(eggThemeOn(new Date(2026, 9, 25)), "bats");
  assert.equal(eggThemeOn(new Date(2026, 9, 31, 23, 59)), "bats");
  assert.equal(eggThemeOn(new Date(2026, 10, 1)), "eggs");
  assert.equal(eggThemeOn(new Date(2026, 3, 5)), DEFAULT_EGG_THEME);
});

test("a chosen theme wins over the calendar until it's handed back", () => {
  const heard: string[] = [];
  const stop = subscribeToEggTheme(() => heard.push(currentEggTheme()));
  chooseEggTheme("bats");
  assert.equal(currentEggTheme(), "bats");
  chooseEggTheme(null);
  stop();
  assert.equal(currentEggTheme(), eggThemeOn(new Date()));
  assert.equal(heard[0], "bats");
  assert.equal(heard.length, 2);
});

test("confetti comes in the theme's colors", () => {
  const colors = new Set(EGG_THEMES.bats.confetti.flatMap((side) => [side.front, side.back]));
  for (const bit of throwConfetti(Math.random, EGG_THEMES.bats.confetti)) {
    assert.ok(colors.has(bit.front) && colors.has(bit.back));
  }
});
