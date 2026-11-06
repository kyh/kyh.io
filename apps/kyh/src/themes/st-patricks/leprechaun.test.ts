import assert from "node:assert/strict";
import test from "node:test";

import type { Point } from "../follower/walk";
import type { Leprechaun } from "./leprechaun";
import { leprechaun } from "./leprechaun";
import { coinOf, timeIn } from "./leprechaun-acts";

const FRAME = 1 / 60;
const STILL: Point = { x: 0, y: 0 };

/** A leprechaun settled by a still mouse, and a way to step him after it. */
const settled = () => {
  const state = leprechaun.create({ x: 400, y: 300 });
  let pointer: Point = { x: 400, y: 300 };
  const step = (by: Point = STILL) => {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    leprechaun.step(state, pointer, by, FRAME);
  };
  for (let frame = 0; frame < 120; frame += 1) {
    step();
  }
  return { pointer: () => pointer, state, step };
};

/** How far a chain's tip is from its root, across and down the screen. */
const tipOf = (state: Leprechaun, index: number) => {
  const chain = state.tails[index];
  const root = chain?.knots[0];
  const tip = chain?.knots.at(-1);
  return { x: (tip?.x ?? 0) - (root?.x ?? 0), y: (tip?.y ?? 0) - (root?.y ?? 0) };
};

test("however he hurries, any way across the screen, he takes no more than three strides a second", () => {
  for (const by of [
    { x: 12, y: 0 },
    { x: 0, y: 12 },
    { x: -9, y: -9 },
  ]) {
    const { state, step } = settled();
    const from = state.feet.phase;
    for (let frame = 0; frame < 120; frame += 1) {
      step(by);
    }
    const strides = state.feet.phase - from;
    assert.ok(strides / 2 <= 3, `${JSON.stringify(by)}: ${strides / 2} a second`);
  }
});

test("a foot set down stays where it was set down till it lifts", () => {
  const { state, step } = settled();
  const down = new Map<number, Point>();
  for (let frame = 0; frame < 180; frame += 1) {
    step({ x: frame < 90 ? 3 : 0, y: frame < 90 ? 1 : 0 });
    for (const [index, foot] of state.feet.feet.entries()) {
      const was = down.get(index);
      if (!foot.planted) {
        down.delete(index);
      } else if (was) {
        assert.ok(Math.hypot(foot.x - was.x, foot.y - was.y) < 1e-6, `foot ${index} slid`);
      } else {
        down.set(index, { x: foot.x, y: foot.y });
      }
    }
  }
});

test("his coat's tails stream out behind a run, swing back as he stops, and settle", () => {
  const { state, step } = settled();
  const rest = tipOf(state, 0);
  let streamed = 0;
  for (let frame = 0; frame < 50; frame += 1) {
    step({ x: 6, y: 0 });
    streamed = Math.min(streamed, tipOf(state, 0).x - rest.x);
  }
  // Running right, the tails are carried out to the left of where they hang.
  assert.ok(streamed < -3, `streamed ${streamed}`);
  for (let frame = 0; frame < 60 * 6; frame += 1) {
    step();
  }
  const after = tipOf(state, 0);
  assert.ok(Math.hypot(after.x - rest.x, after.y - rest.y) < 1.5, JSON.stringify({ after, rest }));
});

test("the coin goes up off his thumb, well over his head", () => {
  const { state, step } = settled();
  state.act = "coin";
  state.actFor = 0;
  let highest = 0;
  while (timeIn(state, "coin") !== null && (timeIn(state, "coin") ?? 1) < 1) {
    step();
    highest = Math.max(highest, coinOf(state).height);
  }
  assert.ok(highest > 15, `${highest}`);
});

test("a mouse coming to rest on him neither cuts off nor restarts his doff", () => {
  const { state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 20 };
  leprechaun.poke(state, on);
  assert.equal(state.act, "doff");
  step({ x: on.x - state.walker.x, y: on.y - state.walker.y });
  for (let frame = 0; frame < 60; frame += 1) {
    step();
  }
  leprechaun.poke(state, state.walker);
  assert.equal(state.act, "doff");
  assert.ok(state.actFor > 0.9, `${state.actFor}`);
});

test("a click elsewhere always gets a rise out of him, speaking or not", () => {
  for (let tries = 0; tries < 5; tries += 1) {
    const { state, step } = settled();
    leprechaun.poke(state, { x: state.walker.x + 300, y: state.walker.y });
    assert.equal(state.act, "cross");
    step();
  }
});

test("his face and beard's point never show through the back of his head", () => {
  const { state, step } = settled();
  for (const heading of [-Math.PI / 2, -Math.PI / 2 + 0.6, -Math.PI / 2 - 0.6]) {
    state.rig.heading.x = heading;
    state.rig.heading.v = 0;
    step();
    state.rig.heading.x = heading;
    const { order, parts } = leprechaun.pose(state);
    for (const name of ["eye-0", "eye-1", "nose", "mouth", "cheek-0", "cheek-1"]) {
      assert.equal(parts[name]?.opacity, 0, `${name} at ${heading}`);
    }
    const stack = order ?? [];
    assert.ok(stack.indexOf("face") < stack.indexOf("head"), `${heading}: ${stack.join(" ")}`);
  }
});
