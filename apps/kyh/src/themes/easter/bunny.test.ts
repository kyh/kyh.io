import assert from "node:assert/strict";
import test from "node:test";

import type { Point } from "../follower/walk";
import type { Bunny } from "./bunny";
import { PITCH } from "../follower/solid";
import { bunnyPose, hopOf } from "./bunny-pose";
import { createBunny, pokeBunny, stepBunny } from "./bunny";
import { feetOf, HIND_LIFT, isAirborne, planLeap, TURNING } from "./hop";

const STILL: Point = { x: 0, y: 0 };

/** Where a drawn ellipse's middle is, on the screen. */
const middleOf = (bunny: Bunny, part: string) => {
  const pose = bunnyPose(bunny);
  const found =
    /^M(?<x>-?[\d.]+) (?<y>-?[\d.]+)a[^ ]+ [^ ]+ [^ ]+ 1 0 (?<dx>-?[\d.]+) (?<dy>-?[\d.]+)/u.exec(
      pose.parts[part]?.d ?? "",
    )?.groups;
  assert.ok(found, part);
  return {
    x: pose.at.x + Number(found.x) + Number(found.dx) / 2,
    y: pose.at.y + Number(found.y) + Number(found.dy) / 2,
  };
};

/** A bunny settled where it was made. */
const HOME: Point = { x: 600, y: 400 };

const settled = (at: Point = HOME) => {
  const bunny = createBunny(at);
  for (let frame = 0; frame < 120; frame += 1) {
    stepBunny(bunny, at, STILL, 1 / 60);
  }
  return bunny;
};

/** The pointer moving `by` a second for `seconds`, then still `after`; `each` sees every frame. */
const chase = (
  bunny: Bunny,
  from: Point,
  by: Point,
  seconds: number,
  after: number,
  each: (frame: number, moving: boolean) => void = () => {},
  fps = 60,
) => {
  let pointer = from;
  const moving = Math.round(seconds * fps);
  for (let frame = 0; frame < moving + Math.round(after * fps); frame += 1) {
    const step = frame < moving ? { x: by.x / fps, y: by.y / fps } : STILL;
    pointer = { x: pointer.x + step.x, y: pointer.y + step.y };
    stepBunny(bunny, pointer, step, 1 / fps);
    each(frame, frame < moving);
  }
  return pointer;
};

const WAYS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: -0.7, y: 0.7 },
  { x: 0.7, y: -0.7 },
];

test("a foot set down stays put till it lifts: going, stopping, turning round", () => {
  for (const way of WAYS) {
    for (const speed of [60, 200, 500]) {
      const bunny = settled();
      const downAt: Record<string, Point | null> = {};
      let worst = 0;
      chase(bunny, { x: 600, y: 400 }, { x: way.x * speed, y: way.y * speed }, 1.5, 1.5, () => {
        const feet = feetOf(bunny.hopper);
        const { leap, u } = bunny.hopper;
        // A hind foot's middle moves as its heel lifts to push off; its forepaws' never, set down.
        const pushing = leap !== null && u > HIND_LIFT - 0.16 && u <= HIND_LIFT;
        // A binky takes all its feet off the ground.
        const leaping = bunny.act === "binky";
        const checks: [string, boolean][] = [
          // Sat up or grooming, its forepaws are up off the ground, not set down.
          [
            "fore-0",
            feet.fore[0].swing < 0 &&
              !leaping &&
              Math.max(bunny.rig.stand.x, bunny.rig.groom.x) < 0.005,
          ],
          ["hind-0", feet.hind[0].swing < 0 && !pushing && !leaping],
        ];
        for (const [part, down] of checks) {
          const at = middleOf(bunny, part);
          const was = downAt[part];
          if (down && was) {
            worst = Math.max(worst, Math.hypot(at.x - was.x, at.y - was.y));
          }
          downAt[part] = down ? (was ?? at) : null;
        }
      });
      assert.ok(worst < 0.05, `${JSON.stringify(way)} at ${speed}: slid ${worst}px`);
    }
  }
});

test("in the air it flies at one speed; it turns only pushing off on its toes and flying", () => {
  const bunny = settled();
  let last: Point | null = null;
  let lastV: Point | null = null;
  let lastTurn = bunny.hopper.heading;
  let worst = 0;
  let turnedDown = 0;
  chase(bunny, { x: 600, y: 400 }, { x: -250, y: 120 }, 2, 1, () => {
    const hop = hopOf(bunny);
    const now = { x: hop.at.x, y: hop.at.z };
    const v = last ? { x: (now.x - last.x) * 60, y: (now.y - last.y) * 60 } : null;
    const { leap, u } = bunny.hopper;
    if (leap && isAirborne(u) && isAirborne(u - 2 / (leap.seconds * 60)) && v && lastV) {
      worst = Math.max(worst, Math.hypot(v.x - lastV.x, v.y - lastV.y));
    }
    // Its forepaws down, or its hind feet flat, its heading holds.
    if (!leap || u < TURNING[0] || u > TURNING[1]) {
      turnedDown = Math.max(turnedDown, Math.abs(Math.sin(hop.heading - lastTurn)));
    }
    lastTurn = hop.heading;
    last = now;
    lastV = v;
  });
  assert.ok(worst < 1, `its speed changed in the air by ${worst}px/s`);
  assert.ok(turnedDown < 0.02, `turned on the ground by ${turnedDown}`);
});

test("stopping, it lands its last hop where it's going and stands: no creeping", () => {
  for (const way of WAYS) {
    const bunny = settled();
    const lengths: number[] = [];
    let lastMove = 0;
    let was = bunny.hopper.leap;
    let where = { ...bunny.walker };
    chase(bunny, HOME, { x: way.x * 300, y: way.y * 300 }, 1, 3, (frame, moving) => {
      const { leap } = bunny.hopper;
      if (!moving && leap && leap !== was) {
        lengths.push(Math.hypot(leap.to.x - leap.from.x, leap.to.z - leap.from.z));
      }
      if (Math.hypot(bunny.walker.x - where.x, bunny.walker.y - where.y) > 0.001) {
        lastMove = frame;
      }
      was = leap;
      where = { ...bunny.walker };
    });
    // Catching up, its hops are as long as they go; only its last is shorter, landing it there.
    const travel = lengths.filter((length) => length > 0);
    const short = travel.slice(0, -1).filter((length) => length < (travel[0] ?? 0) * 0.9);
    assert.equal(short.length, 0, `${JSON.stringify(way)}: ${travel.map(Math.round).join(" ")}`);
    assert.ok(lastMove < 60 * 4 - 30, `${JSON.stringify(way)}: still moving at the end`);
  }
});

test("its hops keep a rabbit's cadence, however fast it goes", () => {
  for (const way of WAYS) {
    const bunny = settled();
    const hop0 = bunny.hop;
    chase(bunny, HOME, { x: way.x * 600, y: way.y * 600 }, 4, 0);
    const rate = (bunny.hop - hop0) / 4;
    assert.ok(rate > 1.5 && rate < 4.5, `${JSON.stringify(way)}: ${rate} hops a second`);
  }
});

test("a binky: up and down in four tenths of a second, squashed landing, a second click ignored", () => {
  const bunny = settled();
  const on = { x: bunny.walker.x, y: bunny.walker.y - 15 };
  stepBunny(bunny, on, { x: 0, y: -15 }, 1 / 60);
  pokeBunny(bunny, on);
  let air = 0;
  let squash = { least: 0, most: 0 };
  let content = 0;
  let restarted = false;
  for (let frame = 0; frame < 60; frame += 1) {
    const before = bunny.actFor;
    if (frame === 18) {
      pokeBunny(bunny, on);
    }
    stepBunny(bunny, on, STILL, 1 / 60);
    restarted ||= bunny.act === "binky" && bunny.actFor < before;
    const lifted = bunnyPose(bunny).parts.torso?.d ?? "";
    if (bunny.act === "binky" && bunny.actFor > 0.12 && bunny.actFor < 0.52) {
      air += 1 / 60;
      content = Math.max(content, bunny.rig.content.x);
    }
    squash = {
      least: Math.min(squash.least, bunny.squash.x),
      most: Math.max(squash.most, bunny.squash.x),
    };
    assert.ok(lifted.length > 0);
  }
  assert.ok(Math.abs(air - 0.4) < 0.05, `${air}s in the air`);
  assert.ok(squash.most > 0.06 && squash.least < -0.1, JSON.stringify(squash));
  assert.ok(content < 0.05, `content mid-air: ${content}`);
  assert.ok(!restarted, "a click in the air started it over");
});

test("a thump: its rear lifts, then it stamps, hard; hopping, it startles instead", () => {
  const bunny = settled();
  const tail0 = middleOf(bunny, "haunch-0");
  pokeBunny(bunny, { x: bunny.walker.x + 200, y: bunny.walker.y - 150 });
  assert.equal(bunny.act, "thump");
  let rose = 0;
  let squash = 0;
  for (let frame = 0; frame < 40; frame += 1) {
    stepBunny(bunny, { x: 600, y: 400 }, STILL, 1 / 60);
    rose = Math.max(rose, tail0.y - middleOf(bunny, "haunch-0").y);
    squash = Math.min(squash, bunny.squash.x);
  }
  assert.ok(rose > 3, `its rear rose ${rose}px`);
  assert.ok(squash < -0.18, `stamp squash ${squash}`);
  const going = settled();
  chase(going, { x: 600, y: 400 }, { x: 300, y: 0 }, 0.3, 0);
  assert.ok(going.hopper.leap !== null);
  pokeBunny(going, { x: going.walker.x - 200, y: going.walker.y - 150 });
  assert.notEqual(going.act, "thump");
});

test("its ears lean the same at any frame rate", () => {
  const leans = [30, 60, 144].map((fps) => {
    const bunny = createBunny(HOME);
    let pointer = HOME;
    let sum = 0;
    let count = 0;
    // Back and forth for seven seconds: long enough that the swinging averages out.
    for (let frame = 0; frame < 8 * fps; frame += 1) {
      const t = frame / fps;
      const by = t > 1 ? { x: ((t % 3 < 1.5 ? 1 : -1) * 300) / fps, y: 0 } : STILL;
      pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
      stepBunny(bunny, pointer, by, 1 / fps);
      const [root] = bunny.ears[0].knots;
      const tip = bunny.ears[0].knots.at(-1);
      if (t > 1.5 && root && tip) {
        sum += Math.abs((Math.atan2(-(tip.x - root.x), -(tip.y - root.y)) * 180) / Math.PI);
        count += 1;
      }
    }
    return sum / count;
  });
  const [a = 0, b = 0, c = 0] = leans;
  assert.ok(Math.abs(a - b) < 4 && Math.abs(b - c) < 4, leans.join(", "));
});

test("nosing down, its ears stay up", () => {
  const bunny = settled();
  bunny.act = "sniff";
  bunny.actFor = 0;
  for (let frame = 0; frame < 50; frame += 1) {
    stepBunny(bunny, { x: 600, y: 400 }, STILL, 1 / 60);
  }
  assert.ok(bunny.rig.sniff.x > 0.8);
  for (const ear of bunny.ears) {
    const [root] = ear.knots;
    const tip = ear.knots.at(-1);
    assert.ok(
      root && tip && root.y - tip.y > 10,
      `ear tip ${root && tip ? root.y - tip.y : 0}px up`,
    );
  }
});

test("left be, it's alive: it breathes dozing, its nose twitches awake", () => {
  const bunny = settled();
  for (let frame = 0; frame < 60 * 32; frame += 1) {
    stepBunny(bunny, { x: 600, y: 400 }, STILL, 1 / 60);
  }
  assert.ok(bunny.rig.doze.x > 0.9);
  const torsos = new Set<string>();
  for (let frame = 0; frame < 120; frame += 1) {
    stepBunny(bunny, { x: 600, y: 400 }, STILL, 1 / 60);
    torsos.add(bunnyPose(bunny).parts.torso?.d ?? "");
  }
  assert.ok(torsos.size > 20, `${torsos.size} breaths`);
  const awake = settled();
  let least = Number.POSITIVE_INFINITY;
  let most = Number.NEGATIVE_INFINITY;
  for (let frame = 0; frame < 60; frame += 1) {
    stepBunny(awake, { x: 600, y: 400 }, STILL, 1 / 60);
    const nose = /M-?[\d.]+ (?<y>-?[\d.]+)/u.exec(bunnyPose(awake).parts.nose?.d ?? "")?.groups;
    least = Math.min(least, Number(nose?.y));
    most = Math.max(most, Number(nose?.y));
  }
  assert.ok(most - least >= 0.5, `its nose moved ${most - least}px`);
});

test("its layers stay in order while it hops, any way", () => {
  for (let k = 0; k < 8; k += 1) {
    const angle = (k / 8) * Math.PI * 2;
    const bunny = settled();
    let last = "";
    let changes = 0;
    const hop0 = bunny.hop;
    chase(
      bunny,
      { x: 600, y: 400 },
      { x: Math.cos(angle) * 200, y: Math.sin(angle) * 200 * Math.sin(PITCH) },
      3,
      0,
      (frame) => {
        const order = (bunnyPose(bunny).order ?? []).join(" ");
        if (frame > 90 && order !== last) {
          changes += 1;
        }
        last = order;
      },
    );
    const hops = bunny.hop - hop0;
    // Its near hind leg comes out from under its haunch and goes back once a hop: no more.
    assert.ok(changes <= hops * 2 + 2, `${k}: ${changes} changes in ${hops} hops`);
  }
});

test("clicked elsewhere while it hops round where it stands, it finishes turning, then thumps", () => {
  const bunny = settled();
  bunny.hopper.leap = planLeap(bunny.hopper, null, bunny.hopper.heading + 1);
  bunny.hopper.u = 0;
  assert.ok(bunny.hopper.leap);
  pokeBunny(bunny, { x: bunny.walker.x + 200, y: bunny.walker.y - 150 });
  let thumped = false;
  for (let frame = 0; frame < 40; frame += 1) {
    stepBunny(bunny, HOME, STILL, 1 / 60);
    if (bunny.act === "thump") {
      thumped = true;
      assert.equal(bunny.hopper.leap, null, "thumping mid-hop");
    }
  }
  assert.ok(thumped);
});
