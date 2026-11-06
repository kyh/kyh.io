import assert from "node:assert/strict";
import test from "node:test";

import type { Body, Feet, Steps } from "./feet";
import type { Point } from "./walk";
import { apart, createFeet, footIn, homeOf, keepPace, legTo, screenOf, stepFeet } from "./feet";
import { createWalker, stepWalker } from "./walk";
import { headingOf } from "./solid";

const STEPS: Steps = {
  cadence: [1.4, 3],
  duty: [0.62, 0.38],
  homes: [
    { ahead: 0, left: 3 },
    { ahead: 0, left: -3 },
  ],
  lift: [2, 4],
  offsets: [0, 0.5],
  reach: 12,
  top: 150,
};

/** A body going at `velocity` (screen pixels a second) for `seconds`, at 60 frames a second, facing its way. */
const walk = (
  feet: Feet,
  body: Body,
  velocity: Point,
  seconds: number,
  each: (frame: number) => void = () => {},
) => {
  for (let frame = 0; frame < Math.round(seconds * 60); frame += 1) {
    body.vx = velocity.x;
    body.vy = velocity.y;
    body.x += velocity.x / 60;
    body.y += velocity.y / 60;
    const heading = Math.hypot(velocity.x, velocity.y) > 1 ? headingOf(velocity.x, velocity.y) : 0;
    stepFeet(feet, STEPS, body, heading, 1 / 60);
    each(frame);
  }
};

/** Watches every foot frame to frame: one on the ground both frames never moved. */
const watchSliding = (feet: Feet) => {
  let before = feet.feet.map((foot) => ({ ...foot }));
  let slid = 0;
  return {
    check: () => {
      for (const [index, foot] of feet.feet.entries()) {
        const was = before[index];
        if (was?.planted && foot.planted) {
          slid = Math.max(slid, Math.hypot(foot.x - was.x, foot.y - was.y));
        }
      }
      before = feet.feet.map((foot) => ({ ...foot }));
    },
    slid: () => slid,
  };
};

test("a foot on the ground stays put while the body goes over it, however it goes", () => {
  for (const velocity of [
    { x: 160, y: 0 },
    { x: -90, y: 0 },
    { x: 0, y: 70 },
    { x: 60, y: -40 },
    { x: 20, y: 0 },
  ]) {
    const body: Body = { vx: 0, vy: 0, x: 300, y: 300 };
    const feet = createFeet(STEPS, body, 0);
    const watch = watchSliding(feet);
    let steps = 0;
    walk(feet, body, velocity, 3, () => {
      steps += feet.feet.filter((foot) => foot.planted && foot.swing >= 1).length;
      watch.check();
    });
    assert.equal(watch.slid(), 0, JSON.stringify(velocity));
    assert.ok(feet.cadence > 0, JSON.stringify(velocity));
  }
});

test("its feet stay within its legs' reach, walking, turning round and stopping", () => {
  const walker = createWalker(
    { x: 400, y: 300 },
    { accel: 700, behind: 49, below: 29, stride: 24, top: 160 },
  );
  const feet = createFeet(STEPS, walker, 0);
  const watch = watchSliding(feet);
  let heading = 0;
  let pointer = { x: 400, y: 300 };
  let most = 0;
  const moves: [Point, number][] = [
    [{ x: 4, y: 0 }, 1.5],
    [{ x: -5, y: 1 }, 1.5],
    [{ x: 0, y: 0 }, 1],
    [{ x: 1, y: 3 }, 1],
    [{ x: 0, y: 0 }, 1.5],
  ];
  for (const [by, seconds] of moves) {
    for (let frame = 0; frame < seconds * 60; frame += 1) {
      pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
      stepWalker(
        walker,
        { accel: 700, behind: 49, below: 29, stride: 24, top: 160 },
        pointer,
        by,
        1 / 60,
      );
      keepPace(walker, STEPS.top, 1 / 60);
      // Its heading lags its way, as a turning body's does.
      if (walker.speed > 10) {
        const goal = headingOf(walker.vx, walker.vy);
        heading += Math.atan2(Math.sin(goal - heading), Math.cos(goal - heading)) * 0.12;
      }
      stepFeet(feet, STEPS, walker, heading, 1 / 60);
      watch.check();
      for (const [index, foot] of feet.feet.entries()) {
        if (foot.planted) {
          most = Math.max(most, apart(foot, homeOf(STEPS, index, walker, heading)));
        }
      }
    }
  }
  assert.equal(watch.slid(), 0);
  assert.ok(most < STEPS.reach * 1.3, `${most}`);
});

test("its cadence follows its pace, and never strobes", () => {
  const strides = (speed: number) => {
    const body: Body = { vx: 0, vy: 0, x: 0, y: 300 };
    const feet = createFeet(STEPS, body, 0);
    let lifts = 0;
    let planted = feet.feet.map((foot) => foot.planted);
    walk(feet, body, { x: speed, y: 0 }, 4, (frame) => {
      if (frame >= 60) {
        lifts += feet.feet.filter((foot, index) => planted[index] && !foot.planted).length;
      }
      planted = feet.feet.map((foot) => foot.planted);
    });
    // Strides a second, each foot stepping once a stride.
    return lifts / 2 / 3;
  };
  const slow = strides(30);
  const brisk = strides(90);
  const fast = strides(STEPS.top);
  assert.ok(slow < brisk && brisk < fast, `${slow} ${brisk} ${fast}`);
  assert.ok(slow >= 1.2, `${slow}`);
  assert.ok(fast <= 3.1, `${fast}`);
});

test("stopped, it steps to stand neat, then stands still", () => {
  const body: Body = { vx: 0, vy: 0, x: 0, y: 300 };
  const feet = createFeet(STEPS, body, 0);
  walk(feet, body, { x: 150, y: 0 }, 1.37);
  walk(feet, body, { x: 0, y: 0 }, 1.5);
  for (const [index, foot] of feet.feet.entries()) {
    assert.ok(foot.planted);
    assert.ok(apart(foot, homeOf(STEPS, index, body, 0)) < STEPS.reach * 0.2);
  }
  assert.equal(feet.cadence, 0);
  const { phase } = feet;
  walk(feet, body, { x: 0, y: 0 }, 1);
  assert.equal(feet.phase, phase);
});

test("turned round on the spot, it shuffles its feet round under it", () => {
  const body: Body = { vx: 0, vy: 0, x: 0, y: 300 };
  const feet = createFeet(STEPS, body, 0);
  for (let frame = 0; frame < 120; frame += 1) {
    stepFeet(feet, STEPS, body, Math.PI, 1 / 60);
  }
  for (const [index, foot] of feet.feet.entries()) {
    assert.ok(apart(foot, homeOf(STEPS, index, body, Math.PI)) < STEPS.reach * 0.2);
  }
});

test("carried off in a leap, its feet are set down afresh under it", () => {
  const body: Body = { vx: 0, vy: 0, x: 0, y: 300 };
  const feet = createFeet(STEPS, body, 0);
  body.x = 900;
  stepFeet(feet, STEPS, body, 0, 1 / 60);
  for (const [index, foot] of feet.feet.entries()) {
    assert.ok(apart(foot, homeOf(STEPS, index, body, 0)) < 1e-9);
  }
});

test("a foot's on the ground in a pose's 3D, toward the camera down the screen", () => {
  const origin = { x: 100, y: 100 };
  const down = screenOf({ x: 0, y: 10 });
  const [x, y, z] = footIn(
    { from: origin, lift: 0, planted: true, stride: 0, swing: 0, turn: 0, x: 100, y: 100 + down.y },
    origin,
    0.5,
  );
  assert.ok(Math.abs(x) < 1e-9 && y === 0 && Math.abs(z - 20) < 1e-9);
});

test("a leg reaches its foot with bones their lengths, its joint toward the pole", () => {
  const { end, joint } = legTo([0, 26, 0], [4, 0, 2], 12, 17, [-1, 0, 0]);
  assert.deepEqual(
    end.map((n) => Math.round(n * 1e6) / 1e6),
    [4, 0, 2],
  );
  assert.ok(Math.abs(Math.hypot(joint[0], joint[1] - 26, joint[2]) - 12) < 1e-9);
  assert.ok(Math.abs(Math.hypot(joint[0] - 4, joint[1], joint[2] - 2) - 17) < 1e-9);
  assert.ok(joint[0] < 2, "bent back");
  // Out of reach, it goes as far as it can and no bone stretches.
  const far = legTo([0, 26, 0], [80, 0, 0], 12, 17, [-1, 0, 0]);
  assert.ok(Math.hypot(far.end[0], far.end[1] - 26, far.end[2]) < 29);
});

test("however uneven its frames, a foot on the ground stays put and steps fit its reach", () => {
  const body: Body = { vx: 120, vy: 30, x: 0, y: 300 };
  const feet = createFeet(STEPS, body, 0);
  const watch = watchSliding(feet);
  const heading = headingOf(body.vx, body.vy);
  let most = 0;
  for (let frame = 0; frame < 240; frame += 1) {
    // Frames of a sixtieth to a twentieth of a second.
    const seconds = [1 / 60, 1 / 30, 1 / 20, 1 / 45][frame % 4] ?? 1 / 60;
    body.x += body.vx * seconds;
    body.y += body.vy * seconds;
    stepFeet(feet, STEPS, body, heading, seconds);
    watch.check();
    // Set off at its pace from a standstill, its first steps catch up; then they fit.
    for (const [index, foot] of feet.feet.entries()) {
      if (foot.planted && frame > 30) {
        most = Math.max(most, apart(foot, homeOf(STEPS, index, body, heading)));
      }
    }
  }
  assert.equal(watch.slid(), 0);
  assert.ok(most < STEPS.reach * 1.1, `${most}`);
});

/** The widest its feet get apart reversing: walking right, then back left, its heading turning round. */
const widest = (steps: Steps) => {
  const body: Body = { vx: 0, vy: 0, x: 0, y: 300 };
  const feet = createFeet(steps, body, 0);
  let heading = 0;
  let most = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    const vx = frame < 60 ? 140 : Math.max(-140, 140 - (frame - 60) * 20);
    body.vx = vx;
    body.x += vx / 60;
    if (frame >= 60) {
      heading = Math.min(Math.PI, heading + 0.12);
    }
    stepFeet(feet, steps, body, heading, 1 / 60);
    const [a, b] = feet.feet;
    if (a && b && frame > 60) {
      most = Math.max(most, apart(a, b));
    }
  }
  return most;
};

test("an optional strain lifts a foot left behind sooner, so a reversal doesn't splay its legs", () => {
  const before = widest(STEPS);
  const after = widest({ ...STEPS, strain: { reach: 0.9, swung: 0.5 } });
  assert.ok(after < before * 0.85, `${before} → ${after}`);
  // Left out, it's as it was: the same as asking for the old default.
  assert.equal(widest({ ...STEPS, strain: { reach: 1.25, swung: 1 } }), before);
});
