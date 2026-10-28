import assert from "node:assert/strict";
import test from "node:test";

import {
  BEND_REACH,
  bent,
  HANG,
  spiderLegs,
  WALK,
  walkPath,
  WEB_PATH,
  WEB_SIZE,
  webPath,
} from "./web";

const legsIn = (gait: 0 | 1) => spiderLegs(gait).split("M").length - 1;

const coords = (p: string) => p.split(" ").map(Number);

const numbers = (path: string) => [...path.matchAll(/-?\d+(?:\.\d+)?/gu)].map(([n]) => Number(n));

test("the web stays in its corner's box, and the spider hangs on it", () => {
  for (const n of numbers(WEB_PATH)) {
    assert.ok(n >= 0 && n <= WEB_SIZE, `${n}`);
  }
  assert.ok(WEB_PATH.includes(WALK));
  assert.ok(HANG.x > 0 && HANG.y > 0 && Math.hypot(HANG.x, HANG.y) < WEB_SIZE);
});

test("a spider's two gaits split its eight legs four and four", () => {
  assert.equal(legsIn(0), 4);
  assert.equal(legsIn(1), 4);
});

test("a bend pushes the web aside round the mouse and leaves the rest still", () => {
  const far = { strength: 1, x: 400, y: 400 };
  assert.equal(webPath(far), WEB_PATH);
  assert.equal(webPath({ strength: 0, x: 60, y: 60 }), WEB_PATH);
  const near = webPath({ strength: 1, x: 60, y: 60 });
  assert.notEqual(near, WEB_PATH);
  // The corner and the spokes' far ends stay tied.
  assert.ok(near.startsWith("M0 0"));
  assert.equal(near.split("M").length, WEB_PATH.split("M").length);
  for (const spoke of WEB_PATH.split("M").slice(1, 7)) {
    const end = spoke.split("L").at(-1);
    assert.ok(end && near.includes(end));
  }
});

test("a bent point moves away from the mouse, most near it, none at its reach", () => {
  const bend = { strength: 1, x: 50, y: 50 };
  const [x1 = 0] = coords(bent(60, 50, bend));
  const [x2 = 0] = coords(bent(80, 50, bend));
  assert.ok(x1 > 60 && x2 > 80);
  assert.ok(x1 - 60 > x2 - 80);
  assert.equal(bent(50 + BEND_REACH, 50, bend), "106 50");
  assert.equal(walkPath(null), WALK);
});
