import assert from "node:assert/strict";
import test from "node:test";

import type { Junction, Road } from "./plan";
import type { Site } from "./schedule";
import { crewPose, planCrews } from "./crews";
import { roadGraph } from "./traffic";

// A 5×5 grid of junctions 8 cells apart: four blocks a side.
const junctions: Junction[] = [];
const roads: Road[] = [];
for (let i = 0; i < 5; i += 1) {
  for (let j = 0; j < 5; j += 1) {
    junctions.push({ id: `${i},${j}`, x: i * 8, z: j * 8 });
    if (i > 0) {
      roads.push({ axis: "x", from: `${i - 1},${j}`, to: `${i},${j}` });
    }
    if (j > 0) {
      roads.push({ axis: "z", from: `${i},${j - 1}`, to: `${i},${j}` });
    }
  }
}
const GRAPH = roadGraph({ junctions, roads });

const site = (start: number, top: number | null, x = 17): Site => ({
  d: 4,
  kind: top === null ? "block" : "lot",
  start,
  top,
  w: 4,
  x,
  z: 17,
});

/** Whether a point lies on some road of the grid (give or take a lane). */
const onRoad = ({ x, z }: { x: number; z: number }) =>
  Math.abs(x - Math.round(x / 8) * 8) < 0.3 || Math.abs(z - Math.round(z / 8) * 8) < 0.3;

test("the tallest buildings get cranes, the other sites trucks", () => {
  const crews = planCrews(
    { sites: [site(1, 8), site(1.2, 2), site(1.4, null), site(1.6, 5)] },
    GRAPH,
  );
  assert.deepEqual(
    crews.map((crew) => crew.kind),
    ["crane", "crane", "crane", "truck"],
  );
  assert.equal(crews[0]?.mast, 9);
});

test("a crew drives the roads in, parks in the lane by its site, and drives on out", () => {
  const [crane] = planCrews({ sites: [site(1.2, 4)] }, GRAPH);
  assert.ok(crane);
  assert.ok(onRoad(crane.park));
  assert.ok(crane.arrive.points.length > 2 && crane.leave.points.length > 2);
  for (const t of [0.4, 0.8, 1.1, crane.done + 0.4, crane.done + 0.6]) {
    const pose = crewPose(crane, t);
    assert.ok(pose.shown, `shown at ${t}`);
    assert.ok(onRoad(pose), `on the road at ${t}`);
  }
  const working = crewPose(crane, (crane.start + crane.done) / 2);
  assert.deepEqual([working.x, working.z, working.mast], [crane.park.x, crane.park.z, 1]);
  assert.equal(crewPose(crane, 0.1).shown, false);
  assert.equal(crewPose(crane, crane.done + 2).shown, false);
});

test("a crane's jib points at the building it's raising, each a little its own way", () => {
  const sites = [site(1.2, 6), site(1.3, 5, 9)];
  const cranes = planCrews({ sites }, GRAPH);
  for (const [index, crane] of cranes.entries()) {
    const target = sites[index];
    assert.ok(target);
    const pose = crewPose(crane, (crane.start + crane.done) / 2);
    const world = pose.jib + pose.heading;
    const toward = {
      x: target.x + target.w / 2 - crane.park.x,
      z: target.z + target.d / 2 - crane.park.z,
    };
    const facing =
      (Math.cos(world) * toward.x - Math.sin(world) * toward.z) / Math.hypot(toward.x, toward.z);
    assert.ok(facing > 0.6, `crane ${index} points at its site`);
  }
  assert.notEqual(cranes[0]?.aim, cranes[1]?.aim);
});
