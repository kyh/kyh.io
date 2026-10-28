import assert from "node:assert/strict";
import test from "node:test";

import { HOME, PERCH_REACH, perchFor } from "./perch";

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
