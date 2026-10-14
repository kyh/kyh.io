import assert from "node:assert/strict";
import test from "node:test";

import { planCity } from "./plan";
import { createCrowd, createTraffic } from "./traffic";

const plan = planCity([]);

/** Distance from a point to the nearest road's center line. */
const offRoad = (x: number, z: number) => {
  const junctions = new Map(plan.junctions.map((junction) => [junction.id, junction]));
  let nearest = Infinity;
  for (const road of plan.roads) {
    const a = junctions.get(road.from);
    const b = junctions.get(road.to);
    if (a && b) {
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) /
            ((b.x - a.x) ** 2 + (b.z - a.z) ** 2),
        ),
      );
      nearest = Math.min(
        nearest,
        Math.hypot(x - (a.x + (b.x - a.x) * t), z - (a.z + (b.z - a.z) * t)),
      );
    }
  }
  return nearest;
};

test("cars stay in their lanes, through junctions and all", () => {
  const traffic = createTraffic(plan, 30);
  for (let step = 0; step < 600; step += 1) {
    traffic.step(1 / 20);
    for (const car of traffic.cars) {
      // A lane is a fifth of a cell off the middle; a turn cuts its corner.
      assert.ok(
        offRoad(car.pose.x, car.pose.z) < 0.36,
        `car off road at ${car.pose.x}, ${car.pose.z}`,
      );
    }
  }
});

test("people keep to the sidewalks and the crossings", () => {
  const crowd = createCrowd(plan, 40);
  const onBlock = (x: number, z: number) =>
    plan.blocks.some(
      (block) =>
        x >= block.x - 1.1 &&
        x <= block.x + block.w + 1.1 &&
        z >= block.z - 1.1 &&
        z <= block.z + block.d + 1.1,
    );
  for (let step = 0; step < 600; step += 1) {
    crowd.step(1 / 20);
    for (const walker of crowd.walkers) {
      assert.ok(
        onBlock(walker.pose.x, walker.pose.z),
        `walker strayed to ${walker.pose.x}, ${walker.pose.z}`,
      );
    }
  }
});
