import assert from "node:assert/strict";
import test from "node:test";

import type { Lovebird } from "./lovebird";
import type { Point } from "../follower/walk";
import { createLovebird, lovebird, restack, stepLovebird } from "./lovebird";
import { tailHangOf } from "./lovebird-pose";
import { flexAt, stepFlex } from "./flex";
import { swayOf } from "../follower/chain";

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

test("shaken off, it flies and lands again, rather than snapping back onto the pointer", () => {
  const bird = perched();
  // One quick jerk, then the pointer moves on gently.
  let pointer = run(bird, { x: 300, y: 300 }, 1 / 60, { x: 15, y: 0 });
  pointer = run(bird, pointer, 0.1, { x: 2, y: 0 });
  assert.ok(Math.hypot(bird.x - pointer.x, bird.y - pointer.y) > 4, "still flying");
  // Left be, it lands on it again.
  run(bird, pointer, 3);
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
});

test("perched, its wings are folded and its feet grip; in the air, they're spread and tucked", () => {
  const bird = perched();
  assert.ok(bird.rig.spread.x < 0.05, `${bird.rig.spread.x}`);
  assert.ok(bird.rig.legs.x > 0.95, `${bird.rig.legs.x}`);
  run(bird, { x: 300, y: 300 }, 0.4, { x: 15, y: 0 });
  assert.ok(bird.rig.spread.x > 0.5, `${bird.rig.spread.x}`);
  assert.ok(bird.rig.legs.x < 0.2, `${bird.rig.legs.x}`);
});

test("it flares to land: body up, tail fanned, feet thrown forward", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.6, { x: 15, y: 0 });
  let flare = 0;
  let reach = 0;
  let fan = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    stepLovebird(bird, pointer, STILL, 1 / 60);
    flare = Math.max(flare, bird.rig.flare.x);
    reach = Math.max(reach, bird.rig.reach.x);
    fan = Math.max(fan, bird.rig.fan.x);
  }
  assert.ok(flare > 0.7 && reach > 0.5 && fan > 0.7, `${flare} ${reach} ${fan}`);
  assert.ok(bird.perch > 0.99);
});

test("flying round a curve, it banks into the turn", () => {
  const bird = perched();
  // Off to the right, then curving down toward the camera: its heading turns toward +z, its left.
  let pointer = run(bird, { x: 300, y: 300 }, 0.5, { x: 12, y: 0 });
  let most = 0;
  for (let frame = 0; frame < 40; frame += 1) {
    const angle = (frame / 40) * Math.PI * 0.9;
    const by = { x: Math.cos(angle) * 9, y: Math.sin(angle) * 9 };
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    most = Math.max(most, bird.rig.bank.x);
  }
  assert.ok(most > 0.25, `${most}`);
});

test("its tail visibly trails: shaken off, the chain swings well off where it lies", () => {
  const bird = perched();
  let most = 0;
  let pointer = { x: 300, y: 300 };
  for (let frame = 0; frame < 40; frame += 1) {
    const by = frame === 0 ? { x: 30, y: 0 } : { x: 8, y: 0 };
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    const sway = swayOf(bird.tail, tailHangOf(bird));
    most = Math.max(most, Math.hypot(sway.x, sway.y));
  }
  assert.ok(most > 3, `${most}`);
});

test("perched, carried off it sways back over its feet, then forward, and settles", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.15, { x: 3, y: 0 });
  assert.ok(bird.sway.x < -0.1, `lags back: ${bird.sway.x}`);
  run(bird, pointer, 3);
  assert.ok(Math.abs(bird.sway.x) < 0.02, `settles: ${bird.sway.x}`);
});

test("a click elsewhere always makes it cock its head", () => {
  const bird = perched();
  for (let click = 0; click < 5; click += 1) {
    bird.act = "none";
    lovebird.poke(bird, { x: 900, y: 900 });
    assert.equal(bird.act, "tilt");
  }
});

test("its layers swap only once one's clearly in front of the other", () => {
  const order = ["body", "wing-0"];
  assert.deepEqual(
    restack(order, [
      ["body", 1],
      ["wing-0", 0],
    ]),
    order,
  );
  assert.deepEqual(
    restack(order, [
      ["body", 4],
      ["wing-0", 0],
    ]),
    ["wing-0", "body"],
  );
});

test("a flex rings the same at 30, 60 and 144 frames a second", () => {
  const ends = [30, 60, 144].map((fps) => {
    const flex = flexAt(1);
    for (let frame = 0; frame < Math.round(0.2 * fps); frame += 1) {
      stepFlex(flex, 0, 3, 0.25, 1 / fps);
    }
    return flex.x;
  });
  const [a = 0, b = 0, c = 0] = ends;
  assert.ok(Math.abs(a - b) < 0.02 && Math.abs(b - c) < 0.02, ends.join(", "));
  // Past its goal and back: it rings.
  assert.ok(Math.min(...ends) < 0, ends.join(", "));
});
