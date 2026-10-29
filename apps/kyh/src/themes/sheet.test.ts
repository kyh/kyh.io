import assert from "node:assert/strict";
import test from "node:test";

import type { Ghost } from "./sheet";
import { createGhost, ghostPaths, hemOf, POINTS, stepGhost } from "./sheet";

const still = { x: 0, y: 0 };

/** Runs it `seconds` at 60 frames a second after a pointer at `at`, moving `by` a frame. */
const run = (ghost: Ghost, at: { x: number; y: number }, seconds: number, by = still) => {
  let pointer = at;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepGhost(ghost, pointer, by, 1 / 60);
  }
  return pointer;
};

const hemMiddle = (ghost: Ghost) => {
  const tips = hemOf(ghost);
  const middle = { x: 0, y: 0 };
  for (const tip of tips) {
    middle.x += tip.x / tips.length;
    middle.y += tip.y / tips.length;
  }
  return middle;
};

test("left be, it floats near the pointer, its sheet hanging below its head", () => {
  const ghost = createGhost({ x: 400, y: 300 });
  run(ghost, { x: 400, y: 300 }, 4);
  const away = Math.hypot(ghost.x - 400, ghost.y - 300);
  assert.ok(away > 30 && away < 55, `${away}`);
  const hem = hemMiddle(ghost);
  assert.ok(hem.y > ghost.y + 20, `${hem.y - ghost.y}`);
  assert.ok(Math.abs(hem.x - ghost.x) < 6, `${hem.x - ghost.x}`);
});

test("moving, it floats behind the pointer and the air streams its sheet out behind it", () => {
  const ghost = createGhost({ x: 100, y: 300 });
  run(ghost, { x: 100, y: 300 }, 2);
  const pointer = run(ghost, { x: 100, y: 300 }, 0.6, { x: 8, y: 0 });
  assert.ok(ghost.x < pointer.x, "behind");
  assert.ok(ghost.vx > 200, `${ghost.vx}`);
  // Leaning into it, the hem trailing back.
  assert.ok(ghost.tilt > 0.1, `${ghost.tilt}`);
  assert.ok(hemMiddle(ghost).x < ghost.x - 10, `${hemMiddle(ghost).x - ghost.x}`);
});

test("stopped, the sheet swings back under it", () => {
  const ghost = createGhost({ x: 100, y: 300 });
  const pointer = run(ghost, { x: 100, y: 300 }, 0.8, { x: 8, y: 0 });
  run(ghost, pointer, 5);
  assert.ok(Math.abs(hemMiddle(ghost).x - ghost.x) < 6);
  assert.ok(Math.abs(ghost.tilt) < 0.12, `${ghost.tilt}`);
});

const perimeter = (g: Ghost) => {
  let length = 0;
  for (const [index, knot] of g.knots.entries()) {
    const next = g.knots[(index + 1) % g.knots.length];
    length += next ? Math.hypot(next.x - knot.x, next.y - knot.y) : 0;
  }
  return length;
};
const area = (g: Ghost) => {
  let sum = 0;
  for (const [index, a] of g.knots.entries()) {
    const b = g.knots[(index + 1) % g.knots.length];
    sum += b ? a.x * b.y - b.x * a.y : 0;
  }
  return sum / 2;
};

test("the cloth keeps its length and the body its fill however it's thrown about", () => {
  const ghost = createGhost({ x: 0, y: 0 });
  const restLength = perimeter(ghost);
  const restArea = area(ghost);
  let pointer = { x: 0, y: 0 };
  for (const by of [
    { x: 30, y: 0 },
    { x: -25, y: 20 },
    { x: 0, y: -40 },
  ]) {
    pointer = run(ghost, pointer, 0.3, by);
    assert.ok(Math.abs(perimeter(ghost) / restLength - 1) < 0.05, `${perimeter(ghost)}`);
    assert.ok(Math.abs(area(ghost) / restArea - 1) < 0.2, `${area(ghost)} ${restArea}`);
  }
  assert.equal(ghost.knots.length, POINTS);
});

test("a slow frame catches up no more than a tenth of a second", () => {
  const ghost = createGhost({ x: 0, y: 0 });
  stepGhost(ghost, { x: 500, y: 0 }, still, 3);
  assert.ok(ghost.time <= 0.1 + 1e-9, `${ghost.time}`);
  assert.ok(Number.isFinite(ghost.x));
});

test("its paths are drawn about its head, closed, and all numbers", () => {
  const ghost = createGhost({ x: 640, y: 480 });
  run(ghost, { x: 640, y: 480 }, 1, { x: 5, y: -3 });
  const paths = ghostPaths(ghost);
  const { blush, squints, ...drawn } = paths;
  assert.ok(blush > 0 && blush <= 1);
  for (const d of [...Object.values(drawn), squints]) {
    assert.ok(d.length > 0 || d === squints);
    assert.ok(!d.includes("NaN") && !d.includes("undefined"), d);
    for (const [n] of d.matchAll(/-?\d+(?:\.\d+)?/gu)) {
      assert.ok(Math.abs(Number(n)) < 70, n);
    }
  }
  assert.ok(paths.body.startsWith("M") && paths.body.endsWith("Z"));
});
