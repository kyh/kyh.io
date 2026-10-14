import assert from "node:assert/strict";
import test from "node:test";

import type { CityProject } from "./draw-landmarks";
import { projects } from "@/lib/data";
import { planEntries } from "./draw-landmarks";
import { planCity } from "./plan";
import { TICK } from "./traffic";
import { ENTERING, INSIDE, LEAVING, SAYING } from "./visitors";
import { actorKey, createWorld, parseActorKey } from "./world";

const cityProjects: CityProject[] = projects.map((project) => ({
  description: project.description,
  favicon: project.favicon,
  kind: project.type,
  slug: project.slug,
  title: project.title,
  url: project.url,
}));
const plan = planCity(planEntries(cityProjects));
const buildings = plan.lots
  .filter((lot) => cityProjects.some((project) => project.slug === lot.slug))
  .map((lot) => ({ lot, slug: lot.slug, wall: lot }));
const START = 1_000_000;

test("two browsers stepping the same town see the same town", () => {
  const a = createWorld(plan, buildings, START);
  const b = createWorld(plan, buildings, START);
  a.advanceTo(START + 1200, 2000);
  b.advanceTo(START + 1200, 2000);
  assert.equal(a.pack(), b.pack());
});

test("a joiner who starts from a snapshot keeps in step with the town", () => {
  const host = createWorld(plan, buildings, START);
  host.advanceTo(START + 900, 2000);
  // Someone arriving later, with a town of their own, takes the host's.
  const guest = createWorld(plan, buildings, START + 5000);
  assert.ok(guest.restore(host.pack()));
  host.advanceTo(START + 2400, 2000);
  guest.advanceTo(START + 2400, 2000);
  assert.equal(guest.pack(), host.pack());
});

test("a broken snapshot is refused and changes nothing", () => {
  const world = createWorld(plan, buildings, START);
  const before = world.pack();
  assert.equal(world.restore("12|1,2,3|4|5"), false);
  assert.equal(world.restore("nonsense"), false);
  assert.equal(world.pack(), before);
});

test("a car set down by one player lands in the same spot for everyone", () => {
  const mine = createWorld(plan, buildings, START);
  const theirs = createWorld(plan, buildings, START);
  const key = actorKey("car", 7);
  mine.hold(key);
  theirs.hold(key);
  mine.advanceTo(START + 40, 100);
  theirs.advanceTo(START + 43, 100);
  const landed = mine.land(key, 30.3, 27.9, START + 60);
  assert.ok(landed);
  const placed = theirs.place(key, landed.state);
  assert.deepEqual(placed, landed.pose);
  // And from there they drive on together.
  mine.advanceTo(START + 400, 1000);
  theirs.advanceTo(START + 400, 1000);
  assert.deepEqual(theirs.poseOf(key), mine.poseOf(key));
});

test("a held car stays put while the town moves on", () => {
  const world = createWorld(plan, buildings, START);
  const key = actorKey("car", 3);
  const before = { ...world.poseOf(key) };
  world.hold(key);
  world.advanceTo(START + 200, 1000);
  assert.deepEqual(world.poseOf(key), before);
});

test("actor keys name a car, a walker or a visitor", () => {
  assert.deepEqual(parseActorKey(actorKey("walker", 41)), { index: 41, kind: "walker" });
  assert.deepEqual(parseActorKey("v0"), { index: 0, kind: "visitor" });
  assert.equal(parseActorKey("x9"), null);
  assert.equal(parseActorKey("c-1"), null);
  assert.equal(parseActorKey("c1.5"), null);
});

test("every project in a block has a front door onto its sidewalk", () => {
  const world = createWorld(plan, buildings, START);
  const inBlocks = buildings.filter(({ lot }) => lot.size !== "launch");
  assert.equal(world.doors.length, inBlocks.length);
  for (const door of world.doors) {
    const lot = buildings.find((building) => building.slug === door.slug)?.lot;
    assert.ok(lot, door.slug);
    // The door is on the lot's edge.
    const onEdge =
      Math.abs(door.x - lot.x) < 1e-6 ||
      Math.abs(door.x - (lot.x + lot.w)) < 1e-6 ||
      Math.abs(door.z - lot.z) < 1e-6 ||
      Math.abs(door.z - (lot.z + lot.d)) < 1e-6;
    assert.ok(onEdge, `${door.slug}'s door is off its walls`);
  }
});

test("visitors come out of project doors with something to say, and go in others", () => {
  const world = createWorld(plan, buildings, START);
  const exits = new Map<number, number>();
  const entries = new Set<number>();
  const minutes = 6;
  for (let tick = START + 1; tick <= START + (minutes * 60) / TICK; tick += 1) {
    const before = world.visitors.map((visitor) => visitor.mode);
    world.advanceTo(tick, 10);
    for (const [index, visitor] of world.visitors.entries()) {
      if (before[index] === INSIDE && visitor.mode === LEAVING) {
        exits.set(index, (exits.get(index) ?? 0) + 1);
        assert.equal(visitor.said, tick);
        // They appear at the door they said their line at.
        const door = world.doors[visitor.door];
        assert.ok(door);
        assert.ok(Math.hypot(visitor.pose.x - door.x, visitor.pose.z - door.z) < 1e-6);
      }
      if (before[index] === ENTERING && visitor.mode === INSIDE) {
        entries.add(index);
      }
    }
  }
  assert.ok(exits.size >= 30, `only ${exits.size} visitors came out`);
  assert.ok(entries.size >= 15, `only ${entries.size} visitors made it in somewhere`);
  assert.ok(SAYING > 40);
});

test("a stranger's drop or snapshot can't put anything off the map", () => {
  const world = createWorld(plan, buildings, START);
  const before = world.pack();
  assert.equal(world.place("c1", [99_999, 0, 1, 5, 0]), null);
  assert.equal(world.place("w1", [0, Number.NaN, 5, 0]), null);
  assert.equal(world.place("v1", [7, 0, 0, 0, 0, 5, 0, 0, 0]), null);
  assert.equal(world.place("c1", [0, 0, 1]), null);
  assert.equal(world.restore(before.replace(/\|\d+,/u, "|99999,")), false);
  assert.equal(world.pack(), before);
});

test("a snapshot taken mid-carry doesn't pull a landed car back", () => {
  const host = createWorld(plan, buildings, START);
  const guest = createWorld(plan, buildings, START);
  const key = actorKey("car", 5);
  host.hold(key);
  const snapshot = host.pack();
  // The guest heard the drop before the snapshot that predates it.
  guest.hold(key);
  const landed = guest.land(key, 20, 20, START + 30);
  assert.ok(guest.restore(snapshot));
  assert.deepEqual(guest.poseOf(key), landed?.pose);
});

test("a jump in time picks up where the town stood", () => {
  const a = createWorld(plan, buildings, START);
  const b = createWorld(plan, buildings, START);
  b.shift(5000);
  a.advanceTo(START + 300, 1000);
  b.advanceTo(START + 5300, 1000);
  for (const key of ["c3", "w12", "v3", "v17"]) {
    assert.deepEqual(b.poseOf(key), a.poseOf(key), key);
  }
});
