import assert from "node:assert/strict";
import test from "node:test";

import type { Ground } from "./carry";
import { createBoats } from "./boats";
import { inland } from "./plan";

const ground: Ground = { surfaceAt: () => 0, view: [0.5, 0.7, 0.5] };

const lift = (boats: ReturnType<typeof createBoats>, to: { x: number; z: number }) => {
  const [pose] = boats.poses(10);
  assert.ok(pose);
  assert.ok(boats.grab(0, pose, { x: pose.x, y: 0, z: pose.z }, ground, 0));
  boats.carry({ x: to.x, y: 0, z: to.z }, ground, 1000);
  boats.letGo(10);
};

test("a boat is held, then sails again where it was dropped at sea", () => {
  const boats = createBoats();
  const [before] = boats.poses(10);
  assert.ok(before);
  const out = { x: before.x - 3, z: before.z - 3 };
  lift(boats, out);
  assert.equal(boats.holding, false);
  const [landed] = boats.poses(11.5);
  assert.ok(landed);
  assert.ok(inland(landed.x, landed.z) < 0, "landed on land");
  const [later] = boats.poses(30);
  const [fresh] = createBoats().poses(30);
  assert.ok(later && fresh);
  assert.notDeepEqual([later.x, later.z], [fresh.x, fresh.z]);
});

test("a boat dropped on land goes back to its course", () => {
  const boats = createBoats();
  lift(boats, { x: 36, z: 36 });
  for (const time of [11, 13, 20]) {
    const [pose] = boats.poses(time);
    assert.ok(pose);
    assert.ok(inland(pose.x, pose.z) < 0, `on land at ${time}`);
  }
});

test("only a boat in the water can be picked up", () => {
  const boats = createBoats();
  const [pose] = boats.poses(10);
  assert.ok(pose);
  assert.ok(boats.grab(0, pose, { x: pose.x, y: 0, z: pose.z }, ground, 0));
  assert.equal(boats.grab(0, pose, { x: pose.x, y: 0, z: pose.z }, ground, 0), false);
  assert.equal(boats.holding, true);
});
