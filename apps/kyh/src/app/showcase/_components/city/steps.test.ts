import assert from "node:assert/strict";
import test from "node:test";

import type { Steps } from "./steps";
import { finish, runFor } from "./steps";

const counting = function* counting(log: number[], steps: number): Steps<string> {
  for (let index = 0; index < steps; index += 1) {
    log.push(index);
    yield;
  }
  return "done";
};

test("finish runs every step and returns what the work made", () => {
  const log: number[] = [];
  assert.equal(finish(counting(log, 5)), "done");
  assert.deepEqual(log, [0, 1, 2, 3, 4]);
});

test("runFor stops once its budget is spent, and picks up where it left off", () => {
  const log: number[] = [];
  const steps = counting(log, 5);
  // Each look at the clock is a millisecond later.
  let clock = 0;
  const now = () => {
    clock += 1;
    return clock;
  };
  assert.equal(runFor(steps, 2, now), undefined);
  assert.deepEqual(log, [0, 1]);
  assert.equal(runFor(steps, 0, now), undefined);
  assert.deepEqual(log, [0, 1, 2]);
  assert.deepEqual(runFor(steps, 100, now), { value: "done" });
  assert.deepEqual(log, [0, 1, 2, 3, 4]);
});
