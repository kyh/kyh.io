import assert from "node:assert/strict";
import test from "node:test";

import type { Junction, Road } from "./plan";
import type { Site } from "./schedule";
import { cranePose, planWorks, truckPose, yardShown } from "./crews";
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

const lot = (start: number, top: number, x = 17): Site => ({
  d: 4,
  kind: "lot",
  start,
  top,
  w: 4,
  x,
  z: 17,
});
const block: Site = { d: 6, kind: "block", start: 1.5, top: null, w: 6, x: 9, z: 9 };

/** Whether a point lies on some road of the grid (give or take a lane). */
const onRoad = ({ x, z }: { x: number; z: number }) =>
  Math.abs(x - Math.round(x / 8) * 8) < 0.3 || Math.abs(z - Math.round(z / 8) * 8) < 0.3;

test("a site's size sets its crew: tall buildings get cranes and scaffolding, every site trucks", () => {
  const works = planWorks({ sites: [lot(1, 6), lot(1.2, 3, 9), lot(1.4, 1, 25), block] }, GRAPH);
  assert.equal(works.cranes.length, 3);
  assert.equal(works.scaffolds.length, 2);
  assert.equal(works.yards.length, 3);
  assert.equal(works.trucks.length, 3 * 3 + 1);
  assert.ok(works.trucks.some((truck) => truck.kind === "mixer"));
});

test("a crane goes up a section at a time before work starts and comes down after", () => {
  const [crane] = planWorks({ sites: [lot(1.2, 4)] }, GRAPH).cranes;
  assert.ok(crane);
  assert.equal(cranePose(crane, 0.5).shown, false);
  const rising = cranePose(crane, crane.start - 0.2);
  assert.ok(rising.shown && rising.mast > 0 && rising.mast < 1);
  assert.equal(cranePose(crane, (crane.start + crane.done) / 2).mast, 1);
  assert.equal(cranePose(crane, crane.done + 1).shown, false);
});

test("a crane's jib points at the building it's raising, each a little its own way", () => {
  const sites = [lot(1.2, 6), lot(1.3, 5, 9)];
  const { cranes } = planWorks({ sites }, GRAPH);
  for (const crane of cranes) {
    const target = sites.find((site) => crane.start === site.start);
    assert.ok(target);
    const { jib } = cranePose(crane, (crane.start + crane.done) / 2);
    const toward = {
      x: target.x + target.w / 2 - crane.at.x,
      z: target.z + target.d / 2 - crane.at.z,
    };
    const facing =
      (Math.cos(jib) * toward.x - Math.sin(jib) * toward.z) / Math.hypot(toward.x, toward.z);
    assert.ok(facing > 0.6, "points at its site");
  }
  assert.equal(new Set(cranes.map((crane) => crane.aim)).size, cranes.length);
});

test("trucks drive the roads in one after another, each to its own spot, and on out", () => {
  const { trucks } = planWorks({ sites: [lot(1.2, 4)] }, GRAPH);
  const spots = trucks.map((truck) => truck.arrive.points.at(-1));
  assert.equal(new Set(spots.map((spot) => `${spot?.x},${spot?.z}`)).size, trucks.length);
  const parked = trucks.map((truck) => truck.parked);
  assert.deepEqual(
    parked,
    parked.toSorted((a, b) => a - b),
  );
  for (const truck of trucks) {
    for (const t of [truck.parked - 0.4, truck.parked, truck.leaves + 0.3]) {
      const pose = truckPose(truck, t);
      assert.ok(pose.shown && onRoad(pose), `on the road at ${t}`);
    }
    assert.equal(truckPose(truck, truck.leaves + 2).shown, false);
  }
});

test("a yard is up from setup until its building's done", () => {
  const [yard] = planWorks({ sites: [lot(1.2, 4)] }, GRAPH).yards;
  assert.ok(yard);
  assert.equal(yardShown(yard, yard.from - 0.1), 0);
  assert.equal(yardShown(yard, (yard.from + yard.until) / 2), 1);
  assert.equal(yardShown(yard, yard.until + 0.1), 0);
});
