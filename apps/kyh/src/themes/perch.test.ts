import assert from "node:assert/strict";
import test from "node:test";

import { HOME, landing, leanFor, PERCH_REACH, perchFor } from "./perch";

const perches = [
  { key: "app:a", x: 100, y: 100 },
  { key: "app:b", x: 160, y: 100 },
];

test("a hat lands on the nearest perch in reach", () => {
  assert.equal(perchFor({ x: 110, y: 104 }, perches), "app:a");
  assert.equal(perchFor({ x: 140, y: 100 }, perches), "app:b");
});

test("out of every perch's reach, it goes home", () => {
  assert.equal(perchFor({ x: 100, y: 100 + PERCH_REACH + 1 }, perches), HOME);
  assert.equal(perchFor({ x: 0, y: 0 }, []), HOME);
});

test("carried, a hat leans into the way it's dragged, the faster the more, up to its most", () => {
  assert.equal(leanFor(0), 0);
  assert.ok(leanFor(3) > 0 && leanFor(-3) < 0);
  assert.ok(leanFor(5) > leanFor(2));
  assert.equal(leanFor(400), 8);
  assert.equal(leanFor(-400), -8);
});

test("let go, a hat lands from where it was dropped onto its tilt, full size, and wobbles on the way", () => {
  const frames = landing({ x: 40, y: -30 }, 20, 8);
  const [first] = frames;
  const last = frames.at(-1);
  assert.deepEqual(first, { rotate: "28deg", scale: 1.15, translate: "40px -30px" });
  assert.deepEqual(last, { rotate: "20deg", scale: 1, translate: "0px 0px" });
  const turns = frames.map(({ rotate }) => Number(rotate.replace("deg", "")));
  assert.ok(
    turns.some((turn) => turn < 20),
    "swings past its tilt",
  );
});
