import assert from "node:assert/strict";
import test from "node:test";

import type { Point } from "../follower/walk";
import type { Act, Bunny } from "./bunny";
import { PITCH, toScreen } from "../follower/solid";
import { bunnyPose, geometryOf, hopOf, SIZE } from "./bunny-pose";
import { createBunny, pokeBunny, stepBunny } from "./bunny";
import {
  FORE_LAND,
  FORE_REACH,
  FORE_REST,
  feetOf,
  groundAt,
  HIND_LIFT,
  HIND_REST,
  isAirborne,
  planLeap,
  TURNING,
} from "./hop";

const STILL: Point = { x: 0, y: 0 };

/** Where a drawn ellipse's middle is, on the screen. */
const middleOf = (bunny: Bunny, part: string) => {
  const pose = bunnyPose(bunny);
  const found =
    /^M(?<x>-?[\d.]+) (?<y>-?[\d.]+)a[^ ]+ [^ ]+ [^ ]+ 1 0 (?<dx>-?[\d.]+) (?<dy>-?[\d.]+)/u.exec(
      pose.parts[part]?.d ?? "",
    )?.groups;
  assert.ok(found, part);
  // Drawn `SIZE` times its own pixels about where it is.
  return {
    x: pose.at.x + (Number(found.x) + Number(found.dx) / 2) * SIZE,
    y: pose.at.y + (Number(found.y) + Number(found.dy) / 2) * SIZE,
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
    // Back and forth for eighteen seconds: long enough that the swinging, and which hops it happens to take, average out.
    for (let frame = 0; frame < 19 * fps; frame += 1) {
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
    // Hopping straight on, nothing changes sides: at most a couple settling in.
    assert.ok(changes <= 3, `${k}: ${changes} changes in ${hops} hops`);
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

test("its forepaws come down within reach of its shoulders, and land without a jump", () => {
  for (const way of WAYS) {
    const bunny = settled();
    let farthest = 0;
    // How much more its paw moves on the frame it lands than the frame before: it should be slowing.
    let landingJump = Number.NEGATIVE_INFINITY;
    let last: Point | null = null;
    let lastMove = 0;
    chase(bunny, HOME, { x: way.x * 220, y: way.y * 220 }, 2.5, 0.5, () => {
      const { fores } = geometryOf(bunny);
      const [fore] = fores;
      if (!fore) {
        return;
      }
      const down = feetOf(bunny.hopper).fore[0].swing < 0;
      const off = [
        fore.shoulder[0] - fore.at[0],
        fore.shoulder[1] - fore.at[1],
        fore.shoulder[2] - fore.at[2],
      ];
      if (down && Math.max(bunny.rig.stand.x, bunny.rig.groom.x) < 0.005) {
        farthest = Math.max(farthest, Math.hypot(off[0] ?? 0, off[1] ?? 0, off[2] ?? 0));
      }
      // Its paw on the screen, against its body: how far it moves as it lands.
      const local = toScreen(fore.at);
      const seen = { x: bunny.walker.x + local.x * SIZE, y: bunny.walker.y + local.y * SIZE };
      const { leap, u } = bunny.hopper;
      const landing =
        leap !== null && u >= FORE_LAND[0] && u - 1 / (leap.seconds * 60) < FORE_LAND[0];
      const move = last ? Math.hypot(seen.x - last.x, seen.y - last.y) : 0;
      if (landing && last) {
        landingJump = Math.max(landingJump, move - lastMove);
      }
      last = seen;
      lastMove = move;
    });
    assert.ok(
      farthest <= FORE_REACH + 0.5,
      `${JSON.stringify(way)}: a planted paw ${farthest} from its shoulder`,
    );
    assert.ok(
      landingJump < 0.75,
      `${JSON.stringify(way)}: its paw sped up ${landingJump}px landing`,
    );
  }
});

test("hopping away from the camera its ears stay up, not flattened onto its head", () => {
  const bunny = settled();
  chase(bunny, HOME, { x: 0, y: -160 }, 2, 0, (frame) => {
    if (frame > 30) {
      for (const ear of bunny.ears) {
        const [root] = ear.knots;
        const tip = ear.knots.at(-1);
        assert.ok(
          root && tip && root.y - tip.y > 6,
          `ear tip ${root && tip ? root.y - tip.y : 0}px above its root`,
        );
      }
    }
  });
});

test("sat up tall its ears stand up, side on either way", () => {
  for (const heading of [0, Math.PI]) {
    const bunny = settled();
    bunny.act = "stand";
    bunny.actFor = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      bunny.hopper.heading = heading;
      bunny.rig.gaze.x = heading;
      stepBunny(bunny, { x: bunny.walker.x + 54, y: bunny.walker.y - 28 }, STILL, 1 / 60);
    }
    assert.ok(bunny.rig.stand.x > 0.8);
    for (const rest of geometryOf(bunny).ears) {
      const [root] = rest.points;
      const tip = rest.points.at(-1);
      const lean = root && tip ? Math.abs(Math.atan2(tip[0] - root[0], tip[1] - root[1])) : Math.PI;
      assert.ok(lean < 0.6, `heading ${heading}: ear ${(lean * 180) / Math.PI}° from upright`);
    }
  }
});

test("sat up facing the camera its forepaws dangle below its shoulders", () => {
  const bunny = settled();
  bunny.act = "stand";
  bunny.actFor = 0;
  for (let frame = 0; frame < 60; frame += 1) {
    bunny.hopper.heading = Math.PI / 2;
    bunny.rig.gaze.x = Math.PI / 2;
    stepBunny(bunny, { x: bunny.walker.x + 54, y: bunny.walker.y - 28 }, STILL, 1 / 60);
  }
  for (const fore of geometryOf(bunny).fores) {
    const drop = toScreen(fore.at).y - toScreen(fore.shoulder).y;
    assert.ok(drop > 3, `its paw ${drop}px below its shoulder`);
  }
});

test("its muzzle is all there or not at all: never see-through", () => {
  const bunny = settled();
  chase(bunny, HOME, { x: -220, y: 90 }, 3, 0.5, () => {
    for (const [name, part] of Object.entries(bunnyPose(bunny).parts)) {
      if (name.startsWith("pad")) {
        assert.ok(
          part.opacity === undefined || part.opacity === 0 || part.opacity === 1,
          `${name}: ${part.opacity}`,
        );
      }
    }
  });
});

test("turning right round after the mouse, it turns one way, not back and forth", () => {
  for (const speed of [150, 250]) {
    const bunny = settled();
    const pointer = chase(bunny, HOME, { x: speed, y: 0 }, 1.5, 0);
    const turns: number[] = [];
    let was = bunny.hopper.leap;
    chase(bunny, pointer, { x: -speed, y: 0 }, 2, 0, () => {
      const { leap } = bunny.hopper;
      if (leap && leap !== was && Math.abs(leap.turnTo - leap.turnFrom) > 0.5) {
        turns.push(Math.sign(leap.turnTo - leap.turnFrom));
      }
      was = leap;
    });
    // Its big turns, round to face the other way, all one way.
    assert.ok(
      turns.length > 0 && turns.every((sign) => sign === turns[0]),
      `${speed}: ${turns.join(" ")}`,
    );
  }
});

/** How far a chain's turned from root to tip, on the screen, radians. */
const wayOfChain = ({ knots }: Bunny["ears"][number]) => {
  const [root] = knots;
  const tip = knots.at(-1);
  return root && tip ? Math.atan2(tip.x - root.x, root.y - tip.y) : 0;
};

const turnOf = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

test("bounding, its ears swing a long way, but never snap round in a frame", () => {
  for (const fps of [60, 144]) {
    for (const way of [WAYS[0], WAYS[3], WAYS[4]]) {
      const bunny = settled();
      const window = Math.round(fps / 60);
      const ways: [number[], number[]] = [[], []];
      let fastest = 0;
      chase(
        bunny,
        HOME,
        { x: (way?.x ?? 0) * 300, y: (way?.y ?? 0) * 300 },
        3,
        1,
        () => {
          for (const [index, ear] of bunny.ears.entries()) {
            const seen = ways[index] ?? [];
            seen.push(wayOfChain(ear));
            const before = seen.at(-1 - window);
            if (before !== undefined) {
              fastest = Math.max(fastest, Math.abs(turnOf(before, wayOfChain(ear))));
            }
          }
        },
        fps,
      );
      const degrees = (fastest * 180) / Math.PI;
      assert.ok(degrees < 20, `${JSON.stringify(way)} at ${fps}fps: ${degrees}° in a frame`);
      for (const seen of ways) {
        const swung = (Math.max(...seen) - Math.min(...seen)) * (180 / Math.PI);
        assert.ok(swung > 25, `${JSON.stringify(way)} at ${fps}fps: swung only ${swung}°`);
      }
    }
  }
});

/** A bunny stood at `heading`, its feet under it. */
const standingAt = (heading: number) => {
  const bunny = createBunny(HOME);
  const { hopper } = bunny;
  const pin = (forward: number, left: number) => ({
    ...groundAt(hopper.at, heading, forward, left),
    turn: heading,
  });
  hopper.heading = heading;
  hopper.fore = [pin(FORE_REST.x, FORE_REST.side), pin(FORE_REST.x, -FORE_REST.side)];
  hopper.hind = [pin(HIND_REST.x, HIND_REST.side), pin(HIND_REST.x, -HIND_REST.side)];
  bunny.rig.heading.x = heading;
  bunny.rig.gaze.x = heading;
  return bunny;
};

/** Each frame of an `act` begun stood at `heading`. */
const acting = (heading: number, act: Act, each: (bunny: Bunny) => void) => {
  const bunny = standingAt(heading);
  bunny.act = act;
  bunny.actFor = 0;
  while (bunny.act === act) {
    stepBunny(bunny, HOME, STILL, 1 / 60);
    each(bunny);
  }
};

const FACE_SEEN = [0, 0.4, 0.8, 1.2, Math.PI / 2, 2, 2.6, 3, Math.PI, -0.1, -0.4, -2.8, -3];

test("its muzzle stays on its face, side on or a little turned away, nosing down or not", () => {
  for (const heading of FACE_SEEN) {
    for (const act of ["sniff", "groom", "stand"] as const) {
      let behind = 0;
      acting(heading, act, (bunny) => {
        behind += bunny.sides.pads === false ? 1 : 0;
      });
      assert.equal(behind, 0, `${act} at ${heading}: ${behind} frames behind its head`);
    }
  }
});

test("turned right away, its muzzle goes behind its head, and not back and forth", () => {
  for (const heading of [-Math.PI / 2, -1.2, -1.9]) {
    acting(heading, "sniff", (bunny) => {
      assert.equal(bunny.sides.pads, false, `at ${heading}`);
    });
  }
  // Round from its front to its back and home again, wobbling, its muzzle changes sides twice each way.
  const bunny = standingAt(Math.PI / 2);
  let last = true;
  let changes = 0;
  for (let frame = 0; frame < 480; frame += 1) {
    const heading = Math.PI / 2 - (frame / 240) * Math.PI * 2 + 0.1 * Math.sin(frame / 3);
    bunny.hopper.heading = heading;
    bunny.rig.gaze.x = heading;
    bunny.act = "thump";
    bunny.actFor = 0;
    stepBunny(bunny, HOME, STILL, 1 / 60);
    changes += bunny.sides.pads === last ? 0 : 1;
    last = bunny.sides.pads ?? true;
  }
  assert.equal(changes, 4);
});

test("grooming, the paw it scrubs with is before its face, not lost in its head", () => {
  for (const heading of FACE_SEEN) {
    const near = Math.cos(heading) >= 0 ? 0 : 1;
    let frames = 0;
    let before = 0;
    let changes = 0;
    let last: boolean | undefined;
    acting(heading, "groom", (bunny) => {
      if (bunny.rig.groom.x > 0.8) {
        const now = bunny.sides[`fore-${near}-head`];
        frames += 1;
        before += now ? 1 : 0;
        changes += last === undefined || now === last ? 0 : 1;
        last = now;
      }
    });
    assert.ok(before / frames > 0.95, `at ${heading}: before its head ${before} of ${frames}`);
    assert.ok(changes <= 1, `at ${heading}: ${changes} changes`);
  }
});

test("grooming, it's seen scrubbing: its paw goes up and down its face", () => {
  for (const heading of [0.7, 2.4]) {
    const near = Math.cos(heading) >= 0 ? 0 : 1;
    let least = Number.POSITIVE_INFINITY;
    let most = Number.NEGATIVE_INFINITY;
    acting(heading, "groom", (bunny) => {
      const { fores, head } = geometryOf(bunny);
      const paw = fores[near]?.at;
      if (paw && bunny.rig.groom.x > 0.8) {
        const off = toScreen(paw).y - toScreen(head.at).y;
        least = Math.min(least, off);
        most = Math.max(most, off);
      }
    });
    assert.ok(most - least > 3, `at ${heading}: its paw moved ${most - least}px`);
  }
});

test("left be, it settles three-quarters on to the camera, for all it gets up to", () => {
  for (let k = 0; k < 12; k += 1) {
    const angle = (k / 12) * Math.PI * 2;
    const bunny = settled();
    const by = { x: Math.cos(angle) * 220, y: Math.sin(angle) * 140 };
    const heading: Partial<Record<Act, number>> = {};
    chase(bunny, HOME, by, 1, 14, (_, moving) => {
      if (!moving && bunny.act !== "none") {
        heading[bunny.act] = Math.min(heading[bunny.act] ?? 1, Math.sin(bunny.hopper.heading));
      }
    });
    for (const [act, sin] of Object.entries(heading)) {
      assert.ok(sin > 0.2, `${k}: ${act} turned away, sin ${sin}`);
    }
    assert.ok(Object.keys(heading).length > 0, `${k}: it got up to nothing`);
  }
});

test("following a slow mouse, it doesn't hop round to the camera at every pause", () => {
  const bunny = settled();
  let turned = 0;
  let was = bunny.hopper.leap;
  chase(bunny, HOME, { x: 30, y: 0 }, 8, 0, () => {
    const { leap } = bunny.hopper;
    if (leap && leap !== was && leap.size === 0) {
      turned += 1;
    }
    was = leap;
  });
  assert.ok(turned <= 2, `${turned} hops round`);
});
