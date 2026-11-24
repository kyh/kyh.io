import assert from "node:assert/strict";
import test from "node:test";

import { createSky, glowOf, ROCKETS, SPARKS, stepSky, WAIT } from "./fireworks";

const WIDTH = 1200;
const HEIGHT = 800;

const run = (seconds: number, seed = 1) => {
  const sky = createSky(seed);
  let most = 0;
  let bursts = 0;

  for (let t = 0; t < seconds; t += 1 / 60) {
    const rockets = sky.rockets.length;
    stepSky(sky, 1 / 60, WIDTH, HEIGHT);
    most = Math.max(most, sky.rockets.length);
    bursts += Math.max(0, rockets - sky.rockets.length);
  }

  return { bursts, most, sky };
};

test("rockets go up from the bottom and burst high on the screen", () => {
  const sky = createSky(3);
  let highest = HEIGHT;

  while (sky.sparks.length === 0) {
    stepSky(sky, 1 / 60, WIDTH, HEIGHT);
    highest = Math.min(highest, ...sky.rockets.map(({ y }) => y));
  }

  assert.ok(highest < HEIGHT * 0.65, `${highest}`);
  assert.ok(highest > 0, `${highest}`);
  assert.ok(sky.sparks.length >= SPARKS[0] && sky.sparks.length < SPARKS[1]);
});

test("the show keeps going, never more than a couple of rockets climbing at once", () => {
  const { bursts, most } = run(30);
  assert.ok(most <= ROCKETS);
  assert.ok(bursts >= 30 / WAIT[1] - 2, `${bursts}`);
  assert.ok(bursts <= 30 / WAIT[0] + 1, `${bursts}`);
});

test("sparks burn out, so the sky stays light", () => {
  const { sky } = run(60);
  assert.ok(sky.sparks.length < SPARKS[1] * 3, `${sky.sparks.length}`);

  for (const spark of sky.sparks) {
    assert.ok(spark.age < spark.life);
    assert.ok(glowOf(spark) > 0 && glowOf(spark) <= 1);
  }
});

test("a long pause (a hidden tab) steps the sky a moment, not all at once", () => {
  const sky = createSky(5);
  stepSky(sky, 30, WIDTH, HEIGHT);
  assert.ok(sky.rockets.length <= 1);
  assert.ok(sky.rockets.every(({ y }) => y > HEIGHT * 0.9));
});

test("the same seed puts on the same show", () => {
  assert.deepEqual(run(5, 9).sky.sparks, run(5, 9).sky.sparks);
});
