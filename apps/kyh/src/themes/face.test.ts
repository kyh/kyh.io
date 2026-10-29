import assert from "node:assert/strict";
import test from "node:test";

import { createMood, facePaths, startle, stepMood } from "./face";

const calm = { jolt: 0, moved: 0, poked: false };

/** An ellipse path's first radius: how wide it's drawn. */
const widthOf = (d: string) => Number(/a(?<rx>\d+(?:\.\d+)?)/u.exec(d)?.groups?.rx);
const still = { x: 0, y: 0 };

/** Steps a mood `seconds` at 60 frames a second under the same cues. */
const run = (seconds: number, cues = calm, mood = createMood(1)) => {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    stepMood(mood, 1 / 60, cues);
  }
  return mood;
};

test("at rest it has round eyes with their shine, a mouth and blushing cheeks, and no > <", () => {
  const face = facePaths(createMood(1), still, 0);
  assert.ok(face.eyes.length > 0 && face.shine.length > 0);
  assert.ok(face.mouth.length > 0 && face.cheeks.length > 0);
  assert.equal(face.squints, "");
});

test("it blinks every few seconds, and opens again", () => {
  const mood = createMood(7);
  let shut = 0;
  let opened = false;
  for (let frame = 0; frame < 60 * 12; frame += 1) {
    stepMood(mood, 1 / 60, calm);
    if (mood.blink > 0.9) {
      shut += 1;
    } else if (shut > 0 && mood.blink < 0.1) {
      opened = true;
    }
  }
  assert.ok(shut >= 2, `${shut}`);
  assert.ok(opened);
});

test("poked or jolted, it screws its eyes shut into > < and blushes harder", () => {
  const poked = run(0.4, { jolt: 0, moved: 0, poked: true });
  const face = facePaths(poked, still, 0);
  assert.equal(face.eyes, "");
  assert.ok(face.squints.length > 0);
  assert.ok(face.blush > facePaths(createMood(1), still, 0).blush);

  const jolted = createMood(1);
  stepMood(jolted, 1 / 60, { jolt: 1, moved: 0, poked: false });
  assert.ok(facePaths(run(0.2, calm, jolted), still, 0).squints.length > 0);
  // And opens them again after.
  assert.equal(facePaths(run(1.5, calm, jolted), still, 0).squints, "");
});

test("hurried, its eyes and mouth go wide, and calm as it slows", () => {
  const calmFace = facePaths(createMood(1), still, 0);
  const hurried = run(0.3, { jolt: 0, moved: 40, poked: false });
  assert.ok(widthOf(facePaths(hurried, still, 0).mouth) > widthOf(calmFace.mouth));
  run(2, calm, hurried);
  assert.ok(hurried.excite < 0.05, `${hurried.excite}`);
});

test("a click startles it into > < for a moment, then it opens its eyes again", () => {
  const mood = createMood(1);
  startle(mood);
  assert.ok(facePaths(run(0.2, calm, mood), still, 0).squints.length > 0);
  assert.equal(facePaths(run(1, calm, mood), still, 0).squints, "");
});
