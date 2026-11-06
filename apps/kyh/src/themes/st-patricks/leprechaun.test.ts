import assert from "node:assert/strict";
import test from "node:test";

import type { Point } from "../follower/walk";
import type { Leprechaun } from "./leprechaun";
import { leprechaun, PET } from "./leprechaun";
import { CATCH, coinOf, timeIn } from "./leprechaun-acts";

const FRAME = 1 / 60;
const STILL: Point = { x: 0, y: 0 };

/** A leprechaun settled by a still mouse, and a way to step him after it. */
const settled = () => {
  const state = leprechaun.create({ x: 400, y: 300 });
  // No coin flip of his own in the way: a test begins one when it wants one.
  state.next = Number.POSITIVE_INFINITY;
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

/** An ellipse's middle, from its path (`ellipsePath`): where it starts, and half its first arc's span on. */
const middleOf = (d: string | undefined) => {
  const found =
    /^M(?<x>-?[\d.]+) (?<y>-?[\d.]+)a\S+ \S+ \S+ 1 0 (?<dx>-?[\d.]+) (?<dy>-?[\d.]+)/u.exec(
      d ?? "",
    );
  const { dx = "0", dy = "0", x = "0", y = "0" } = found?.groups ?? {};
  return { x: Number(x) + Number(dx) / 2, y: Number(y) + Number(dy) / 2 };
};

test("the coin goes up off his thumb, clear over the top of his hat", () => {
  const { state, step } = settled();
  state.act = "coin";
  state.actFor = 0;
  let over = Number.NEGATIVE_INFINITY;
  while ((timeIn(state, "coin") ?? 1) < 1) {
    step();
    const { parts } = leprechaun.pose(state);
    // Up the screen is less y: how far the coin's middle gets above the top of his hat's crown.
    over = Math.max(over, middleOf(parts["crown-top"]?.d).y - middleOf(parts["coin-face"]?.d).y);
  }
  assert.ok(over > 4, `the coin peaks ${over}px over his crown`);
});

test("the mouse darting off mid-flip, he stays for the catch: the coin never vanishes in the air", () => {
  const { pointer, state, step } = settled();
  state.act = "coin";
  state.actFor = 0;
  const from = { ...state.walker };
  for (let frame = 0; (timeIn(state, "coin") ?? 1) < CATCH; frame += 1) {
    step(frame > 30 ? { x: 9, y: 0 } : STILL);
    assert.equal(state.act, "coin");
    const { parts } = leprechaun.pose(state);
    if (coinOf(state).height > 1) {
      assert.equal(parts.coin?.opacity, 1, `frame ${frame}`);
    }
  }
  assert.ok(Math.hypot(state.walker.x - from.x, state.walker.y - from.y) < 2);
  assert.ok(pointer().x > from.x + 100);
});

test("he turns his face to the visitor for his business: a doff, a cross word, a coin, a petting", () => {
  const ways = [
    (state: Leprechaun) => leprechaun.poke(state, { x: state.walker.x, y: state.walker.y - 20 }),
    (state: Leprechaun) => leprechaun.poke(state, { x: state.walker.x + 300, y: state.walker.y }),
    (state: Leprechaun) => {
      state.act = "coin";
      state.actFor = 0;
    },
  ];
  for (const [index, start] of ways.entries()) {
    const { state, step } = settled();
    // His back to the visitor, to begin with.
    state.rig.heading.x = -Math.PI / 2;
    start(state);
    for (let frame = 0; frame < 40; frame += 1) {
      step();
    }
    assert.ok(Math.sin(state.rig.heading.x) > 0.85, `${index}: ${state.rig.heading.x}`);
  }
});

test("a click on him is a greeting, not a grab at his gold: no scowl, no hands behind his back", () => {
  const { state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 20 };
  step({ x: on.x - state.walker.x, y: on.y - state.walker.y });
  for (let frame = 0; frame < 20; frame += 1) {
    step();
  }
  leprechaun.poke(state, on);
  for (let frame = 0; frame < 100; frame += 1) {
    step();
    assert.ok(state.rig.guard.x < 0.05, `guard ${state.rig.guard.x}`);
    assert.ok(state.rig.brow.x > -0.1, `brow ${state.rig.brow.x}`);
    assert.ok(!PET.includes(state.emotes.line ?? ""), `${state.emotes.line}`);
  }
});

test("walking any way, his arms, legs and coat tails keep their side of him: no flicker", () => {
  for (const by of [
    { x: 2, y: 1.5 },
    { x: -2, y: -1.5 },
    { x: 2.5, y: -1 },
    { x: 0, y: 2 },
  ]) {
    const { state, step } = settled();
    const pairs = [
      ["arm-0", "torso"],
      ["arm-1", "torso"],
      ["leg-0", "leg-1"],
      ["tail-0", "torso"],
      ["tail-1", "torso"],
    ] as const;
    let last: boolean[] = [];
    const swaps = pairs.map(() => 0);
    for (let frame = 0; frame < 180; frame += 1) {
      step(by);
      const order = leprechaun.pose(state).order ?? [];
      const now = pairs.map(([a, b]) => order.indexOf(a) > order.indexOf(b));
      for (const [index, over] of now.entries()) {
        swaps[index] = (swaps[index] ?? 0) + (last.length > 0 && over !== last[index] ? 1 : 0);
      }
      last = now;
    }
    // Once, perhaps, as he turns to his way; never with his stride.
    assert.ok(
      swaps.every((count) => count <= 1),
      `${JSON.stringify(by)}: ${swaps.join(" ")}`,
    );
  }
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
    // Under his head, and under his coat: his beard's point never hangs down his back.
    assert.ok(stack.indexOf("face") < stack.indexOf("head"), `${heading}: ${stack.join(" ")}`);
    assert.ok(stack.indexOf("face") < stack.indexOf("torso"), `${heading}: ${stack.join(" ")}`);
    assert.equal(parts.face?.opacity, 0, `${heading}`);
  }
});
