import assert from "node:assert/strict";
import test from "node:test";

import type { Built } from "./render";
import type { Object3D } from "three";
import { Mesh } from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";

import type { StartAt } from "./grow";
import { BUILT, raise } from "./grow";
import { WALLS } from "./palette";
import { build, createMaterials } from "./render";
import { box, createSketch, part } from "./sketch";

/** The starts stamped on one mesh or line batch, if it is one. */
const stampOf = (object: Object3D) => {
  if (object instanceof LineSegments2) {
    return object.geometry.getAttribute("instanceBuildAt");
  }
  return object instanceof Mesh ? object.geometry.getAttribute("buildAt") : null;
};

/** Every start stamped on a build's faces and ink, as a set. */
const stamps = (built: Built) => {
  const starts = new Set<number>();
  built.group.traverse((object) => {
    const at = stampOf(object);
    if (object instanceof Mesh) {
      assert.ok(at, "stamped");
    }
    if (at) {
      for (let index = 0; index < at.count; index += 1) {
        starts.add(at.getX(index));
      }
    }
  });
  return starts;
};

const westThenEast: StartAt = (x) => (x < 5 ? 1 : 2);

const twoBoxes = () => {
  const sketch = createSketch();
  box(sketch, { colors: WALLS, d: 1, h: 1, w: 1, x: 2, y: 0, z: 2 });
  const piece = part(sketch, "piece", [10, 1, 2]);
  box(piece, { colors: WALLS, d: 0.5, h: 0.5, w: 0.5, x: 0, y: 0, z: 0 });
  return build(sketch, createMaterials({ hue: null, light: 1 }));
};

test("every face and ink line is stamped with the start of where it stands, a part by its place in town", () => {
  assert.deepEqual([...stamps(raise(twoBoxes(), westThenEast))].toSorted(), [1, 2]);
});

test("what's never built is stamped as built long ago", () => {
  assert.deepEqual([...stamps(raise(twoBoxes(), BUILT))], [BUILT(0, 0)]);
});
