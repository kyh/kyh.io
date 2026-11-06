import assert from "node:assert/strict";
import test from "node:test";

import type { Penguin } from "./penguin";
import type { Point } from "../follower/walk";
import { groundSpeedOf } from "../follower/feet";
import { createPenguin, pokePenguin, stepPenguin } from "./penguin";
import { WALK_TOP } from "./penguin-go";

const STILL: Point = { x: 0, y: 0 };
const FRAME = 1 / 60;

/** Runs it `seconds` at 60 frames a second after a pointer moving `by` a frame, `each` frame watched. */
const run = (
  penguin: Penguin,
  from: Point,
  seconds: number,
  by: Point = STILL,
  each: (frame: number) => void = () => {},
) => {
  let pointer = from;
  for (let frame = 0; frame < Math.round(seconds * 60); frame += 1) {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepPenguin(penguin, pointer, by, FRAME);
    each(frame);
  }
  return pointer;
};

/** A penguin settled by a still mouse. */
const settled = () => {
  const penguin = createPenguin({ x: 400, y: 300 });
  const pointer = run(penguin, { x: 400, y: 300 }, 2);
  return { penguin, pointer };
};

test("a flick of the mouse never puts it on its belly", () => {
  for (const by of [
    { x: 400 / 60, y: 0 },
    { x: 0, y: 400 / 60 },
    { x: 0, y: -400 / 60 },
  ]) {
    const { penguin, pointer } = settled();
    let lying = 0;
    // 60 pixels in 0.15 seconds, then left.
    const at = run(penguin, pointer, 0.15, by, () => {
      lying = Math.max(lying, penguin.rig.slide.x);
    });
    run(penguin, at, 2, STILL, () => {
      lying = Math.max(lying, penguin.rig.slide.x);
    });
    assert.ok(lying < 0.05, `${JSON.stringify(by)}: ${lying}`);
  }
});

test("left far behind, it lies down first, then slides, then gets up and walks", () => {
  const { penguin, pointer } = settled();
  const seen = new Set<string>();
  let fastest = 0;
  const at = run(penguin, pointer, 1.5, { x: 5, y: 0 }, () => {
    seen.add(penguin.go.going);
    // Not lain down yet, it goes no faster than it walks.
    if (penguin.rig.slide.x < 0.7) {
      fastest = Math.max(fastest, groundSpeedOf(penguin.walker));
    }
  });
  run(penguin, at, 4, STILL, () => seen.add(penguin.go.going));
  assert.deepEqual([...seen], ["walk", "flop", "slide", "rise"]);
  assert.ok(fastest < WALK_TOP + 1, `${fastest}`);
  assert.equal(penguin.go.going, "walk");
  assert.ok(penguin.rig.slide.x < 0.05);
});

test("its feet stay put going down onto its belly and getting up", () => {
  const { penguin, pointer } = settled();
  let feet = "";
  let moved = 0;
  run(penguin, pointer, 4, { x: 4, y: 0 }, () => {
    const now = JSON.stringify(penguin.feet.feet.map(({ x, y }) => [x, y]));
    const still =
      penguin.go.going === "flop" || (penguin.go.going === "rise" && penguin.go.since > 0);
    if (still && feet !== "" && now !== feet) {
      moved += 1;
    }
    feet = now;
  });
  assert.equal(moved, 0);
});

test("its feet keep their side of its body walking toward or away from the camera", () => {
  for (const by of [
    { x: 0, y: 0.5 },
    { x: 0, y: -0.5 },
  ]) {
    const { penguin, pointer } = settled();
    const sides = new Set<string>();
    const at = run(penguin, pointer, 2, by);
    run(penguin, at, 4, by, () => {
      sides.add(`${penguin.front["foot-0"]} ${penguin.front["foot-1"]}`);
    });
    assert.equal(sides.size, 1, `${JSON.stringify(by)}: ${[...sides].join(" | ")}`);
  }
});

test("turned round, it turns before it walks: never backwards", () => {
  const { penguin, pointer } = settled();
  let backward = 0;
  const watch = () => {
    const heading = penguin.rig.heading.x;
    const { vx, vy } = penguin.walker;
    const along = vx * Math.cos(heading) + (vy / Math.sin(0.48)) * Math.sin(heading);
    backward = Math.max(backward, -along);
  };
  const at = run(penguin, pointer, 2, { x: 1.2, y: 0 }, watch);
  run(penguin, at, 3, { x: -1.2, y: 0 }, watch);
  assert.ok(backward < 12, `${backward}`);
});

test("clicked on mid-jump, it lands before it brays", () => {
  const { penguin, pointer } = settled();
  pokePenguin(penguin, { x: penguin.walker.x + 200, y: penguin.walker.y });
  run(penguin, pointer, 0.3);
  assert.equal(penguin.act, "jump");
  pokePenguin(penguin, { x: penguin.walker.x, y: penguin.walker.y - 20 });
  let dropped = 0;
  let last = penguin.rig.lift.x;
  run(penguin, pointer, 0.5, STILL, () => {
    if (penguin.act === "jump") {
      dropped = Math.max(dropped, last - penguin.rig.lift.x);
    }
    last = penguin.rig.lift.x;
  });
  assert.ok(dropped < 2, `${dropped}`);
  assert.equal(penguin.act, "display");
});

test("a click elsewhere startles it into a jump every time, saying something or not", () => {
  const { penguin, pointer } = settled();
  let jumps = 0;
  for (let click = 0; click < 3; click += 1) {
    pokePenguin(penguin, { x: penguin.walker.x + 200, y: penguin.walker.y });
    jumps += penguin.act === "jump" ? 1 : 0;
    run(penguin, pointer, 1);
  }
  assert.equal(jumps, 3);
});

test("left be, its flippers stay below its head and it preens standing up", () => {
  const { penguin, pointer } = settled();
  let highest = 0;
  let bowed = 0;
  run(penguin, pointer, 40, STILL, () => {
    highest = Math.max(highest, ...penguin.rig.flippers.map(({ x }) => x));
    if (penguin.act === "preen") {
      bowed = Math.min(bowed, penguin.rig.pitch.x);
    }
  });
  assert.ok(highest <= 1.6, `${highest}`);
  assert.ok(bowed >= -0.1, `${bowed}`);
});
