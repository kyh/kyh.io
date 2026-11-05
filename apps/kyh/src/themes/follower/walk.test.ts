import assert from "node:assert/strict";
import test from "node:test";

import type { Gait, Point, Walker } from "./walk";
import { createWalker, footAt, jointOf, spotOf, stepWalker } from "./walk";

const GAIT: Gait = { accel: 1300, behind: 70, below: 40, stride: 34, top: 360 };
const still = { x: 0, y: 0 };

/** Runs it `seconds` at 60 frames a second after a pointer moving `by` a frame. */
const run = (walker: Walker, from: Point, seconds: number, by = still) => {
  let pointer = from;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepWalker(walker, GAIT, pointer, by, 1 / 60);
  }
  return pointer;
};

test("it walks to its spot behind and below the pointer and stands there", () => {
  const walker = createWalker({ x: 100, y: 300 }, GAIT);
  const pointer = run(walker, { x: 100, y: 300 }, 1.5, { x: 6, y: 0 });
  run(walker, pointer, 3);
  const spot = spotOf(walker, GAIT, pointer);
  assert.ok(Math.hypot(walker.x - spot.x, walker.y - spot.y) < 8);
  assert.ok(walker.x < pointer.x, "behind");
  assert.ok(walker.y > pointer.y, "below");
  assert.ok(walker.speed < 1, `${walker.speed}`);
  assert.ok(walker.still > 2.5);
});

test("it faces the way it goes, and the pointer once it's stopped", () => {
  const walker = createWalker({ x: 500, y: 300 }, GAIT);
  const pointer = run(walker, { x: 500, y: 300 }, 0.8, { x: -8, y: 0 });
  assert.equal(walker.facing, -1);
  run(walker, pointer, 2);
  // Stopped behind it (to its right), it turns to look back at it.
  assert.equal(walker.facing, -1);
  assert.ok(walker.turn < -0.9);
});

test("its top speed holds however far it's left behind", () => {
  const walker = createWalker({ x: 0, y: 0 }, GAIT);
  run(walker, { x: 5000, y: 0 }, 2);
  assert.ok(walker.speed <= GAIT.top + 1e-6, `${walker.speed}`);
});

test("a foot on the ground goes back as fast as the body goes on, so it never slips", () => {
  const walker = createWalker({ x: 0, y: 0 }, GAIT);
  walker.speed = GAIT.top;
  const a = footAt(walker, GAIT, 0, 6);
  const step = 0.01;
  walker.phase += step;
  const b = footAt(walker, GAIT, 0, 6);
  assert.equal(a.y, 0);
  const stride = GAIT.stride * 1.9;
  assert.ok(Math.abs((a.x - b.x) / (step * stride) - 1) < 1e-6);
});

test("a limb's joint keeps both bones their length, bent the way asked", () => {
  const hip = { x: 0, y: -30 };
  const foot = { x: 4, y: 0 };
  for (const bend of [1, -1] as const) {
    const joint = jointOf(hip, foot, 15, 16, bend);
    assert.ok(Math.abs(Math.hypot(joint.x - hip.x, joint.y - hip.y) - 15) < 1e-6);
    assert.ok(Math.abs(Math.hypot(foot.x - joint.x, foot.y - joint.y) - 16) < 1e-6);
    // Forward (+x) of the line from hip to foot, or back of it.
    const across = (foot.x - hip.x) * (joint.y - hip.y) - (foot.y - hip.y) * (joint.x - hip.x);
    assert.equal(Math.sign(across), -bend);
  }
  // Out of reach, it reaches.
  const far = jointOf(hip, { x: 0, y: 100 }, 15, 16, 1);
  assert.ok(Number.isFinite(far.x) && Number.isFinite(far.y));
});
