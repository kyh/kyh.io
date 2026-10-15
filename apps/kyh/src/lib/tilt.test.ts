import assert from "node:assert/strict";
import test from "node:test";

import { tiltGravity } from "./tilt";

const close = (actual: { x: number; y: number }, x: number, y: number) => {
  assert.ok(Math.abs(actual.x - x) < 1e-9, `x ${actual.x} ≠ ${x}`);
  assert.ok(Math.abs(actual.y - y) < 1e-9, `y ${actual.y} ≠ ${y}`);
};

test("held upright in portrait, figures fall straight down", () => {
  close(tiltGravity(90, 0, 0), 0, 1);
});

test("tilting right sends figures right", () => {
  const g = tiltGravity(45, 30, 0);
  assert.ok(g.x > 0);
});

test("near vertical, gamma flipping sides doesn't throw figures sideways", () => {
  const a = tiltGravity(89.9, 80, 0);
  const b = tiltGravity(89.9, -80, 0);
  assert.ok(Math.abs(a.x - b.x) < 0.01);
});

test("landscape keeps down as down", () => {
  // Turned counterclockwise: the device's right edge points at the floor
  close(tiltGravity(0, 90, 90), 0, 1);
  // Turned clockwise: its left edge does
  close(tiltGravity(0, -90, 270), 0, 1);
});

test("lying flat or upside down keeps a downward pull", () => {
  assert.equal(tiltGravity(0, 0, 0).y, 0.3);
  assert.equal(tiltGravity(-90, 0, 0).y, 0.3);
});
