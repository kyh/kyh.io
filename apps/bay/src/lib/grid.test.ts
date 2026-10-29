import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRID,
  SF,
  cameraFor,
  curvature,
  frameRect,
  frameSize,
  groundAt,
  groundBox,
  localToCanvas,
  parseKey,
  tileAt,
  tileKey,
  toCanvas,
  toLatLon,
  toLocal,
} from "./grid";

const near = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("the anchor is the canvas origin", () => {
  const at = toCanvas(SF, SF.anchor.lat, SF.anchor.lon, SF.anchor.height);
  near(at.x, 0);
  near(at.y, 0);
});

test("looking north, north is up the screen and east is right", () => {
  const north = toCanvas(SF, SF.anchor.lat + 0.001, SF.anchor.lon, 0);
  const east = toCanvas(SF, SF.anchor.lat, SF.anchor.lon + 0.001, 0);
  assert.ok(north.y < 0);
  near(north.x, 0, 1);
  assert.ok(east.x > 0);
  near(east.y, 0, 1);
  // 111 m of ground north, foreshortened by the 45° tilt: ~111·sin45 / 0.25 px
  near(-north.y, (111 * Math.SQRT1_2) / SF.mpp, 3);
});

test("standing taller moves a point up the screen by its height times cos(tilt)", () => {
  const ground = toCanvas(SF, 37.79, -122.4, 0);
  const roof = toCanvas(SF, 37.79, -122.4, 100);
  near(roof.x, ground.x, 0.05);
  near(ground.y - roof.y, (100 * Math.cos(Math.PI / 4)) / SF.mpp, 0.05);
});

test("a tile's camera looks at the middle of its frame", () => {
  const rect = frameRect(GRID, 3, -2);
  const cam = cameraFor(SF, rect);
  const at = localToCanvas(SF, cam.target);
  near(at.x, rect.x + rect.w / 2);
  near(at.y, rect.y + rect.h / 2);
  near(cam.halfWidth * 2, frameSize(GRID) * SF.mpp);
  // and stands back along its look from there
  const back = localToCanvas(SF, cam.position);
  near(back.x, at.x);
  near(back.y, at.y);
});

test("groundAt finds the ground a canvas point shows", () => {
  const p = toLocal(SF, 37.79, -122.41, 0);
  for (const z of [0, 50, 200]) {
    const c = localToCanvas(SF, [p[0], p[1], z]);
    const g = groundAt(SF, c.x, c.y, z);
    near(g.e, p[0]);
    near(g.n, p[1]);
  }
  const box = groundBox(SF, { h: 100, w: 100, x: 0, y: 0 }, 0, 300);
  assert.ok(
    box.e1 - box.e0 > 0 && box.n1 - box.n0 > 300,
    "tall things from far off are in the box",
  );
});

test("local metres keep the Earth's curve", () => {
  const far = toLocal(SF, SF.anchor.lat + 0.09, SF.anchor.lon, 0);
  near(far[2], curvature(far[0], far[1]), 0.1);
  assert.ok(far[2] < -7);
  const back = toLatLon(SF, far[0], far[1]);
  near(back.lat, SF.anchor.lat + 0.09, 1e-4);
});

test("frames overlap their neighbours by the margin on each side", () => {
  const a = frameRect(GRID, 0, 0);
  const b = frameRect(GRID, 1, 0);
  assert.equal(a.x + a.w - b.x, GRID.margin * 2);
});

test("tile keys round-trip and cores tile the canvas", () => {
  assert.deepEqual(parseKey(tileKey(-3, 7)), { i: -3, j: 7 });
  assert.throws(() => parseKey("nope"));
  assert.deepEqual(tileAt(GRID, -1, GRID.core), { i: -1, j: 1 });
});
