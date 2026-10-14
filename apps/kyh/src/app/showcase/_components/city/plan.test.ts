import assert from "node:assert/strict";
import test from "node:test";

import type { Lot, PlanEntry } from "./plan";
import { inland, planCity } from "./plan";

const overlaps = (a: Lot, b: Lot) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;

const ENTRIES: PlanEntry[] = [
  { home: "4,4", size: "large", slug: "tower" },
  { home: "3,6:front", size: "half", slug: "shop" },
  { home: "launch", size: "launch", slug: "rocket" },
  { size: "template", slug: "fork-a" },
  { size: "template", slug: "fork-b" },
  { size: "quarter", slug: "kiosk" },
];

test("the city is the same town on every visit", () => {
  assert.deepEqual(planCity(ENTRIES), planCity(ENTRIES));
});

test("every project gets exactly one lot, and lots never overlap", () => {
  const { lots } = planCity(ENTRIES);
  for (const entry of ENTRIES) {
    assert.equal(
      lots.filter((lot) => lot.slug === entry.slug).length,
      1,
      `${entry.slug} has no lot`,
    );
  }
  for (const [index, lot] of lots.entries()) {
    for (const other of lots.slice(index + 1)) {
      assert.ok(!overlaps(lot, other), `${lot.slug || "spare"} overlaps ${other.slug || "spare"}`);
    }
  }
});

test("a project stands on the lot it asked for", () => {
  const { lots } = planCity(ENTRIES);
  const tower = lots.find((lot) => lot.slug === "tower");
  const rocket = lots.find((lot) => lot.slug === "rocket");
  assert.equal(tower?.size, "large");
  assert.equal(rocket?.size, "launch");
});

test("a city that runs out of lots makes room instead of dropping projects", () => {
  const crowd: PlanEntry[] = Array.from({ length: 40 }, (_, index) => ({
    size: "large",
    slug: `p${index}`,
  }));
  const { lots } = planCity(crowd);
  for (const entry of crowd) {
    assert.ok(
      lots.some((lot) => lot.slug === entry.slug),
      `${entry.slug} was left homeless`,
    );
  }
});

test("every block and lot is on dry land", () => {
  const { blocks, lots } = planCity(ENTRIES);
  for (const rect of [...blocks, ...lots]) {
    for (const [x, z] of [
      [rect.x, rect.z],
      [rect.x + rect.w, rect.z],
      [rect.x, rect.z + rect.d],
      [rect.x + rect.w, rect.z + rect.d],
    ] as const) {
      assert.ok(inland(x, z) > 0, `(${x}, ${z}) is in the sea`);
    }
  }
});

test("every junction can be driven to from every other", () => {
  const { junctions, roads } = planCity(ENTRIES);
  const neighbors = new Map<string, string[]>();
  for (const road of roads) {
    neighbors.set(road.from, [...(neighbors.get(road.from) ?? []), road.to]);
    neighbors.set(road.to, [...(neighbors.get(road.to) ?? []), road.from]);
  }
  const [start] = junctions;
  assert.ok(start);
  const seen = new Set([start.id]);
  const queue = [start.id];
  while (queue.length > 0) {
    const id = queue.shift() ?? "";
    for (const next of neighbors.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.equal(seen.size, junctions.length);
});
