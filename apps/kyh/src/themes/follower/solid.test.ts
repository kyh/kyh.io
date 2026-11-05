import assert from "node:assert/strict";
import test from "node:test";

import type { Ellipsoid, Spring, Vec3 } from "./solid";
import {
  apply,
  capPath,
  depthOf,
  ellipseOf,
  headingOf,
  PITCH,
  pitchOf,
  rollOf,
  springAt,
  stepAngle,
  stepSpring,
  toScreen,
  yawOf,
} from "./solid";

const close = (a: number, b: number, within = 1e-6) => Math.abs(a - b) < within;
const near = (a: Vec3, b: Vec3) => a.every((value, index) => close(value, b[index] ?? Number.NaN));

test("turns go the way their names say", () => {
  // A quarter turn faces it toward the camera; a roll tips its top to its left; a pitch lifts its front.
  assert.ok(near(apply(yawOf(Math.PI / 2), [1, 0, 0]), [0, 0, 1]));
  assert.ok(near(apply(rollOf(Math.PI / 2), [0, 1, 0]), [0, 0, 1]));
  assert.ok(near(apply(pitchOf(Math.PI / 2), [1, 0, 0]), [0, 1, 0]));
});

test("seen from above: up is up the screen, toward the camera is down it and nearer", () => {
  assert.ok(toScreen([0, 10, 0]).y < 0);
  assert.ok(toScreen([0, 0, 10]).y > 0);
  assert.ok(depthOf([0, 0, 10]) > depthOf([0, 0, -10]));
  assert.ok(depthOf([0, 10, 0]) > 0);
});

test("a ball is seen as a circle its size, and a flat disc lying down is squashed by the view", () => {
  const ball = ellipseOf(
    [0, 10, 0],
    [
      [5, 0, 0],
      [0, 5, 0],
      [0, 0, 5],
    ],
  );
  assert.ok(close(ball.rx, 5, 0.01) && close(ball.ry, 5, 0.01));
  const disc = ellipseOf(
    [0, 0, 0],
    [
      [4, 0, 0],
      [0, 0, 4],
    ],
  );
  assert.ok(close(disc.rx, 4, 0.01));
  assert.ok(close(disc.ry, 4 * Math.sin(PITCH), 0.01), `${disc.ry}`);
  // Turned a quarter, a long body is seen end on: short across the screen.
  const long: Vec3[] = [
    [20, 0, 0],
    [0, 8, 0],
    [0, 0, 8],
  ];
  const side = ellipseOf([0, 0, 0], long);
  const front = ellipseOf(
    [0, 0, 0],
    long.map((axis) => apply(yawOf(Math.PI / 2), axis)),
  );
  assert.ok(Math.max(side.rx, side.ry) > Math.max(front.rx, front.ry) + 5);
});

/** A spring run two seconds toward 10 at `fps` frames a second: where it ends, and the furthest it got. */
const run = (fps: number) => {
  const spring: Spring = springAt(0);
  let most = 0;
  for (let frame = 0; frame < fps * 2; frame += 1) {
    stepSpring(spring, 10, 8, 1 / fps);
    most = Math.max(most, spring.x);
  }
  return { at: spring.x, most };
};

test("a spring reaches its goal smoothly, never past it, at any frame rate", () => {
  for (const fps of [30, 60, 144]) {
    const { at, most } = run(fps);
    assert.ok(close(at, 10, 0.05), `${fps}: ${at}`);
    assert.ok(most <= 10 + 1e-9, `${fps}: overshot to ${most}`);
  }
  assert.ok(close(run(30).at, run(144).at, 0.02));
  // One long step, as after a stalled frame, lands near the goal without passing it.
  const stalled = springAt(0);
  stepSpring(stalled, 10, 8, 1);
  assert.ok(stalled.x > 9.9 && stalled.x <= 10, `${stalled.x}`);
});

test("a heading turns the short way round, across ±π", () => {
  const heading = springAt(Math.PI - 0.1);
  stepAngle(heading, -Math.PI + 0.1, 20, 1 / 60);
  // From just under π to just over -π is 0.2 the short way: it goes on past π, wrapping.
  assert.ok(Math.abs(heading.x) > Math.PI - 0.1 - 1e-9, `${heading.x}`);
  for (let frame = 0; frame < 120; frame += 1) {
    stepAngle(heading, -Math.PI + 0.1, 20, 1 / 60);
  }
  assert.ok(close(heading.x, -Math.PI + 0.1, 1e-3), `${heading.x}`);
});

test("a move down the screen faces it toward the camera, across it to its side", () => {
  assert.ok(close(headingOf(10, 0), 0));
  assert.ok(close(headingOf(0, 10), Math.PI / 2));
  assert.ok(close(headingOf(-10, 0), Math.PI));
});

const ball = (facingAngle: number): Ellipsoid => ({
  center: [0, 20, 0],
  radii: [10, 10, 10],
  turn: (local) => apply(yawOf(facingAngle), local),
});

/** The area inside a closed path of straight segments (M and L only). */
const areaOf = (d: string) => {
  const points = [...d.matchAll(/[ML](?<x>-?[\d.]+) (?<y>-?[\d.]+)/gu)].map(({ groups }) => [
    Number(groups?.x),
    Number(groups?.y),
  ]);
  let sum = 0;
  for (const [index, [x1 = 0, y1 = 0] = []] of points.entries()) {
    const [x2 = 0, y2 = 0] = points[(index + 1) % points.length] ?? [];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

test("a cap shows whole facing the camera, in part side on, and not at all turned away", () => {
  // The cap past the plane halfway out along its front.
  const toward = capPath(ball(Math.PI / 2), [1, 0, 0], 0.5);
  const side = capPath(ball(0), [1, 0, 0], 0.5);
  const away = capPath(ball(-Math.PI / 2), [1, 0, 0], 0.5);
  assert.equal(away, "");
  assert.ok(toward.endsWith("Z") && side.endsWith("Z"));
  assert.ok(areaOf(toward) > areaOf(side), `${areaOf(toward)} ${areaOf(side)}`);
  // Facing the camera, the rim is a circle of radius √(1 - 0.5²) of the ball's, seen a little from above.
  const rim = 10 * Math.sqrt(0.75);
  assert.ok(
    Math.abs(areaOf(toward) - Math.PI * rim * rim * Math.cos(PITCH)) / (Math.PI * rim * rim) < 0.05,
  );
  // Side on, the cap is the front sliver of the outline: right of its middle.
  const xs = [...side.matchAll(/[ML](?<x>-?[\d.]+) /gu)].map(({ groups }) => Number(groups?.x));
  assert.ok(Math.min(...xs) > 4, `${Math.min(...xs)}`);
});
