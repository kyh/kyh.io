import assert from "node:assert/strict";
import { test } from "node:test";
import type { Area, Ring, Terrain } from "./scene";
import {
  area,
  areaOf,
  canopyOf,
  heightAt,
  inArea,
  lookOf,
  roadOf,
  scatterTrees,
  seeded,
} from "./scene";

// a tree's place, to compare two frames' trees
const key = (t: { e: number; n: number }) => `${t.e.toFixed(3)}:${t.n.toFixed(3)}`;

const square = (x: number, y: number, s: number): Ring => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y],
];

test("the ground's height is bilinear between its grid points and held at the edges", () => {
  const t: Terrain = { cols: 2, e0: 0, heights: [0, 10, 20, 30], n0: 0, rows: 2, step: 4 };
  assert.equal(heightAt(t, 0, 0), 0);
  assert.equal(heightAt(t, 2, 0), 5);
  assert.equal(heightAt(t, 2, 2), 15);
  assert.equal(heightAt(t, 100, 100), 30);
  assert.equal(heightAt(t, -100, -100), 0);
});

test("areas and holes", () => {
  assert.equal(area(square(0, 0, 10)), 100);
  const donut = [square(0, 0, 10), square(3, 3, 4)];
  assert.ok(inArea(donut, 1, 1));
  assert.ok(!inArea(donut, 5, 5));
  assert.ok(!inArea(donut, 11, 5));
});

test("the same seed draws the same numbers, in [0, 1)", () => {
  const a = seeded(42);
  const b = seeded(42);
  const draws = Array.from({ length: 50 }, () => a());
  assert.deepEqual(
    draws,
    Array.from({ length: 50 }, () => b()),
  );
  assert.ok(draws.every((d) => d >= 0 && d < 1));
});

test("a park grows the same trees whichever frame asks, and only inside it", () => {
  const park: Area[] = [{ kind: "park", rings: [square(0, 0, 200)] }];
  const whole = scatterTrees(park, { e0: -50, e1: 250, n0: -50, n1: 250 });
  const half = scatterTrees(park, { e0: -50, e1: 100, n0: -50, n1: 250 });
  assert.ok(whole.length > 50);
  assert.ok(whole.every((t) => t.e >= 0 && t.e <= 200 && t.n >= 0 && t.n <= 200));
  // every tree the half frame grows is one the whole frame grows too, so frames agree on a seam
  const all = new Set(whole.map(key));
  assert.ok(half.every((t) => all.has(key(t))));
  assert.equal(
    scatterTrees([{ kind: "grass", rings: [square(0, 0, 200)] }], {
      e0: 0,
      e1: 200,
      n0: 0,
      n1: 200,
    }).length,
    0,
  );
});

test("buildings, trees, roads and ground classes", () => {
  assert.equal(lookOf(120, 9), "house");
  assert.equal(lookOf(2000, 30), "block");
  assert.equal(lookOf(800, 120), "tower");
  assert.equal(canopyOf(0), 1.6);
  assert.equal(canopyOf(1000), 6);
  assert.deepEqual(roadOf("primary"), { kind: "major", width: 15 });
  assert.equal(roadOf("ferry"), null);
  assert.equal(areaOf("water", "ocean"), "water");
  assert.equal(areaOf("landcover", "wood"), "wood");
  assert.equal(areaOf("landuse", "residential"), null);
});
