import assert from "node:assert/strict";
import test from "node:test";

import { createIntro } from "./intro";

const run = (intro: ReturnType<typeof createIntro>, frames: number, elapsed = 1 / 60) => {
  const steps = [];
  for (let frame = 0; frame < frames; frame += 1) {
    steps.push(intro.step(elapsed));
  }
  return steps;
};

test("it builds, opens once, clears once, and is done", () => {
  const intro = createIntro({ built: 1, cleared: 1.5, still: false });
  assert.equal(intro.phase, "building");
  const steps = run(intro, 120);
  assert.equal(steps.filter((step) => step.opened).length, 1);
  assert.equal(steps.filter((step) => step.cleared).length, 1);
  assert.equal(intro.phase, "done");
  assert.equal(intro.clock, null);
});

test("a slow frame slows the build rather than skipping it", () => {
  const intro = createIntro({ built: 1, cleared: 1.5, still: false });
  intro.step(3);
  assert.equal(intro.phase, "building");
  assert.ok((intro.clock ?? 0) <= 0.05 + 1e-9);
});

test("the camera pulls back from downtown while it builds, until the visitor takes it", () => {
  const intro = createIntro({ built: 2, cleared: 3, still: false });
  assert.equal(intro.pullBack, 0);
  run(intro, 60);
  const midway = intro.pullBack ?? -1;
  assert.ok(midway > 0 && midway < 1);
  intro.take();
  assert.equal(intro.pullBack, null);
  assert.equal(intro.taken, true);
});

test("with reduced motion there's no opening: the town's simply there", () => {
  const intro = createIntro({ built: 2, cleared: 3, still: true });
  assert.equal(intro.phase, "done");
  assert.deepEqual(intro.step(1), { cleared: false, opened: false });
});
