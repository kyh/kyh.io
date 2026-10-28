import assert from "node:assert/strict";
import { test } from "node:test";
import type { Area, Building, Ring, Road, Terrain } from "./scene";
import {
  area,
  areaOf,
  canopyOf,
  centroid,
  crossingsOf,
  heightAt,
  inArea,
  lookOf,
  roadOf,
  scatterTrees,
  seeded,
  spireOf,
  withoutBorrowedSpires,
} from "./scene";

// a tree's place, to compare two frames' trees
const key = (t: { e: number; n: number }) => `${t.e.toFixed(3)}:${t.n.toFixed(3)}`;

// a plain street along a line
const road = (line: [number, number][]): Road => ({
  bridge: false,
  kind: "street",
  line,
  width: 10,
});

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

test("a tower stands in the middle of a big footprint whose peak stands well above its roof", () => {
  // the Ferry Building, near enough: 200 by 50 m, roof at 18 m, clock tower to 75 m
  const ferry = [square(0, 0, 50).map(([e, n]): [number, number] => [e * 4, n])];
  assert.deepEqual(centroid(ferry[0] ?? []), [100, 25]);
  const spire = spireOf(ferry, 18, 75);
  assert.ok(spire);
  assert.equal(spire.top, 75);
  assert.equal(spire.e, 100);
  assert.ok(spire.side >= 4 && spire.side <= 12);
  // a chimney's rise, or a small footprint, is no tower
  assert.equal(spireOf(ferry, 18, 25), null);
  assert.equal(spireOf([square(0, 0, 10)], 10, 60), null);
});

test("crossings: across each street a step back from the junction, not off a road's end", () => {
  // a cross: four crossings, two across each road
  const cross = crossingsOf([
    road([
      [-100, 0],
      [100, 0],
    ]),
    road([
      [0, -100],
      [0, 100],
    ]),
  ]);
  assert.equal(cross.length, 4);
  for (const c of cross) {
    assert.equal(Math.round(Math.hypot(c.e, c.n) * 10) / 10, 7.5);
  }
  // a T: the stem ends at the junction, so there is no crossing beyond its end
  const tee = crossingsOf([
    road([
      [-100, 0],
      [100, 0],
    ]),
    road([
      [0, 0],
      [0, 100],
    ]),
  ]);
  assert.equal(tee.length, 3);
  assert.ok(tee.every((c) => c.n > -1));
  // bridges and paths get none
  assert.equal(
    crossingsOf([
      {
        ...road([
          [-100, 0],
          [100, 0],
        ]),
        bridge: true,
      },
      road([
        [0, -100],
        [0, 100],
      ]),
    ]).length,
    0,
  );
});

// a 40 m block along the east, with a tower to a peak if it has one
const block = (e: number, top: number, peak?: number): Building => {
  const b: Building = {
    base: 0,
    id: String(e),
    look: "block",
    rings: [square(e, 0, 40)],
    tone: 0,
    top,
  };
  if (peak !== undefined) {
    b.spire = { e: e + 20, n: 20, side: 6, top: peak };
  }
  return b;
};

test("a tower a taller neighbour lent is taken off; one standing alone stays", () => {
  const [low, tall] = withoutBorrowedSpires([block(0, 20, 90), block(50, 100)]);
  assert.equal(low?.spire, undefined);
  assert.equal(tall?.top, 100);
  const [alone] = withoutBorrowedSpires([block(0, 20, 90), block(200, 100)]);
  assert.equal(alone?.spire?.top, 90);
});
