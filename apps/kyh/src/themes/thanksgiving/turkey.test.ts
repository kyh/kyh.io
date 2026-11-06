import assert from "node:assert/strict";
import test from "node:test";

import type { Pose } from "../follower/creature";
import type { Point } from "../follower/walk";
import type { Turkey } from "./turkey";
import { createTurkey, pokeTurkey, stepTurkey } from "./turkey";
import { SIZE, turkeyPose, wingOverOf } from "./turkey-pose";

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

test("clicked as the mouse lands on it, it gobbles on through the petting", () => {
  for (const wait of [0.02, 0.16, 0.4]) {
    const turkey = createTurkey({ x: 600, y: 400 });
    run(turkey, (t) => ({ x: 600 + 120 * Math.min(t, 1), y: 400 }), 3);
    const on = { x: turkey.walker.x, y: turkey.walker.y - 30 };
    run(turkey, () => on, wait);
    pokeTurkey(turkey, on);
    const said = turkey.emotes.line;
    assert.notEqual(said, null);
    run(
      turkey,
      () => on,
      1,
      () => assert.ok(turkey.emotes.line?.startsWith(said ?? ""), `${wait}s`),
    );
  }
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

/** How far its head stands over the top of its body, standing facing `heading`. */
const above = (heading: number) => {
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
  const top = Math.min(centerOf(pose.parts.body?.d).y, centerOf(pose.parts.breast?.d).y);
  return top - centerOf(pose.parts.head?.d).y;
};

test("facing away, its head's low over its back on a short neck, not up on a stalk", () => {
  // No higher over its body than seen side on.
  assert.ok(above(-Math.PI / 2) <= above(0), `${above(-Math.PI / 2)} ${above(0)}`);
});

test("it falls asleep sitting side on, a little toward the camera, its head on its back seen", () => {
  for (const [dx, dy] of [
    [100, 0],
    [-100, 0],
    [0, 120],
    [0, -120],
    [60, 90],
  ] as const) {
    const turkey = createTurkey({ x: 400, y: 400 });
    run(turkey, (t) => ({ x: 400 + dx * Math.min(t, 1), y: 400 + dy * Math.min(t, 1) }), 44);
    const heading = turkey.rig.heading.x;
    assert.ok(turkey.rig.doze.x > 0.9);
    // Side on (cos near ±1), turned a little toward the camera (sin a little over 0).
    assert.ok(
      Math.abs(Math.cos(heading)) > 0.85 && Math.sin(heading) > 0.2,
      `${dx},${dy}: ${heading}`,
    );
  }
});

/** A pointer jumping from one side to the other and back, over and over. */
const zigzag = (t: number) => ({ x: 600 + 250 * Math.sign(Math.sin(t * 1.3)), y: 400 });

test("doubling back, its feet don't splay into the splits", () => {
  const turkey = createTurkey(zigzag(0));
  let widest = 0;
  run(turkey, zigzag, 12, (_, t) => {
    const [a, b] = turkey.feet.feet;
    if (a && b && t > 1) {
      widest = Math.max(widest, Math.hypot(a.x - b.x, (a.y - b.y) / Math.sin(0.48)));
    }
  });
  // About its longest stride and a little: without the turkey's strain (`turkey.ts`) it's past 30.
  assert.ok(widest < 27, `${widest}`);
});

/** Runs it for `seconds` left be, never nodding off, for its bouts of foraging and strutting. */
const idling = (turkey: Turkey, seconds: number, each: () => void) =>
  run(
    turkey,
    (t) => ({ x: 400 + 100 * Math.min(t, 1), y: 400 }),
    seconds,
    () => {
      turkey.walker.still = Math.min(turkey.walker.still, 20);
      each();
    },
  );

test("a peck sees its fan shut: no strut opens on one that's running", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  let most = 0;
  let struts = 0;
  let was = false;
  idling(turkey, 300, () => {
    if (turkey.act === "peck") {
      most = Math.max(most, turkey.rig.fan.x);
    }
    struts += turkey.strutting && !was ? 1 : 0;
    was = turkey.strutting;
  });
  assert.ok(struts >= 10, `${struts}`);
  assert.ok(most <= 0.1, `${most}`);
});

test("a gobble's head shake never flickers its face over and under its head", () => {
  for (const degrees of [-30, -20, -10, 0, -170, -160, -150]) {
    const heading = (degrees * Math.PI) / 180;
    const turkey = createTurkey({ x: 400, y: 400 });
    const hold = () => {
      turkey.rig.heading.x = heading;
      turkey.rig.heading.v = 0;
      turkey.nextPeck = 99;
    };
    run(turkey, () => ({ x: 400, y: 400 }), 2, hold);
    pokeTurkey(turkey, { x: turkey.walker.x, y: turkey.walker.y - 30 });
    assert.equal(turkey.act, "gobble");
    let swaps = 0;
    let was: boolean | null = null;
    run(
      turkey,
      () => ({ x: 400, y: 400 }),
      1.5,
      (pose) => {
        hold();
        const order = pose.order ?? [];
        const over = order.indexOf("face") > order.indexOf("head");
        swaps += was !== null && over !== was ? 1 : 0;
        was = over;
      },
    );
    assert.ok(swaps <= 1, `${degrees}: ${swaps}`);
  }
});

/** The lowest an ellipse part reaches, down the screen (an `art.ts` ellipse path). */
const bottomOf = (d: string | undefined) => {
  const { y } = centerOf(d);
  const { rotate, rx, ry } =
    /a(?<rx>[\d.]+) (?<ry>[\d.]+) (?<rotate>-?[\d.]+)/u.exec(d ?? "")?.groups ?? {};
  const angle = (Number(rotate) * Math.PI) / 180;
  return y + Math.hypot(Number(rx) * Math.sin(angle), Number(ry) * Math.cos(angle));
};

/** A line part's end, the last point of its path. */
const endOf = (d: string | undefined) => {
  const points = [...(d ?? "").matchAll(/L(?<x>-?[\d.]+) (?<y>-?[\d.]+)/gu)];
  return Number(points.at(-1)?.groups?.y);
};

test("walking away, its folded tail stops short of its feet, so its steps show", () => {
  for (const degrees of [-120, -105, -90, -75, -60]) {
    const way = (degrees * Math.PI) / 180;
    const turkey = createTurkey({ x: 800, y: 900 });
    const clear: number[] = [];
    run(
      turkey,
      (t) => ({
        x: 800 + 130 * t * Math.cos(way),
        y: 900 + 130 * t * Math.sin(way) * Math.sin(0.48),
      }),
      6,
      (pose, t) => {
        if (t < 4) {
          return;
        }
        const tail = Math.max(
          ...Array.from({ length: 11 }, (_, index) => bottomOf(pose.parts[`tip-${index}`]?.d)),
        );
        const foot = Math.max(endOf(pose.parts["shank-0"]?.d), endOf(pose.parts["shank-1"]?.d));
        clear.push(foot - tail);
      },
    );
    // Its own pixels of shank below its tail, on the leg standing, at the worst of its stride.
    assert.ok(Math.min(...clear) > 8, `${degrees}: ${Math.min(...clear)}`);
  }
});

test("its wings' ink and primaries are never half see-through", () => {
  for (let step = 0; step < 32; step += 1) {
    const heading = (step / 32) * Math.PI * 2;
    const turkey = createTurkey({ x: 400, y: 400 });
    run(
      turkey,
      () => ({ x: 400, y: 400 }),
      0.2,
      () => {
        turkey.rig.heading.x = heading;
      },
    );
    const { parts } = turkeyPose(turkey);
    for (const name of ["primaries", "bars", "wing-ink", "wing-edge"]) {
      for (const index of [0, 1]) {
        assert.ok(
          [0, 1].includes(parts[`${name}-${index}`]?.opacity ?? 1),
          `${name} at ${heading}`,
        );
      }
    }
  }
});

test("seen from the front, its beard grows from its upper breast, standing or strutting", () => {
  for (const fan of [0, 1]) {
    const turkey = createTurkey({ x: 400, y: 400 });
    run(
      turkey,
      () => ({ x: 400, y: 400 }),
      3,
      () => {
        turkey.rig.heading.x = Math.PI / 2;
        turkey.rig.heading.v = 0;
        turkey.rig.fan.x = fan;
        turkey.nextPeck = 99;
      },
    );
    const { parts } = turkeyPose(turkey);
    const ys = [...(parts.beard?.d ?? "").matchAll(/-?[\d.]+ (?<y>-?[\d.]+)/gu)].map((found) =>
      Number(found.groups?.y),
    );
    const bottom = Math.max(bottomOf(parts.body?.d), bottomOf(parts.breast?.d));
    const top = 2 * centerOf(parts.body?.d).y - bottomOf(parts.body?.d);
    const downTorso = (y: number) => (y - top) / (bottom - top);
    assert.ok(downTorso(ys[0] ?? 1) < 0.42, `root ${downTorso(ys[0] ?? 1)}`);
    assert.ok(downTorso(Math.max(...ys)) < 0.68, `tip ${downTorso(Math.max(...ys))}`);
  }
});

test("asleep, its head and face stay over its body, and nothing of them swaps nodding off or waking", () => {
  for (const dx of [100, -100]) {
    const turkey = createTurkey({ x: 400, y: 400 });
    let swaps = 0;
    let was = "";
    const watch = (pose: Pose, t: number) => {
      if (t < 5) {
        return;
      }
      const order = pose.order ?? [];
      const key = [
        order.indexOf("head") > order.indexOf("torso"),
        order.indexOf("face") > order.indexOf("head"),
      ].join(",");
      swaps += was !== "" && key !== was ? 1 : 0;
      was = key;
    };
    const at = (t: number) => ({ x: 400 + dx * Math.min(t, 1), y: 400 });
    run(turkey, at, 44, watch);
    assert.equal(was, "true,true");
    const { parts } = turkeyPose(turkey);
    // Its near eye shut, shown: seen from its side, not the back of its head.
    assert.ok(Math.max(parts["lid-0"]?.opacity ?? 0, parts["lid-1"]?.opacity ?? 0) > 0.8);
    pokeTurkey(turkey, { x: turkey.walker.x, y: turkey.walker.y - 30 });
    run(turkey, () => at(1), 2, watch, 44);
    assert.equal(swaps, 0, `${dx}`);
  }
});

/** Watches each wing frame to frame: how many times it went over or under its body, and the shortest it stayed. */
const wingSwapsOf = (turkey: Turkey) => {
  const over = (name: string) => {
    const { order } = turkeyPose(turkey);
    return (order?.indexOf(name) ?? 0) > (order?.indexOf("torso") ?? 0);
  };
  const names = ["wing-0", "wing-1"];
  const was = names.map(over);
  const since = names.map(() => 0);
  let swaps = 0;
  let shortest = Infinity;
  return {
    shortest: () => shortest,
    swaps: () => swaps,
    watch: () => {
      for (const [index, name] of names.entries()) {
        since[index] = (since[index] ?? 0) + FRAME;
        if (over(name) !== was[index]) {
          was[index] = !was[index];
          swaps += 1;
          shortest = Math.min(shortest, since[index] ?? 0);
          since[index] = 0;
        }
      }
    },
  };
};

test("a strut's slow pivot leaves its wings where they are", () => {
  const turkey = createTurkey({ x: 400, y: 400 });
  run(turkey, () => ({ x: 400, y: 340 }), 2);
  const wings = wingSwapsOf(turkey);
  let strutting = 0;
  run(
    turkey,
    () => ({ x: 400, y: 340 }),
    60,
    () => {
      strutting += turkey.strutting ? FRAME : 0;
      wings.watch();
    },
  );
  assert.ok(strutting > 10, `${strutting}`);
  // Over or under as it starts or leaves off strutting, but no blink at the end of each pivot.
  assert.ok(wings.shortest() > 2, `${wings.shortest()}`);
});

test("a heading wandering about where a wing comes over its body leaves the wing as it was", () => {
  for (const side of [1, -1] as const) {
    // Its left wing comes over turning toward side on from about 63 degrees, its right mirrored.
    const line = side === 1 ? 1.1 : Math.PI - 1.1;
    for (const was of [true, false]) {
      let over = wingOverOf(was, line + (was ? -0.3 : 0.3) * side, side);
      assert.equal(over, was);
      for (let turned = 0; turned < 200; turned += 1) {
        over = wingOverOf(over, line + 0.03 * Math.sin(turned), side);
      }
      assert.equal(over, was);
    }
  }
});
