import assert from "node:assert/strict";
import test from "node:test";

import type { Chain } from "../follower/chain";
import type { Pose } from "../follower/creature";
import type { Point } from "../follower/walk";
import type { Dragon } from "./dragon";
import { swayOf } from "../follower/chain";
import { createDragon, dragon as creature, pokeDragon, stepDragon } from "./dragon";
import { hangsOf, tailHangOf } from "./dragon-pose";

const STILL: Point = { x: 0, y: 0 };
/** Start positions: its randomness is seeded by where it starts. */
const STARTS: readonly Point[] = [
  { x: 300, y: 300 },
  { x: 412, y: 187 },
  { x: 733, y: 451 },
  { x: 95, y: 610 },
];
const FRAME_RATES = [30, 60, 144, 240];

/** Runs it `seconds` after a pointer moving `by` pixels a second, `each` told of every frame. */
const run = (
  dragon: Dragon,
  from: Point,
  seconds: number,
  by = STILL,
  fps = 60,
  each?: (pose: Pose, pointer: Point) => void,
) => {
  let pointer = from;
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
    const step = { x: by.x / fps, y: by.y / fps };
    pointer = { x: pointer.x + step.x, y: pointer.y + step.y };
    stepDragon(dragon, pointer, step, 1 / fps);
    each?.(creature.pose(dragon), pointer);
  }
  return pointer;
};

/** Runs it along a pointer path, a function of the time. */
const along = (
  dragon: Dragon,
  path: (t: number) => Point,
  from: number,
  to: number,
  fps = 60,
  each?: (pose: Pose, t: number) => void,
) => {
  let pointer = path(from);
  for (let frame = 1; frame <= Math.round((to - from) * fps); frame += 1) {
    const t = from + frame / fps;
    const next = path(t);
    stepDragon(dragon, next, { x: next.x - pointer.x, y: next.y - pointer.y }, 1 / fps);
    pointer = next;
    each?.(creature.pose(dragon), t);
  }
};

const CENTER: Point = { x: 400, y: 300 };

const circling = (at = CENTER) => {
  const dragon = createDragon(at);
  run(dragon, at, 6);
  return dragon;
};

const headAt = (dragon: Dragon) => creature.pose(dragon).at;
const faceShown = (dragon: Dragon) => Math.sin(dragon.rig.aim.x + dragon.rig.look.x);

/** A mouse that goes and stops, twice a second. */
const stopGo = (t: number): Point => {
  const whole = Math.floor(t / 0.5);
  const part = Math.min(1, (t % 0.5) / 0.25);
  return { x: 200 + (whole + part) * 40, y: 300 + 30 * Math.sin(whole + part) };
};
/** A mouse fidgeting a few pixels about one spot. */
const fidget = (t: number): Point => ({
  x: 400 + 5 * Math.sin(t * 9) + 3 * Math.sin(t * 23),
  y: 300 + 4 * Math.sin(t * 7),
});
/** A mouse creeping along. */
const creep = (t: number): Point => ({ x: 200 + 30 * t, y: 300 + 10 * Math.sin(t) });
/** A mouse doubling back and forth. */
const pacing = (t: number): Point => ({ x: 400 + 180 * Math.sin(t * 2.2), y: 300 });
/** A mouse going round in a loop. */
const looping = (t: number): Point => ({
  x: 400 + 60 * Math.cos(t * 3.2),
  y: 300 + 30 * Math.sin(t * 3.2),
});

const PATHS = { creep, fidget, looping, pacing, stopGo };

test("it stays by a steady mouse, swimming along its nose", () => {
  const dragon = createDragon({ x: 300, y: 300 });
  run(dragon, { x: 300, y: 300 }, 3, { x: 240, y: 0 }, 60, (pose, pointer) => {
    assert.ok(Math.abs(pose.at.y - pointer.y) < 150);
  });
  assert.ok(dragon.swim.speed > 150, `${dragon.swim.speed}`);
  assert.ok(Math.abs(Math.cos(dragon.swim.heading)) > 0.6, `${dragon.swim.heading}`);
});

test("it never rolls belly up: turning left is a turn", () => {
  for (const [name, path] of Object.entries(PATHS)) {
    const dragon = createDragon(path(0));
    along(dragon, path, 0, 12, 60, () => {
      assert.ok(Math.abs(dragon.swim.roll.x) <= 1, `${name}: ${dragon.swim.roll.x}`);
    });
  }
});

test("a resting mouse is the pearl it circles: all the way round, at a steady distance", () => {
  for (const start of STARTS) {
    const dragon = circling(start);
    let turned = 0;
    let last = dragon.swim.heading;
    run(dragon, start, 8, STILL, 60, (pose) => {
      const off = Math.hypot(pose.at.x - start.x, pose.at.y - start.y);
      assert.ok(off > 18 && off < 90, `${off}`);
      turned += Math.atan2(
        Math.sin(dragon.swim.heading - last),
        Math.cos(dragon.swim.heading - last),
      );
      last = dragon.swim.heading;
    });
    assert.ok(Math.abs(turned) > Math.PI * 2, `${turned}`);
  }
});

const apart = (a: Point | undefined, b: Point | undefined) =>
  Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));

const tipOf = (chain: Chain | undefined) => {
  const tip = chain?.knots.at(-1) ?? { x: 0, y: 0 };
  const lead = chain?.lead ?? { x: 0, y: 0 };
  return { x: tip.x + lead.x, y: tip.y + lead.y };
};

test("its path is the same at any frame rate", () => {
  const ends = FRAME_RATES.map((fps) => {
    const dragon = createDragon(stopGo(0));
    along(dragon, stopGo, 0, 4, fps);
    const { at } = creature.pose(dragon);
    return { at, tail: tipOf(dragon.tail), whisker: tipOf(dragon.whiskers[0]) };
  });
  // The fastest display's is the one nearest the truth, so the rest are held to it.
  const finest = ends.at(-1);
  for (const { at, tail, whisker } of ends) {
    assert.ok(apart(at, finest?.at) < 1.5, JSON.stringify(ends.map((end) => end.at)));
    assert.ok(apart(tail, finest?.tail) < 3, "tail");
    assert.ok(apart(whisker, finest?.whisker) < 4, "whisker");
  }
});

test("no two layers change places back and forth", () => {
  for (const [name, path] of Object.entries(PATHS)) {
    for (const fps of [60, 144]) {
      const dragon = createDragon(path(0));
      let was = "";
      const swapped = new Map<string, number>();
      let changes = 0;
      along(dragon, path, 0, 14, fps, (pose, t) => {
        const order = (pose.order ?? []).join(" ");
        if (was !== "" && order !== was) {
          changes += 1;
          const before = was.split(" ");
          const now = order.split(" ");
          for (const [index, layer] of now.entries()) {
            for (const other of now.slice(index + 1)) {
              if (before.indexOf(layer) > before.indexOf(other)) {
                const pair = `${layer}/${other}`;
                const back = `${other}/${layer}`;
                const when = swapped.get(back);
                assert.ok(
                  when === undefined || t - when > 0.12,
                  `${name} ${fps} ${pair} at ${t}, back from ${when}`,
                );
                swapped.set(pair, t);
              }
            }
          }
        }
        was = order;
      });
      assert.ok(changes / 14 < 40, `${name}: ${changes}`);
    }
  }
});

test("a nudge doesn't swing it: circling, it goes on round the same way", () => {
  for (const fps of FRAME_RATES) {
    const dragon = circling();
    const { way } = dragon;
    let pointer = { x: 400, y: 300 };
    for (let frame = 0; frame < 6 * fps; frame += 1) {
      const nudge = frame % Math.round(fps / 2) === 0;
      const by = nudge ? { x: frame % 3 === 0 ? 4 : -4, y: 2 } : STILL;
      pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
      stepDragon(dragon, pointer, by, 1 / fps);
      assert.equal(dragon.way, way);
      assert.ok(dragon.swim.turn * way > -0.8, `${fps}: ${dragon.swim.turn}`);
      assert.ok(dragon.chase.x < 0.15, `${dragon.chase.x}`);
    }
  }
});

test("a stop-go or fidgeting mouse doesn't have it wagging", () => {
  for (const path of [stopGo, fidget, creep]) {
    const dragon = createDragon(path(0));
    along(dragon, path, 0, 3);
    let flips = 0;
    let way = 0;
    along(dragon, path, 3, 13, 60, () => {
      const now = Math.abs(dragon.swim.turn) > 2.5 ? Math.sign(dragon.swim.turn) : way;
      if (now !== way) {
        flips += 1;
        way = now;
      }
    });
    assert.ok(flips <= 14, `${path.name}: ${flips}`);
  }
});

test("doubling back it comes round in one curve, never reversing mid-turn", () => {
  const dragon = createDragon({ x: 300, y: 300 });
  const pointer = run(dragon, { x: 300, y: 300 }, 1.5, { x: 300, y: 0 });
  let turned = 0;
  let last = dragon.swim.heading;
  let against = 0;
  run(dragon, pointer, 1.2, { x: -300, y: 0 }, 60, () => {
    const by = Math.atan2(
      Math.sin(dragon.swim.heading - last),
      Math.cos(dragon.swim.heading - last),
    );
    last = dragon.swim.heading;
    if (Math.abs(turned) < 2.4) {
      turned += by;
      if (Math.abs(turned) > 0.6 && by * turned < -0.02) {
        against += 1;
      }
    }
  });
  assert.ok(Math.abs(turned) >= 2.4, `${turned}`);
  assert.ok(against <= 12, `${against}`);
});

test("its body's stretch of the trail keeps its length", () => {
  const dragon = createDragon({ x: 300, y: 300 });
  along(dragon, pacing, 0, 3);
  const { marks } = dragon.swim.trail;
  for (const [index, mark] of marks.slice(1).entries()) {
    const before = marks[index];
    assert.ok(Math.abs(Math.hypot(mark.x - (before?.x ?? 0), mark.z - (before?.z ?? 0)) - 2) < 0.3);
  }
});

test("curling tight, it goes over its own body, and that's what's drawn", () => {
  const dragon = circling();
  dragon.act = "curl";
  dragon.actFor = 0;
  let high = 0;
  let crossed = false;
  run(dragon, { x: 400, y: 300 }, 2.2, STILL, 60, (pose) => {
    high = Math.max(high, dragon.swim.h.x);
    const order = pose.order ?? [];
    crossed ||= order.indexOf("head") > order.indexOf("seg-9") && dragon.swim.h.x > 6;
  });
  assert.ok(high > 6, `${high}`);
  assert.ok(crossed);
});

test("its whiskers and mane stream behind a move, swing on a stop and settle", () => {
  const dragon = createDragon({ x: 300, y: 300 });
  let pointer = run(dragon, { x: 300, y: 300 }, 1.5, { x: 300, y: 0 });
  const swayNow = () => {
    const { mane, whiskers } = hangsOf(dragon);
    const [chain] = dragon.whiskers;
    const [lock] = dragon.mane;
    const whisker = chain && whiskers[0] ? swayOf(chain, whiskers[0]) : STILL;
    const hair = lock && mane[0] ? swayOf(lock, mane[0]) : STILL;
    return { hair: Math.hypot(hair.x, hair.y), whisker: Math.hypot(whisker.x, whisker.y) };
  };
  let whisker = 0;
  let hair = 0;
  pointer = run(dragon, pointer, 0.8, { x: -300, y: 120 }, 60, () => {
    whisker = Math.max(whisker, swayNow().whisker);
    hair = Math.max(hair, swayNow().hair);
  });
  assert.ok(whisker > 6, `${whisker}`);
  assert.ok(hair > 3, `${hair}`);
  run(dragon, pointer, 8);
  const tail = swayOf(dragon.tail, tailHangOf(dragon));
  assert.ok(Math.hypot(tail.x, tail.y) < 4, `${tail.x} ${tail.y}`);
});

test("left long enough it coils round the pearl, facing the visitor, eyes shut", () => {
  for (const start of STARTS) {
    const dragon = createDragon(start);
    let snoredEarly = false;
    run(dragon, start, 44, STILL, 60, (pose) => {
      if (pose.say === "z z z" && dragon.coil !== "wound") {
        snoredEarly = true;
      }
    });
    assert.equal(dragon.coil, "wound");
    assert.ok(!snoredEarly);
    assert.ok(dragon.rig.doze.x > 0.9, `${dragon.rig.doze.x}`);
    assert.equal(dragon.swim.speed, 0);
    assert.ok(faceShown(dragon) > 0.6, `${faceShown(dragon)}`);
    const { at } = creature.pose(dragon);
    assert.ok(Math.hypot(at.x - start.x, at.y - start.y) < 45, "by the pearl");
  }
});

test("a twitch of the mouse leaves it sleeping; a real move wakes it", () => {
  const dragon = createDragon({ x: 300, y: 300 });
  const at = run(dragon, { x: 300, y: 300 }, 44);
  assert.equal(dragon.coil, "wound");
  run(dragon, at, 0.05, { x: 40, y: 0 });
  run(dragon, at, 1);
  assert.equal(dragon.coil, "wound");
  run(dragon, at, 0.5, { x: 200, y: 0 });
  assert.equal(dragon.coil, "none");
  assert.ok(dragon.swim.speed > 40, `${dragon.swim.speed}`);
});

test("clicked on, it turns to the visitor and roars, its back never to them", () => {
  for (const start of STARTS) {
    for (let wait = 0; wait < 10; wait += 1) {
      const dragon = circling(start);
      run(dragon, start, wait * 0.37);
      pokeDragon(dragon, headAt(dragon));
      assert.ok(creature.pose(dragon).say !== null);
      const line = creature.pose(dragon).say;
      let opened = 0;
      run(dragon, start, 1.5, STILL, 60, (pose) => {
        assert.equal(pose.say, line);
        if (dragon.rig.jaw.x > 0.3) {
          opened += 1;
          assert.ok(faceShown(dragon) > 0.1, `${faceShown(dragon)}`);
        }
      });
      assert.ok(opened > 20, `${opened}`);
    }
  }
});

test("clicked elsewhere, it lunges there, jaws open", () => {
  const dragon = circling();
  const away = { x: headAt(dragon).x + 150, y: headAt(dragon).y + 40 };
  pokeDragon(dragon, away);
  let nearest = Infinity;
  let jaw = 0;
  run(dragon, { x: 400, y: 300 }, 0.9, STILL, 60, (pose) => {
    nearest = Math.min(nearest, Math.hypot(pose.at.x - away.x, pose.at.y - away.y));
    jaw = Math.max(jaw, dragon.rig.jaw.x);
  });
  assert.ok(nearest < 45, `${nearest}`);
  assert.ok(jaw > 0.4, `${jaw}`);
});

test("a mouse come to rest on it stops it, and it leans in with its eyes shut", () => {
  for (const start of STARTS) {
    const dragon = circling(start);
    const { at } = creature.pose(dragon);
    const on = { x: at.x, y: at.y - 6 };
    stepDragon(dragon, on, { x: on.x - start.x, y: on.y - start.y }, 1 / 60);
    run(dragon, on, 1.5);
    assert.ok(dragon.held);
    assert.ok(dragon.rig.content.x > 0.8, `${dragon.rig.content.x}`);
    assert.ok(creature.pose(dragon).say?.includes("♥"), `${creature.pose(dragon).say}`);
    assert.ok(dragon.swim.speed < 1);
    // Off it again, it swims.
    run(dragon, on, 0.6, { x: 200, y: 100 });
    assert.ok(!dragon.held);
    assert.ok(dragon.swim.speed > 40, `${dragon.swim.speed}`);
  }
});

test("swimming under a resting mouse isn't a petting: it goes on circling", () => {
  for (const start of STARTS) {
    const dragon = createDragon(start);
    run(dragon, start, 25, STILL, 60, (pose) => {
      assert.ok(!dragon.held);
      assert.ok(!pose.say?.includes("♥"), pose.say ?? "");
    });
  }
});

test("its business begins only with its face to the visitor", () => {
  for (const start of STARTS) {
    const dragon = createDragon(start);
    let acts = 0;
    let was = dragon.act;
    run(dragon, start, 28, STILL, 60, () => {
      if (dragon.act !== "none" && dragon.act !== was) {
        acts += 1;
        assert.ok(faceShown(dragon) > -0.15, `${dragon.act}: ${faceShown(dragon)}`);
      }
      was = dragon.act;
    });
    assert.ok(acts >= 3, `${acts}`);
  }
});

test("its bubble floats over its head in every pose", () => {
  const dragon = createDragon({ x: 400, y: 300 });
  run(dragon, { x: 400, y: 300 }, 44, STILL, 60, (pose) => {
    assert.ok(pose.bubble.y <= -26, `${pose.bubble.y}`);
    assert.ok(Math.abs(pose.bubble.x) < 8, `${pose.bubble.x}`);
  });
});
