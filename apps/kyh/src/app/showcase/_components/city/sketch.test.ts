import assert from "node:assert/strict";
import test from "node:test";

import type { Vec3 } from "./sketch";
import { paint } from "./palette";
import { rodTriangles } from "./sketch";

test("a rod runs from one end to the other, its round its radius from its axis", () => {
  const from: Vec3 = [1, 0.5, -2];
  const to: Vec3 = [1.6, 1.4, -1.2];
  const r = 0.05;
  const axis: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...axis);
  const corners = rodTriangles(from, to, r, paint("white")).flatMap(({ a, b, c }) => [a, b, c]);
  const alongs = corners.map((corner) => {
    const offset: Vec3 = [corner[0] - from[0], corner[1] - from[1], corner[2] - from[2]];
    const along = (offset[0] * axis[0] + offset[1] * axis[1] + offset[2] * axis[2]) / length;
    const away = Math.sqrt(Math.max(0, Math.hypot(...offset) ** 2 - along ** 2));
    assert.ok(Math.abs(away - r) < 1e-9 || away < 1e-9, `${away} from the axis`);
    return along;
  });
  assert.ok(Math.abs(Math.min(...alongs)) < 1e-9);
  assert.ok(Math.abs(Math.max(...alongs) - length) < 1e-9);
});
