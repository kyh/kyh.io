import assert from "node:assert/strict";
import { test } from "node:test";
import { frameSize, parseKey } from "./grid";
import { blend, compose, featherWeight, paintOrder, paintedShare, tileRange } from "./paint";

const grid = { core: 8, margin: 4 };
const size = frameSize(grid);
const solid = (r: number, a: number) => {
  const px = new Uint8Array(size * size * 4);
  for (let p = 0; p < px.length; p += 4) {
    px[p] = r;
    px[p + 3] = a;
  }
  return px;
};
const at = (px: Uint8Array, x: number, y: number) => [
  ...px.subarray((y * size + x) * 4, (y * size + x) * 4 + 4),
];

test("tiles are painted out from the start, each after a neighbour", () => {
  const order = paintOrder(tileRange({ i: -2, j: -2 }, { i: 2, j: 1 }), { i: 0, j: 0 });
  assert.equal(order[0], "0_0");
  assert.equal(order.length, 20);
  for (const [n, key] of order.entries()) {
    if (n > 0) {
      const { i, j } = parseKey(key);
      const before = order.slice(0, n).map(parseKey);
      assert.ok(
        before.some((t) => Math.max(Math.abs(t.i - i), Math.abs(t.j - j)) === 1),
        `${key} has no painted neighbour`,
      );
    }
  }
});

test("the feather keeps the core and fades out across the margin", () => {
  assert.equal(featherWeight(grid, 0, 5), 0);
  assert.equal(featherWeight(grid, 2, 5), 0.5);
  assert.equal(featherWeight(grid, grid.margin, grid.margin), 1);
  assert.equal(featherWeight(grid, size / 2, size / 2), 1);
});

test("compose pastes what's painted over the render and masks it to be kept", () => {
  const painted = solid(0, 0);
  painted.set([200, 0, 0, 255], 0);
  const { image, mask } = compose(solid(50, 255), painted);
  assert.deepEqual(at(image, 0, 0), [200, 0, 0, 255]);
  assert.deepEqual(at(image, 1, 0), [50, 0, 0, 255]);
  assert.equal(at(mask, 0, 0)[3], 255);
  assert.equal(at(mask, 1, 0)[3], 0);
});

test("blend: the output takes the core, fades into what's painted, and fills what isn't", () => {
  const painted = solid(0, 0);
  // the left margin already painted (a neighbour)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < grid.margin; x += 1) {
      painted.set([100, 0, 0, 255], (y * size + x) * 4);
    }
  }
  const next = blend(grid, painted, solid(200, 255));
  assert.deepEqual(at(next, 0, 8), [100, 0, 0, 255]);
  assert.deepEqual(at(next, 2, 8), [150, 0, 0, 255]);
  assert.deepEqual(at(next, 8, 8), [200, 0, 0, 255]);
  // the unpainted right margin takes the output, painted only as much as its weight
  assert.deepEqual(at(next, size - 1, 8), [200, 0, 0, 0]);
  assert.equal(paintedShare(next) > paintedShare(painted), true);
});
