import assert from "node:assert/strict";
import test from "node:test";

import { createRandom } from "@/lib/random";
import type { Point } from "../follower/walk";
import type { Leprechaun } from "./leprechaun";
import { PITCH } from "../follower/solid";
import { leprechaun, PET } from "./leprechaun";
import { hangsOf } from "./leprechaun-pose";
import { CATCH, coinOf, facingOf, HEAD_R, SIZE, timeIn } from "./leprechaun-acts";

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
  // Settled where it hangs now (he's turned since, so not where it hung before).
  const after = tipOf(state, 0);
  const hang = hangsOf(state).tails[0] ?? [];
  const [root = { x: 0, y: 0 }] = hang;
  const tip = hang.at(-1) ?? root;
  // In his own pixels, drawn bigger on the screen.
  const now = { x: (tip.x - root.x) * SIZE, y: (tip.y - root.y) * SIZE };
  assert.ok(Math.hypot(after.x - now.x, after.y - now.y) < 1.5, JSON.stringify({ after, now }));
});

test("his coat's tails never fold sharply, walking or running any way", () => {
  for (const by of [
    { x: 0, y: -1.2 },
    { x: 0, y: 1.2 },
    { x: 2, y: 0 },
    { x: 0, y: -2.5 },
    { x: -3, y: 2 },
  ]) {
    const { state, step } = settled();
    let sharpest = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      step(by);
      for (const chain of state.tails) {
        for (const [index, c] of chain.knots.entries()) {
          const a = chain.knots[index - 2];
          const b = chain.knots[index - 1];
          if (a && b) {
            const bend = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
            sharpest = Math.max(sharpest, Math.abs(Math.atan2(Math.sin(bend), Math.cos(bend))));
          }
        }
      }
    }
    assert.ok(sharpest < (70 * Math.PI) / 180, `${JSON.stringify(by)}: ${sharpest}`);
  }
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

test("the mouse darting off mid-flip, he goes after it and catches his coin on the move", () => {
  const { state, step } = settled();
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
  assert.ok(state.walker.x > from.x + 10, `${state.walker.x - from.x}`);
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
  const { pointer, state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 20 };
  step({ x: on.x - pointer().x, y: on.y - pointer().y });
  for (let frame = 0; frame < 20; frame += 1) {
    step();
  }
  leprechaun.poke(state, on);
  // Resting there a moment, he'd begun to guard his gold: the click lets it go.
  for (let frame = 0; frame < 100; frame += 1) {
    step();
    assert.ok(state.rig.guard.x < (frame < 45 ? 0.3 : 0.05), `guard ${state.rig.guard.x}`);
    assert.ok(state.rig.brow.x > -0.25, `brow ${state.rig.brow.x}`);
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
    // Once or twice as he turns to his way (round through his front, each side passes once); never
    // with his stride.
    assert.ok(
      swaps.every((count) => count <= 2),
      `${JSON.stringify(by)}: ${swaps.join(" ")}`,
    );
  }
});

test("a mouse coming to rest on him neither cuts off nor restarts his doff", () => {
  const { pointer, state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 20 };
  leprechaun.poke(state, on);
  assert.equal(state.act, "doff");
  step({ x: on.x - pointer().x, y: on.y - pointer().y });
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
  }
});

test("walking a little up the screen, near side on, his face holds steady: no blinking on and off", () => {
  for (const by of [
    { x: 2, y: -0.4 },
    { x: -2, y: -0.4 },
    { x: 3.5, y: -0.6 },
  ]) {
    const { state, step } = settled();
    // Up to his pace and turned to his way first.
    for (let frame = 0; frame < 120; frame += 1) {
      step(by);
    }
    let last: Record<string, number> = {};
    let swaps = 0;
    let over: boolean | null = null;
    for (let frame = 0; frame < 240; frame += 1) {
      step(by);
      const { order = [], parts } = leprechaun.pose(state);
      const now = order.indexOf("face") > order.indexOf("head");
      swaps += over !== null && now !== over ? 1 : 0;
      over = now;
      for (const [name, part] of Object.entries(parts)) {
        const was = last[name];
        if (part.opacity !== undefined && was !== undefined) {
          assert.ok(Math.abs(part.opacity - was) < 0.3, `${JSON.stringify(by)} ${name}`);
        }
      }
      last = Object.fromEntries(
        Object.entries(parts).flatMap(([name, part]) =>
          part.opacity === undefined ? [] : [[name, part.opacity]],
        ),
      );
    }
    assert.equal(swaps, 0, JSON.stringify(by));
  }
});

test("his jig's spin goes all the way round at 30 frames a second, as at 144", () => {
  for (const fps of [24, 30, 144]) {
    const state = leprechaun.create({ x: 400, y: 300 });
    state.next = Number.POSITIVE_INFINITY;
    let last = facingOf(state);
    let turned = 0;
    for (let frame = 0; frame < 20 * fps; frame += 1) {
      leprechaun.step(state, { x: 400, y: 300 }, STILL, 1 / fps);
      const now = facingOf(state);
      turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
    }
    // Four spins in twenty seconds of jig (and a little turn to face the visitor first).
    assert.ok(Math.abs(turned / (Math.PI * 2) - 4) < 0.15, `${fps}: ${turned / (Math.PI * 2)}`);
  }
});

test("one greeting a click: no petting answer, no guarding his gold, till the mouse moves on", () => {
  const { pointer, state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 20 };
  step({ x: on.x - pointer().x, y: on.y - pointer().y });
  leprechaun.poke(state, on);
  const said = new Set<string>();
  for (let frame = 0; frame < 60 * 4; frame += 1) {
    step();
    if (state.emotes.line !== null) {
      said.add(state.emotes.line);
    }
    assert.ok(state.rig.guard.x < 0.05, `guard ${state.rig.guard.x}`);
  }
  assert.equal(said.size, 1, [...said].join(" | "));
});

test("turned to the visitor, then sent off up the screen, he turns round and walks off: no moonwalk", () => {
  for (const start of [1.2, Math.PI / 2, 1.92, 2.3]) {
    for (const by of [
      { x: 0, y: -1.7 },
      { x: 0.6, y: -2.5 },
      { x: -0.4, y: -3.8 },
      { x: 2, y: -1.4 },
    ]) {
      const { state, step } = settled();
      state.rig.heading.x = start;
      state.rig.heading.v = 0;
      let facing = 0;
      for (let frame = 0; frame < 300; frame += 1) {
        step(by);
        facing += Math.sin(state.rig.heading.x) > 0.2 ? 1 : 0;
      }
      // A turn takes him a fraction of a second; walking backward would take the whole five.
      assert.ok(facing < 40, `from ${start}, going ${JSON.stringify(by)}: ${facing} frames`);
    }
  }
});

test("hiding his gold, his hands go behind his back, drawn behind his coat", () => {
  const { pointer, state, step } = settled();
  const on = { x: state.walker.x, y: state.walker.y - 22 };
  step({ x: on.x - pointer().x, y: on.y - pointer().y });
  for (let frame = 0; frame < 90; frame += 1) {
    step();
  }
  assert.ok(state.rig.guard.x > 0.9, `${state.rig.guard.x}`);
  const order = leprechaun.pose(state).order ?? [];
  for (const arm of ["arm-0", "arm-1"]) {
    assert.ok(order.indexOf(arm) < order.indexOf("torso"), order.join(" "));
  }
});

test("napping, he faces the visitor, so his hat tipped over his eyes is seen", () => {
  const { state, step } = settled();
  // The mouse off to one side, a little above, where he'd turn to look.
  step({ x: -140, y: -40 });
  for (let frame = 0; frame < 60 * 40; frame += 1) {
    step();
  }
  assert.ok(state.rig.nap.x > 0.9, `${state.rig.nap.x}`);
  assert.ok(Math.sin(state.rig.heading.x) > 0.85, `${state.rig.heading.x}`);
});

test("his words stay over his head all through a bow, and clear of the hat as it's lifted", () => {
  for (const side of [1, -1]) {
    const { state, step } = settled();
    leprechaun.poke(state, { x: state.walker.x + side * 6, y: state.walker.y - 20 });
    let highest = Number.POSITIVE_INFINITY;
    let lowest = Number.NEGATIVE_INFINITY;
    while (state.act === "doff") {
      step();
      const { bubble, parts } = leprechaun.pose(state);
      const head = middleOf(parts.head?.d);
      const crown = middleOf(parts["crown-top"]?.d);
      assert.ok(bubble.y < head.y - HEAD_R - 3, `${state.actFor}: ${bubble.y} on ${head.y}`);
      assert.ok(bubble.y < crown.y + 1 || crown.y > head.y - HEAD_R, `${state.actFor}: hat`);
      highest = Math.min(highest, bubble.y);
      lowest = Math.max(lowest, bubble.y);
    }
    assert.ok(lowest - highest < 24, `the bubble dropped ${lowest - highest}`);
  }
});

/**
 * A leprechaun after a mouse that moves in whole pixels, as a real one does,
 * and what's seen of his walk: the most seconds on end he went some way other
 * than he faced, and how often he turned straight back on a turn.
 */
const slowly = (fps: number) => {
  const state = leprechaun.create({ x: 500, y: 350 });
  state.next = Number.POSITIVE_INFINITY;
  const exact = { x: 500, y: 350 };
  let pointer: Point = { x: 500, y: 350 };
  const seen = { astray: 0, turns: 0 };
  let astrayFor = 0;
  let from = { x: state.walker.x, y: state.walker.y };
  let facing = { x: 0, y: 0 };
  let window = 0;
  let turning = 0;
  let sinceTurn = Number.POSITIVE_INFINITY;
  const go = (velocity: Point, seconds: number) => {
    for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
      exact.x += velocity.x / fps;
      exact.y += velocity.y / fps;
      const next = { x: Math.round(exact.x), y: Math.round(exact.y) };
      leprechaun.step(state, next, { x: next.x - pointer.x, y: next.y - pointer.y }, 1 / fps);
      pointer = next;
      const heading = facingOf(state);
      facing = { x: facing.x + Math.cos(heading), y: facing.y + Math.sin(heading) };
      const way = Math.abs(state.rig.heading.v) > 0.5 ? Math.sign(state.rig.heading.v) : turning;
      sinceTurn += 1 / fps;
      if (turning !== 0 && way !== turning) {
        // The way the walker takes can double back on itself; turning straight back again is dither.
        seen.turns += sinceTurn < 0.4 ? 1 : 0;
        sinceTurn = 0;
      }
      turning = way;
      window += 1 / fps;
      if (window >= 0.5) {
        // Half a second's walk, over the ground, and how much of it went the way he faced.
        const dx = state.walker.x - from.x;
        const dy = (state.walker.y - from.y) / Math.sin(PITCH);
        const walked = Math.hypot(dx, dy);
        const ahead = (dx * facing.x + dy * facing.y) / (Math.hypot(facing.x, facing.y) || 1);
        astrayFor = walked > 2 && ahead < walked * 0.3 ? astrayFor + window : 0;
        seen.astray = Math.max(seen.astray, astrayFor);
        from = { x: state.walker.x, y: state.walker.y };
        facing = { x: 0, y: 0 };
        window = 0;
      }
    }
  };
  const forget = () => {
    seen.astray = 0;
    seen.turns = 0;
  };
  return { forget, go, seen, state };
};

const WAYS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0.7, y: -0.7 },
  { x: -0.7, y: 0.7 },
];

test("after a slow mouse any way across the screen, he walks the way he faces: no crab-walk", () => {
  for (const fps of [30, 60, 144]) {
    for (const speed of [10, 14, 18, 24, 32]) {
      for (const way of WAYS) {
        const { go, seen } = slowly(fps);
        go({ x: 0, y: 0 }, 2);
        go({ x: way.x * speed, y: way.y * speed }, 10);
        const label = `${fps}fps ${speed}px/s ${JSON.stringify(way)}`;
        assert.ok(seen.astray < Math.max(1.7, 30 / speed), `${label}: ${seen.astray}s astray`);
        assert.ok(seen.turns <= 3, `${label}: ${seen.turns} turns back`);
      }
    }
  }
});

test("doubling back after a slow mouse, he turns round and walks off: no moonwalk", () => {
  for (const fps of [30, 60, 144]) {
    for (const speed of [10, 14, 18, 24, 32]) {
      for (const way of WAYS) {
        const { forget, go, seen } = slowly(fps);
        go({ x: way.x * speed, y: way.y * speed }, 6);
        forget();
        go({ x: -way.x * speed, y: -way.y * speed }, 8);
        const label = `${fps}fps ${speed}px/s ${JSON.stringify(way)}`;
        assert.ok(seen.astray < Math.max(1.7, 30 / speed), `${label}: ${seen.astray}s astray`);
        // A few, right at `faceGoal`'s speed, in the half second before his way's a walk.
        assert.ok(seen.turns <= 5, `${label}: ${seen.turns} turns back`);
      }
    }
  }
});

test("a mouse inched a pixel at a time doesn't turn him back and forth", () => {
  for (const fps of [30, 60, 144]) {
    for (const way of WAYS) {
      const { forget, go, seen, state } = slowly(fps);
      go({ x: 0, y: 0 }, 3);
      const stood = state.rig.heading.x;
      forget();
      for (let inch = 0; inch < 6; inch += 1) {
        go({ x: way.x * 12, y: way.y * 12 }, 0.1);
        go({ x: 0, y: 0 }, 0.9);
      }
      const label = `${fps}fps ${JSON.stringify(way)}`;
      assert.ok(seen.turns <= 1, `${label}: ${seen.turns} turns back`);
      const off = state.rig.heading.x - stood;
      assert.ok(Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < 0.5, `${label}: ${off}`);
    }
  }
});

/** A petted leprechaun's arms frame by frame: over or under his coat, and each swap of side and back. */
const armWatch = (state: Leprechaun) => {
  const lastSwap = [-1, -1];
  const was: (boolean | null)[] = [null, null];
  let frame = 0;
  let flickers = 0;
  return {
    flickers: () => flickers,
    look: () => {
      frame += 1;
      const order = leprechaun.pose(state).order ?? [];
      const over = [0, 1].map((arm) => order.indexOf(`arm-${arm}`) > order.indexOf("torso"));
      for (const [arm, now] of over.entries()) {
        if (was[arm] !== null && was[arm] !== now) {
          flickers += (lastSwap[arm] ?? -1) >= 0 && frame - (lastSwap[arm] ?? 0) < 6 ? 1 : 0;
          lastSwap[arm] = frame;
        }
        was[arm] = now;
      }
      return over;
    },
  };
};

test("leaving a petting, his arms swap sides of his coat once, and only with his hands out from behind him", () => {
  for (let turn = 0; turn < 24; turn += 1) {
    for (const pace of [2, 5, 9]) {
      const { pointer, state, step } = settled();
      const on = { x: state.walker.x + (turn % 5) - 2, y: state.walker.y - 22 };
      step({ x: on.x - pointer().x, y: on.y - pointer().y });
      for (let frame = 0; frame < 90; frame += 1) {
        step();
      }
      const angle = (turn / 24) * Math.PI * 2;
      const by = { x: Math.cos(angle) * pace, y: Math.sin(angle) * pace };
      const arms = armWatch(state);
      const out = [false, false];
      for (let frame = 0; frame < 45; frame += 1) {
        step(by);
        const over = arms.look();
        for (const [arm, shown] of over.entries()) {
          const hand = state.rig.hands[arm]?.[0]?.x ?? 0;
          out[arm] = out[arm] === true || hand > -1;
          const backOn = Math.sin(facingOf(state)) > 0.3 && !out[arm];
          assert.ok(!shown || !backOn, `turn ${turn} frame ${frame} arm ${arm}: ${hand}`);
        }
      }
      assert.equal(arms.flickers(), 0, `turn ${turn} pace ${pace}`);
    }
  }
});

test("coming to rest on him, his arms swap sides of his coat without a flicker", () => {
  for (let turn = 0; turn < 24; turn += 1) {
    const { pointer, state, step } = settled();
    const angle = (turn / 24) * Math.PI * 2;
    const start = {
      x: state.walker.x + Math.cos(angle) * 120,
      y: state.walker.y - 22 + Math.sin(angle) * 60,
    };
    step({ x: start.x - pointer().x, y: start.y - pointer().y });
    for (let frame = 0; frame < 60; frame += 1) {
      step();
    }
    const on = { x: state.walker.x + (turn % 5) - 2, y: state.walker.y - 22 };
    const arms = armWatch(state);
    for (let frame = 0; frame < 20; frame += 1) {
      step({ x: (on.x - pointer().x) / (20 - frame), y: (on.y - pointer().y) / (20 - frame) });
      arms.look();
    }
    for (let frame = 0; frame < 90; frame += 1) {
      step();
      arms.look();
    }
    assert.equal(arms.flickers(), 0, `turn ${turn}`);
  }
});

/** A leprechaun after a mouse sent to whole pixels at any frame rate, walked in from one side to begin with. */
const nudged = (fps: number, from = 1) => {
  const state = leprechaun.create({ x: 500, y: 350 });
  state.next = Number.POSITIVE_INFINITY;
  let pointer: Point = { x: 500, y: 350 };
  const to = (at: Point) => {
    const next = { x: Math.round(at.x), y: Math.round(at.y) };
    leprechaun.step(state, next, { x: next.x - pointer.x, y: next.y - pointer.y }, 1 / fps);
    pointer = next;
  };
  for (let frame = 0; frame < 2 * fps; frame += 1) {
    to(pointer);
  }
  const start = pointer.x;
  for (let frame = 1; frame <= 1.5 * fps; frame += 1) {
    to({ x: start + (from * 150 * frame) / fps, y: pointer.y });
  }
  for (let frame = 0; frame < 2 * fps; frame += 1) {
    to(pointer);
  }
  return { pointer: () => pointer, state, to };
};

const turnOf = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const COMPASS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0.7, y: 0.7 },
  { x: 0, y: 1 },
  { x: -0.7, y: 0.7 },
  { x: -1, y: 0 },
  { x: -0.7, y: -0.7 },
  { x: 0, y: -1 },
  { x: 0.7, y: -0.7 },
];

test("a small nudge of the mouse shuffles him a step and doesn't swing him round", () => {
  for (const fps of [30, 60, 144, 240]) {
    for (const from of [1, -1]) {
      for (const way of COMPASS) {
        const { pointer, state, to } = nudged(fps, from);
        const start = pointer();
        const stood = facingOf(state);
        let most = 0;
        for (let frame = 1; frame <= 3 * fps; frame += 1) {
          const along = 14 * Math.min(1, frame / (0.25 * fps));
          to({ x: start.x + way.x * along, y: start.y + way.y * along });
          most = Math.max(most, turnOf(facingOf(state), stood));
        }
        assert.ok(most < 0.75, `${fps}fps from ${from} ${JSON.stringify(way)}: ${most}`);
      }
    }
  }
});

test("a mouse fidgeting about one spot doesn't set him turning", () => {
  for (const fps of [30, 60, 144, 240]) {
    let bigTurns = 0;
    for (let seed = 0; seed < 4; seed += 1) {
      const random = createRandom(seed * 77 + 1);
      const { pointer, state, to } = nudged(fps);
      const middle = pointer();
      let aim = middle;
      let was = middle;
      let began = 0;
      let next = 0.5;
      let anchor = facingOf(state);
      for (let frame = 0; frame < 30 * fps; frame += 1) {
        const time = frame / fps;
        if (time >= next) {
          was = aim;
          aim = {
            x: middle.x + (random.next() * 2 - 1) * 14,
            y: middle.y + (random.next() * 2 - 1) * 14,
          };
          began = time;
          next = time + 2.5 * (0.5 + random.next());
        }
        const along = Math.min(1, (time - began) / 0.3);
        to({ x: was.x + (aim.x - was.x) * along, y: was.y + (aim.y - was.y) * along });
        if (turnOf(facingOf(state), anchor) > 1.5) {
          bigTurns += 1;
          anchor = facingOf(state);
        }
      }
    }
    // Four half minutes: two whole ones.
    assert.ok(bigTurns / 2 <= 5, `${fps}fps: ${bigTurns / 2} big turns a minute`);
  }
});

test("wiggled side to side or inched along, he doesn't dither", () => {
  for (const fps of [30, 60, 144, 240]) {
    const wiggled = nudged(fps);
    const middle = wiggled.pointer();
    let turned = 0;
    let last = facingOf(wiggled.state);
    for (let frame = 0; frame < 20 * fps; frame += 1) {
      const x = middle.x + 10 * Math.sin((frame / fps) * Math.PI);
      wiggled.to({ x, y: middle.y });
      turned += turnOf(facingOf(wiggled.state), last);
      last = facingOf(wiggled.state);
    }
    // Wiggling swings the walker's spot, so he does walk off a little, and turns for that.
    assert.ok(turned < 10, `${fps}fps: wiggled ${turned} radians`);

    const inched = nudged(fps);
    const start = inched.pointer();
    let reversals = 0;
    let turning = 0;
    let swaps = 0;
    let stack = "";
    for (let frame = 0; frame < 20 * fps; frame += 1) {
      const inches = Math.floor((frame / fps) * 4);
      inched.to({ x: start.x - 0.7 * inches, y: start.y + 0.7 * inches });
      const { v } = inched.state.rig.heading;
      const way = Math.abs(v) > 0.4 ? Math.sign(v) : turning;
      reversals += turning !== 0 && way !== turning ? 1 : 0;
      turning = way;
      const now = (leprechaun.pose(inched.state).order ?? []).join(" ");
      swaps += stack !== "" && now !== stack ? 1 : 0;
      stack = now;
    }
    assert.ok(reversals <= 2, `${fps}fps: ${reversals} reversals`);
    assert.ok(swaps <= 2, `${fps}fps: ${swaps} layer swaps`);
  }
});

test("walked up or down the screen and stopped, he turns to the mouse without standing there", () => {
  for (const fps of [30, 60, 144, 240]) {
    for (const speed of [40, 100]) {
      for (const way of [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -0.7, y: -0.7 },
      ]) {
        const { pointer, state, to } = nudged(fps);
        const start = pointer();
        for (let frame = 1; frame <= 2.5 * fps; frame += 1) {
          const along = (speed * frame) / fps;
          to({ x: start.x + way.x * along, y: start.y + way.y * along });
        }
        const seen: { heading: number; speed: number }[] = [];
        for (let frame = 0; frame < 2 * fps; frame += 1) {
          to(pointer());
          seen.push({ heading: facingOf(state), speed: state.walker.speed });
        }
        const final = seen.at(-1)?.heading ?? 0;
        const stopped = seen.findIndex((at) => at.speed < 1) / fps;
        const turned = seen.findLastIndex((at) => turnOf(at.heading, final) > 0.3) / fps;
        const label = `${fps}fps ${speed}px/s ${JSON.stringify(way)}`;
        assert.ok(turned - stopped < 0.4, `${label}: ${turned - stopped}s`);
      }
    }
  }
});

test("clicked, left and come back to at any pace and frame rate, he guards his gold again", () => {
  for (const fps of [30, 60, 144, 240]) {
    for (const speed of [150, 300]) {
      const { pointer, state, to } = nudged(fps);
      const home = () => ({ x: state.walker.x + 3, y: state.walker.y - 30 });
      const glide = (goal: () => Point, seconds: number) => {
        const from = pointer();
        for (let frame = 1; frame <= seconds * fps; frame += 1) {
          const along = frame / (seconds * fps);
          const at = goal();
          to({ x: from.x + (at.x - from.x) * along, y: from.y + (at.y - from.y) * along });
        }
      };
      glide(home, 0.4);
      const on = pointer();
      for (let frame = 0; frame < 0.3 * fps; frame += 1) {
        to(on);
      }
      leprechaun.poke(state, on);
      for (let frame = 0; frame < 2.2 * fps; frame += 1) {
        to(on);
        assert.ok(state.rig.guard.x < 0.05, `${fps}fps: guarded a greeting`);
      }
      const off = { x: on.x + speed, y: on.y };
      glide(() => off, 1);
      for (let frame = 0; frame < fps; frame += 1) {
        to(off);
      }
      const back = home();
      glide(() => back, Math.hypot(back.x - off.x, back.y - off.y) / speed);
      let guard = 0;
      for (let frame = 0; frame < 2 * fps; frame += 1) {
        to(pointer());
        guard = Math.max(guard, state.rig.guard.x);
      }
      assert.ok(guard > 0.9, `${fps}fps ${speed}px/s: guard ${guard}`);
    }
  }
});

test("a hand shaking on him after a click is no petting, at any frame rate", () => {
  for (const fps of [30, 60, 144, 240]) {
    const { pointer, state, to } = nudged(fps);
    const start = pointer();
    const on = { x: state.walker.x + 3, y: state.walker.y - 30 };
    for (let frame = 1; frame <= 0.4 * fps; frame += 1) {
      const along = frame / (0.4 * fps);
      to({ x: start.x + (on.x - start.x) * along, y: start.y + (on.y - start.y) * along });
    }
    leprechaun.poke(state, pointer());
    const at = pointer();
    for (let frame = 0; frame < 4 * fps; frame += 1) {
      to({ x: at.x + (Math.floor((frame / fps) * 20) % 2) * 2, y: at.y });
      assert.ok(state.rig.guard.x < 0.05, `${fps}fps: guard ${state.rig.guard.x}`);
    }
  }
});

test("a mouse crossing him at a pace doesn't stop him, and one slowing on him does, at any frame rate", () => {
  for (const fps of [30, 60, 144, 240]) {
    const stopped = (speed: number) => {
      const { pointer, state, to } = nudged(fps);
      // Walking after the mouse, which passes up over him the way he's going.
      const start = pointer();
      let held = 0;
      for (let frame = 1; frame <= fps; frame += 1) {
        const across = state.walker.x + 3;
        to({ x: across, y: start.y + 37 - (speed * frame) / fps });
        held += state.walker.speed < 1 ? 1 / fps : 0;
      }
      return held;
    };
    const fast = stopped(400);
    const slow = stopped(90);
    assert.ok(fast < 0.2, `${fps}fps: held ${fast}s by a passing mouse`);
    assert.ok(slow > 0.2, `${fps}fps: held ${slow}s by a slow one`);
  }
});
