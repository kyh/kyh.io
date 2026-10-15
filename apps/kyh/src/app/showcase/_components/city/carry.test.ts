import assert from "node:assert/strict";
import test from "node:test";

import type { Ground } from "./carry";
import { carryTo, HANG, pickUp, throwOf } from "./carry";
import { VIEW } from "./sketch";

const near = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z) < 1e-9;

const FLAT: Ground = { surfaceAt: () => 0, view: VIEW };
/** A roof 3 cells up over x from 10 to 20. */
const ROOFED: Ground = { surfaceAt: (x) => (x >= 10 && x <= 20 ? 3 : 0), view: VIEW };

test("picked up, it stays where the hand took hold of it, and rises as it's carried", () => {
  const held = pickUp(FLAT, "c1", { x: 5, y: 0, z: 5 }, { x: 5.2, y: 0, z: 4.9 }, 0);
  assert.equal(held.lift, 0);
  assert.ok(near(held.offset, { x: -0.2, z: 0.1 }), "kept from the pointer");
  const carried = carryTo(FLAT, held, { x: 6.2, y: 0, z: 4.9 }, 16);
  assert.ok(near(carried.seen, { x: 6, z: 5 }), "moved with the pointer, offset kept");
  assert.ok(carried.lift > 0 && carried.lift < 1, "rising");
  const far = carryTo(FLAT, carried, { x: 12, y: 0, z: 4.9 }, 32);
  assert.equal(far.lift, 1);
  assert.ok(Math.abs(far.altitude - HANG) < 1e-9, "hangs at full height");
});

test("it hangs on the view ray through where it's seen, so it never leaves the hand", () => {
  const held = carryTo(
    FLAT,
    pickUp(FLAT, "c1", undefined, { x: 3, y: 0, z: 3 }, 0),
    { x: 9, y: 0, z: 3 },
    16,
  );
  // Back down the view ray from where it hangs lands where it's seen.
  const up = held.altitude / VIEW[1];
  assert.ok(Math.abs(held.spot.x - VIEW[0] * up - held.seen.x) < 1e-9);
  assert.ok(Math.abs(held.spot.z - VIEW[2] * up - held.seen.z) < 1e-9);
});

test("over a roof it hangs over the roof, not in it", () => {
  const held = pickUp(ROOFED, "c1", undefined, { x: 12, y: 0, z: 0 }, 0);
  const over = carryTo(ROOFED, held, { x: 15, y: 0, z: 0 }, 16);
  assert.ok(over.altitude >= ROOFED.surfaceAt(over.spot.x, over.spot.z));
});

test("let go, it's flung the way it was moving, and dropped straight when still", () => {
  let held = pickUp(FLAT, "c1", undefined, { x: 0, y: 0, z: 0 }, 0);
  for (let step = 1; step <= 6; step += 1) {
    held = carryTo(FLAT, held, { x: step * 0.5, y: 0, z: 0 }, step * 16);
  }
  const flung = throwOf(held);
  assert.ok(flung.toward.x > flung.from.x, "onward");
  const still = throwOf(pickUp(FLAT, "c2", undefined, { x: 1, y: 0, z: 1 }, 0));
  assert.deepEqual(still.toward, { x: still.from.x, z: still.from.z });
});
