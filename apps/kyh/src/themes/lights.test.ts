import assert from "node:assert/strict";
import test from "node:test";

import { bulbsOf, COLORS, HOOK, PER_SPAN, PHASES, SAG, SPAN, wirePath } from "./lights";

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

test("neighbors differ in color and never dim together, and every twinkle has its bulbs", () => {
  const bulbs = bulbsOf(6);

  for (const [index, bulb] of bulbs.entries()) {
    assert.equal(bulb.color, index % COLORS);
    assert.ok(bulb.phase >= 0 && bulb.phase < PHASES);
    assert.notEqual(bulb.phase, bulbs[index - 1]?.phase);
  }

  assert.equal(new Set(bulbs.map(({ phase }) => phase)).size, PHASES);
});

test("the wire is one curve per scallop", () => {
  assert.equal(wirePath(3).match(/Q/gu)?.length, 3);
});
