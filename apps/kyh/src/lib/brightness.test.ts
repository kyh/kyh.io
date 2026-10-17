import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { contrastOf, shadeOf } from "./brightness";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("each theme's end is its own palette and its own text", () => {
  close(shadeOf(1), 1);
  close(shadeOf(0), 0);
  close(contrastOf(1), 1);
  close(contrastOf(0), 1);
});

test("the flip jumps the mid-greys, and text is black or white there", () => {
  assert.ok(shadeOf(0.5) > 0.66);
  assert.ok(shadeOf(0.4999) < 0.37);
  close(contrastOf(0.5), 0);
});

// global.css draws the site with the same curves; a change to one is a change to both.
test("global.css draws the same curves", () => {
  const css = readFileSync(new URL("../styles/global.css", import.meta.url), "utf-8");
  assert.ok(css.includes("--shade: calc(34% + var(--light) * 0.66);"));
  assert.ok(css.includes("--shade: calc(var(--light) * 0.73);"));
  close(shadeOf(0.75), 0.34 + 0.75 * 0.66);
  close(shadeOf(0.25), 0.25 * 0.73);
  assert.ok(css.includes("--contrast: clamp(0%, (var(--light) - 50%) * 2, 100%);"));
  assert.ok(css.includes("--contrast: clamp(0%, (50% - var(--light)) * 2, 100%);"));
  close(contrastOf(0.75), 0.5);
  close(contrastOf(0.25), 0.5);
});
