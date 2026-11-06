import assert from "node:assert/strict";
import test from "node:test";

import type { Chain, Hang, Point, Stuff } from "./chain";
import { CLOTH, createChain, FLOPPY, SPRINGY, stepChain, swayOf } from "./chain";

/** A chain of five 6px links hanging straight down from `root`. */
const hangAt = (root: Point): Hang => ({
  rest: Array.from({ length: 5 }, (_, index) => ({ x: 0, y: (index + 1) * 6 })),
  root,
});

/** Steps a chain at `fps` for `seconds`, its root moving at `vx` pixels a second. */
const run = (chain: Chain, stuff: Stuff, fps: number, seconds: number, from: Point, vx = 0) => {
  let root = from;
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
    root = { x: root.x + vx / fps, y: root.y };
    stepChain(chain, hangAt(root), stuff, 1 / fps);
  }
  return root;
};

const tipOf = (chain: Chain) => chain.knots.at(-1) ?? { x: Number.NaN, y: Number.NaN };

test("left alone, every kind of chain settles where it hangs", () => {
  for (const stuff of [SPRINGY, CLOTH, FLOPPY]) {
    const chain = createChain(hangAt({ x: 0, y: 0 }));
    // Knocked aside, then let be.
    for (const knot of chain.knots.slice(1)) {
      knot.x += 12;
    }
    run(chain, stuff, 60, 3, { x: 0, y: 0 });
    const sway = swayOf(chain, hangAt({ x: 0, y: 0 }));
    assert.ok(Math.hypot(sway.x, sway.y) < 3.5, `${JSON.stringify(stuff)}: ${sway.x}, ${sway.y}`);
  }
});

test("carried along, it streams out behind the move, swings on past when it stops, then settles", () => {
  for (const stuff of [SPRINGY, CLOTH, FLOPPY]) {
    const chain = createChain(hangAt({ x: 0, y: 0 }));
    const root = run(chain, stuff, 60, 0.6, { x: 0, y: 0 }, 300);
    const trailing = tipOf(chain).x - (chain.knots[0]?.x ?? root.x);
    assert.ok(trailing < -0.5, `trails behind: ${trailing}`);
    let swung = Number.NEGATIVE_INFINITY;
    for (let frame = 0; frame < 30; frame += 1) {
      run(chain, stuff, 60, 1 / 60, root);
      swung = Math.max(swung, tipOf(chain).x - root.x);
    }
    assert.ok(swung > 1, `swings on past: ${swung}`);
    run(chain, stuff, 60, 3, root);
    const settled = tipOf(chain).x - root.x;
    assert.ok(Math.abs(settled) < 1, `settles back under: ${settled}`);
  }
});

test("its links keep near their lengths, even flung", () => {
  const chain = createChain(hangAt({ x: 0, y: 0 }));
  run(chain, CLOTH, 60, 0.4, { x: 0, y: 0 }, 2000);
  for (const [index, knot] of chain.knots.entries()) {
    const before = chain.knots[index - 1];
    if (before) {
      const length = Math.hypot(knot.x - before.x, knot.y - before.y);
      assert.ok(Math.abs(length - 6) < 1.5, `link ${index}: ${length}`);
    }
  }
});

test("it moves the same at 30, 60 and 144 frames a second", () => {
  const tips = [30, 60, 144].map((fps) => {
    const chain = createChain(hangAt({ x: 0, y: 0 }));
    run(chain, FLOPPY, fps, 0.5, { x: 0, y: 0 }, 240);
    // About its own root: a frame can leave up to one step owed.
    return tipOf(chain).x - (chain.knots[0]?.x ?? 0);
  });
  const [a = 0, b = 0, c = 0] = tips;
  assert.ok(Math.abs(a - b) < 2 && Math.abs(b - c) < 2, tips.join(", "));
});

test("a hidden tab's long frame is caught up only so far: it neither leaps nor comes apart", () => {
  const chain = createChain(hangAt({ x: 0, y: 0 }));
  stepChain(chain, hangAt({ x: 400, y: 0 }), CLOTH, 5);
  for (const knot of chain.knots) {
    assert.ok(Number.isFinite(knot.x) && Number.isFinite(knot.y));
  }
  assert.equal(chain.knots[0]?.x, 400);
});
