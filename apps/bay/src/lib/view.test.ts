import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_ZOOM, clampView, formatHash, parseHash, toScreen, toWorld, zoomAt } from "./view";

const screen = { h: 600, w: 800 };
const bounds = { h: 2000, w: 4000, x: -2000, y: -1000 };

test("zooming about a point keeps that point under it", () => {
  const view = { x: 10, y: 20, zoom: 0.5 };
  const before = toWorld(view, screen, 100, 500);
  const after = zoomAt(view, screen, 3, 100, 500);
  const still = toWorld(after, screen, 100, 500);
  assert.ok(Math.abs(still.x - before.x) < 1e-9 && Math.abs(still.y - before.y) < 1e-9);
  const back = toScreen(after, screen, before.x, before.y);
  assert.ok(Math.abs(back.x - 100) < 1e-9);
});

test("the view stays over the map and within its zooms", () => {
  assert.equal(clampView({ x: 1e6, y: 0, zoom: 99 }, bounds, screen).zoom, MAX_ZOOM);
  assert.equal(clampView({ x: 1e6, y: 0, zoom: 1 }, bounds, screen).x, 2000);
  assert.ok(clampView({ x: 0, y: 0, zoom: 1e-6 }, bounds, screen).zoom > 0.1);
});

test("the address round-trips and rejects junk", () => {
  assert.deepEqual(parseHash(formatHash({ x: 12.4, y: -7.6, zoom: 0.25 })), {
    x: 12,
    y: -8,
    zoom: 0.25,
  });
  assert.equal(parseHash("#1,2"), null);
  assert.equal(parseHash("#a,b,c"), null);
  assert.equal(parseHash("#1,2,0"), null);
});
