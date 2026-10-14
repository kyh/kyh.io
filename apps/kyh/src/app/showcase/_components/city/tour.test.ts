import assert from "node:assert/strict";
import test from "node:test";

import type { Stop } from "./tour";
import { createTour, orderStops } from "./tour";

const STOPS: Stop[] = [
  { slug: "far-left", x: 20, z: 30 },
  { slug: "near-left", x: 22, z: 50 },
  { slug: "near-right", x: 50, z: 40 },
  { slug: "far-right", x: 46, z: 18 },
  { slug: "middle", x: 36, z: 36 },
];

test("the flyover runs out along the near side and back along the far side", () => {
  const order = orderStops(STOPS).map((stop) => stop.slug);
  assert.deepEqual(order, ["near-left", "middle", "near-right", "far-right", "far-left"]);
});

test("the path passes over every stop", () => {
  const tour = createTour(STOPS);
  assert.ok(tour);
  for (const stop of STOPS) {
    const at = tour.at(tour.closest(stop.x, stop.z));
    assert.ok(Math.hypot(at.x - stop.x, at.z - stop.z) < 0.3, `${stop.slug} is off the path`);
  }
});

test("the path is a loop that never jumps", () => {
  const tour = createTour(STOPS);
  assert.ok(tour);
  const start = tour.at(0);
  const end = tour.at(tour.length);
  assert.ok(Math.hypot(start.x - end.x, start.z - end.z) < 1e-6);
  let previous = start;
  for (let s = 0.25; s <= tour.length; s += 0.25) {
    const point = tour.at(s);
    assert.ok(Math.hypot(point.x - previous.x, point.z - previous.z) < 0.5, `jump at ${s}`);
    previous = point;
  }
});

test("a tour needs somewhere to go", () => {
  assert.equal(createTour([]), null);
  assert.equal(createTour([{ slug: "alone", x: 0, z: 0 }]), null);
});

test("the stop near the camera is the one it is passing", () => {
  const tour = createTour(STOPS);
  assert.equal(tour?.stopNear(36.5, 36, 2)?.slug, "middle");
  assert.equal(tour?.stopNear(0, 0, 2), null);
});
