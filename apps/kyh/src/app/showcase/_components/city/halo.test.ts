import assert from "node:assert/strict";
import test from "node:test";

import { haloBand } from "./halo";

test("the halo is brightest on the lot's edge and fades out at both rims", () => {
  const lot = { d: 2, w: 4, x: 2, z: 3 };
  const { glow, positions } = haloBand(lot, 0.1);
  // Four sides, two strips each, two triangles a strip.
  assert.equal(glow.length, 4 * 2 * 6);
  assert.equal(positions.length, glow.length * 3);
  for (const [index, alpha] of glow.entries()) {
    const x = positions[index * 3] ?? Number.NaN;
    const z = positions[index * 3 + 2] ?? Number.NaN;
    const onEdge =
      ((x === lot.x || x === lot.x + lot.w) && z >= lot.z && z <= lot.z + lot.d) ||
      ((z === lot.z || z === lot.z + lot.d) && x >= lot.x && x <= lot.x + lot.w);
    assert.equal(alpha, onEdge ? 1 : 0, `vertex at ${x}, ${z}`);
    assert.equal(positions[index * 3 + 1], 0.1);
  }
});
