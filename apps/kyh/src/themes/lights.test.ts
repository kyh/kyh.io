import assert from "node:assert/strict";
import test from "node:test";

import { bulbsOf, COLORS, HOOK, PER_SPAN, SAG, SPAN, wirePath } from "./lights";

test("bulbs hang on the wire, between its hooks and its lowest dip", () => {
  const bulbs = bulbsOf(4);
  assert.equal(bulbs.length, 4 * PER_SPAN);

  for (const bulb of bulbs) {
    assert.ok(bulb.y > HOOK && bulb.y <= HOOK + SAG, `${bulb.y}`);
    assert.ok(bulb.x > 0 && bulb.x < 4 * SPAN, `${bulb.x}`);
    assert.ok(Math.abs(bulb.tilt) < 45, `${bulb.tilt}`);
  }
});

test("the middle bulb of a scallop hangs lowest and straight, the outer ones lean out", () => {
  const [left, middle, right] = bulbsOf(1);
  assert.ok(left && middle && right);
  assert.equal(middle.y, HOOK + SAG);
  assert.equal(middle.tilt, 0);
  assert.equal(left.tilt, -right.tilt);
  assert.ok(left.tilt > 0);
});

test("neighbors differ in color, and every bulb is mid-twinkle when the page opens", () => {
  const bulbs = bulbsOf(6);

  for (const [index, bulb] of bulbs.entries()) {
    assert.equal(bulb.color, index % COLORS);
    assert.ok(bulb.delay <= 0 && -bulb.delay < bulb.period);
  }
});

test("the wire is one curve per scallop", () => {
  assert.equal(wirePath(3).match(/Q/gu)?.length, 3);
});
