import assert from "node:assert/strict";
import test from "node:test";

import type { Chain, Hang } from "../follower/chain";
import { holdFlesh } from "./flesh";

test("a knot falling through the floor ends at rest on it, its fall stopped", () => {
  const hang: Hang = { rest: [{ x: 0, y: 10 }], root: { x: 0, y: 0 } };
  // Falling 3 pixels a step, it's gone 2 past the floor at 10.
  const chain: Chain = {
    knots: [
      { px: 0, py: 0, x: 0, y: 0 },
      { px: 0, py: 9, x: 0, y: 12 },
    ],
    owed: 0,
  };
  holdFlesh(hang, Math.PI, 10)(chain);
  const [, knot] = chain.knots;
  assert.equal(knot?.y, 10);
  // No velocity left down (+y): its next Verlet step doesn't carry it back under.
  assert.ok((knot?.y ?? 0) - (knot?.py ?? 0) <= 0);
});
