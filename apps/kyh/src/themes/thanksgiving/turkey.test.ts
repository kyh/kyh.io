import assert from "node:assert/strict";
import test from "node:test";

import type { Pose } from "../follower/creature";
import type { Point } from "../follower/walk";
import type { Turkey } from "./turkey";
import { createTurkey, pokeTurkey, stepTurkey } from "./turkey";
import { SIZE, turkeyPose } from "./turkey-pose";

const FRAME = 1 / 60;

/** An ellipse part's center (an `art.ts` ellipse path), about where it stands. */
const centerOf = (d: string | undefined) => {
  const match =
    /M(?<x>-?[\d.]+) (?<y>-?[\d.]+)a[\d.]+ [\d.]+ -?[\d.]+ 1 0 (?<dx>-?[\d.]+) (?<dy>-?[\d.]+)/u.exec(
      d ?? "",
    );
  const { dx, dy, x, y } = match?.groups ?? {};
  return { x: Number(x) + Number(dx) / 2, y: Number(y) + Number(dy) / 2 };
};

/** Runs it after a pointer at `at(t)` for `seconds`, calling `each` with every frame's pose. */
const run = (
  turkey: Turkey,
  at: (t: number) => Point,
  seconds: number,
  each: (pose: Pose, t: number) => void = () => {},
  from = 0,
) => {
  let was = at(from);
  for (let frame = 1; frame <= Math.round(seconds / FRAME); frame += 1) {
    const t = from + frame * FRAME;
    const now = at(t);
    stepTurkey(turkey, now, { x: now.x - was.x, y: now.y - was.y }, FRAME);
    was = now;
    each(turkeyPose(turkey), t);
  }
};

const across = (speed: number) => (t: number) => ({ x: 400 + speed * t, y: 400 });

test("walking, its head's held still over the ground, then thrust on, a step at a time", () => {
  for (const [speed, share] of [
    [60, 0.6],
    [150, 0.25],
  ] as const) {
    const turkey = createTurkey({ x: 400, y: 400 });
    const heads: number[] = [];
    run(turkey, across(speed), 4, (pose, t) => {
      if (t > 2) {
        heads.push(pose.at.x + centerOf(pose.parts.head?.d).x * SIZE);
      }
    });
    // The share of frames its head's still over the ground (under a tenth of its body's speed).
    const still = heads
      .slice(1)
      .filter((x, index) => Math.abs(x - (heads[index] ?? x)) / FRAME < speed / 10);
    assert.ok(still.length / heads.length > share, `${speed}: ${still.length} of ${heads.length}`);
  }
});

test("walking, its body dips as each foot comes down and rides up over it", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  const heights: number[] = [];
  run(turkey, across(150), 3, (pose, t) => {
    if (t > 2) {
      heights.push(centerOf(pose.parts.body?.d).y);
    }
  });
  const rise = Math.max(...heights) - Math.min(...heights);
  assert.ok(rise > 1 && rise < 3, `${rise}`);
});

test("left be, it forages and struts by turns, then sleeps, and never sleeps mid-gobble", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  const bouts: string[] = [];
  let pecks = 0;
  let wasAct = "none";
  let gobblingAsleep = 0;
  run(
    turkey,
    (t) => ({ x: 400 + 100 * Math.min(t, 1), y: 400 }),
    45,
    () => {
      const bout = turkey.strutting ? "strut" : "forage";
      if (bouts.at(-1) !== bout) {
        bouts.push(bout);
      }
      if (turkey.act === "peck" && wasAct !== "peck" && bouts.includes("strut")) {
        pecks += 1;
      }
      if (turkey.act === "gobble" && turkey.rig.doze.x > 0.1) {
        gobblingAsleep += 1;
      }
      wasAct = turkey.act;
    },
  );
  assert.ok(bouts.filter((bout) => bout === "strut").length >= 2, bouts.join(" "));
  assert.ok(pecks >= 2, `pecks after a strut: ${pecks}`);
  assert.equal(gobblingAsleep, 0);
  assert.ok(turkey.rig.doze.x > 0.9);
});

test("its tail and its face never flicker over and under its body walking straight", () => {
  for (const speed of [150, -150]) {
    const turkey = createTurkey({ x: 400, y: 400 });
    let flips = 0;
    let was = "";
    run(turkey, across(speed), 6, (pose, t) => {
      const order = pose.order ?? [];
      const key = ["feather-5", "head", "face", "beard", "neck"]
        .map((name) => order.indexOf(name) > order.indexOf("torso"))
        .join(",");
      if (t > 2 && was !== "" && key !== was) {
        flips += 1;
      }
      was = key;
    });
    assert.equal(flips, 0, `${speed}`);
  }
});

test("walking, its snood and wattle swing under its head, never up over it", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  let highest = -Infinity;
  run(turkey, across(150), 4, (_, t) => {
    for (const chain of [turkey.snood, turkey.wattle]) {
      const [root] = chain.knots;
      for (const knot of chain.knots.slice(1)) {
        if (t > 1 && root) {
          highest = Math.max(highest, root.y - knot.y);
        }
      }
    }
  });
  assert.ok(highest < 0.5, `${highest}`);
});

test("clicked on, it gobbles facing the camera, its back never turned", () => {
  const turkey = createTurkey({ x: 600, y: 400 });
  run(turkey, (t) => ({ x: 600 + 120 * Math.min(t, 1), y: 400 }), 3);
  const on = { x: turkey.walker.x, y: turkey.walker.y - 30 };
  pokeTurkey(turkey, on);
  let least = Infinity;
  run(
    turkey,
    () => on,
    2,
    () => {
      least = Math.min(least, Math.sin(turkey.rig.heading.x));
    },
  );
  assert.equal(turkey.act === "gobble" || turkey.strutting, true);
  assert.ok(least > -0.35, `${least}`);
  assert.ok(Math.sin(turkey.rig.heading.x) > 0.9, `${turkey.rig.heading.x}`);
});

test("a peck takes its beak to the ground without burying its flesh", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  let lowest = -Infinity;
  let buried = 0;
  run(
    turkey,
    (t) => ({ x: 400 + 100 * Math.min(t, 1), y: 400 }),
    5,
    (pose) => {
      if (turkey.act !== "peck") {
        return;
      }
      const ys = [...(pose.parts.beak?.d ?? "").matchAll(/-?[\d.]+ (?<y>-?[\d.]+)/gu)].map(
        (found) => Number(found.groups?.y),
      );
      lowest = Math.max(lowest, ...ys);
      for (const chain of [turkey.wattle, turkey.snood]) {
        buried += chain.knots.filter((knot) => knot.y > turkey.walker.y + 1).length;
      }
    },
  );
  // Its beak's lowest point within a few of its own pixels of the ground (screen y 0 at its feet).
  assert.ok(lowest > -4, `${lowest}`);
  assert.equal(buried, 0);
});

test("its neck is never drawn over its body, at any heading, and its head sits as high facing away as toward", () => {
  const heights: number[] = [];
  for (let step = 0; step < 16; step += 1) {
    const heading = (step / 16) * Math.PI * 2;
    const turkey = createTurkey({ x: 400, y: 400 });
    run(
      turkey,
      () => ({ x: 400, y: 400 }),
      3,
      () => {
        turkey.rig.heading.x = heading;
        turkey.rig.heading.v = 0;
        turkey.nextPeck = 99;
      },
    );
    const pose = turkeyPose(turkey);
    const order = pose.order ?? [];
    assert.ok(order.indexOf("neck") < order.indexOf("torso"), `${heading}`);
    if (Math.abs(Math.sin(heading)) > 0.99) {
      const top = Math.min(centerOf(pose.parts.body?.d).y, centerOf(pose.parts.breast?.d).y);
      heights.push(top - centerOf(pose.parts.head?.d).y);
    }
  }
  const [toward = 0, away = 0] = heights;
  assert.ok(Math.abs(toward - away) < 8, `${toward} ${away}`);
});

test("a gobble off its strut keeps its tail folded, and walking off folds a fan at once", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  run(
    turkey,
    (t) => ({ x: 400 + 100 * Math.min(t, 1), y: 400 }),
    2.5,
    () => {
      turkey.nextPeck = 99;
    },
  );
  pokeTurkey(turkey, { x: turkey.walker.x, y: turkey.walker.y - 30 });
  let most = 0;
  run(
    turkey,
    () => ({ x: turkey.walker.x, y: turkey.walker.y - 300 }),
    1,
    () => {
      if (turkey.act === "gobble" && !turkey.strutting) {
        most = Math.max(most, turkey.rig.fan.x);
      }
    },
  );
  assert.ok(most < 0.05, `${most}`);
  // Strutting, then the mouse goes off: walking, its fan's shut within a third of a second.
  const strutter = createTurkey({ x: 400, y: 400 });
  run(strutter, () => ({ x: 400, y: 400 }), 12);
  strutter.rig.fan.x = 1;
  let open = 0;
  run(
    strutter,
    (t) => ({ x: 400 + 300 * t, y: 400 }),
    1.5,
    (_, t) => {
      if (t > 0.6 && strutter.walker.speed > 40) {
        open = Math.max(open, strutter.rig.fan.x);
      }
    },
  );
  assert.ok(open < 0.1, `${open}`);
});

test("it never pecks with its tail still fanned, nor snores before it's nodded off", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  let fannedPecks = 0;
  let wakeSnores = 0;
  let wasAct = "none";
  run(
    turkey,
    (t) => ({ x: 400 + 100 * Math.min(t, 1), y: 400 }),
    45,
    (pose) => {
      if (turkey.act === "peck" && wasAct !== "peck" && turkey.rig.fan.x > 0.15) {
        fannedPecks += 1;
      }
      if (pose.say === "z z z" && turkey.rig.doze.x < 0.55) {
        wakeSnores += 1;
      }
      wasAct = turkey.act;
    },
  );
  assert.equal(fannedPecks, 0);
  assert.equal(wakeSnores, 0);
});
