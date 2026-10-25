import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GRID,
  SF,
  basis,
  cameraFor,
  frameRect,
  frameSize,
  parseKey,
  tileAt,
  tileKey,
  toCanvas,
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
  const b = basis(SF);
  const d = cam.target.map((v, n) => v - (b.origin[n] ?? 0));
  const dot = (u: number[]) => d.reduce((s, v, n) => s + v * (u[n] ?? 0), 0);
  near(dot(b.right) / SF.mpp, rect.x + rect.w / 2);
  near(-dot(b.up) / SF.mpp, rect.y + rect.h / 2);
  near(cam.halfWidth * 2, frameSize(GRID) * SF.mpp);
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
