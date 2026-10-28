import assert from "node:assert/strict";
import test from "node:test";

import type { Spider } from "./bungee";
import { bounce, climb, restingReach, settled } from "./bungee";

const anchor = { x: 0, y: 0 };

const run = (from: Spider, length: number, seconds: number) => {
  let spider = from;
  for (let t = 0; t < seconds; t += 1 / 60) {
    spider = bounce(spider, anchor, length, 1 / 60);
  }
  return spider;
};

test("let go, a spider bounces on its thread and comes to rest below where it hangs from", () => {
  const thrown = run({ vx: 300, vy: -200, x: 80, y: -40 }, 50, 12);
  assert.ok(Math.abs(thrown.x) < 1, `${thrown.x}`);
  assert.ok(Math.abs(thrown.y - restingReach(50)) < 1, `${thrown.y}`);
  assert.ok(settled(thrown, anchor, 50));
});

test("on a slack thread it just falls", () => {
  const falling = bounce({ vx: 0, vy: 0, x: 0, y: 10 }, anchor, 50, 1 / 60);
  assert.ok(falling.vy > 0 && falling.x === 0);
});

test("it overshoots the rest point before settling: a bounce, not a sag", () => {
  let spider: Spider = { vx: 0, vy: 0, x: 0, y: 0 };
  let lowest = 0;
  for (let t = 0; t < 2; t += 1 / 60) {
    spider = bounce(spider, anchor, 50, 1 / 60);
    lowest = Math.max(lowest, spider.y);
  }
  assert.ok(lowest > restingReach(50) + 10, `${lowest}`);
});

test("it climbs straight home and stops there", () => {
  let spider: Spider | null = { vx: 0, vy: 0, x: 0, y: 100 };
  let steps = 0;
  while (spider) {
    const next: Spider | null = climb(spider, { x: 0, y: 20 }, 1 / 60);
    if (next) {
      assert.equal(next.x, 0);
      assert.ok(next.y < spider.y);
    }
    spider = next;
    steps += 1;
  }
  assert.ok(steps > 30 && steps < 200, `${steps}`);
});
