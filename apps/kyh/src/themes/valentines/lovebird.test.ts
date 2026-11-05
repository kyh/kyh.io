import assert from "node:assert/strict";
import test from "node:test";

import type { Lovebird } from "./lovebird";
import type { Point } from "../follower/walk";
import { createLovebird, stepLovebird } from "./lovebird";

const STILL: Point = { x: 0, y: 0 };

/** Runs it `seconds` at 60 frames a second after a pointer moving `by` a frame. */
const run = (bird: Lovebird, from: Point, seconds: number, by = STILL) => {
  let pointer = from;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
  }
  return pointer;
};

const perched = () => {
  const bird = createLovebird({ x: 300, y: 300 });
  run(bird, { x: 300, y: 300 }, 3);
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
  return bird;
};

test("left be, it lands on the pointer's tip", () => {
  const bird = perched();
  assert.equal(bird.x, 300);
  assert.equal(bird.y, 300);
});

test("perched, it rides a gentle move along on the pointer", () => {
  const bird = perched();
  // 6 pixels a frame: 360 a second, gentle, but more than it would land from.
  const pointer = run(bird, { x: 300, y: 300 }, 0.5, { x: 6, y: 0 });
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
  assert.equal(bird.x, pointer.x);
  assert.equal(bird.y, pointer.y);
});

test("perched, a quick move shakes it off and it flies", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.3, { x: 15, y: 0 });
  assert.ok(bird.perch < 0.1, `${bird.perch}`);
  assert.ok(bird.x < pointer.x - 10, "behind");
});
