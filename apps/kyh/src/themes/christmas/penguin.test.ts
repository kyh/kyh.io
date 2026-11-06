import assert from "node:assert/strict";
import test from "node:test";

import type { Penguin } from "./penguin";
import type { Point } from "../follower/walk";
import { createRandom } from "@/lib/random";
import { groundSpeedOf } from "../follower/feet";
import { spotOf } from "../follower/walk";
import { createPenguin, pokePenguin, stepPenguin } from "./penguin";
import { WALK, WALK_TOP } from "./penguin-go";

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

/** Watches its heading frame to frame: how many times its turning goes back on itself. */
const swingsOf = (penguin: Penguin) => {
  let swings = 0;
  let last = penguin.rig.heading.x;
  let was = 0;
  return {
    count: () => swings,
    watch: () => {
      const now = penguin.rig.heading.x;
      const turn = Math.atan2(Math.sin(now - last), Math.cos(now - last));
      if (Math.abs(turn) > 0.002 && Math.sign(turn) !== was) {
        swings += was === 0 ? 0 : 1;
        was = Math.sign(turn);
      }
      last = now;
    },
  };
};

test("its spot straight behind it as it faces the camera, it turns round once and goes", () => {
  const penguin = createPenguin({ x: 500, y: 400 });
  const pointer = run(penguin, { x: 500, y: 400 }, 1);
  // Left and a little down, then left be: its spot ends up behind it as it faces the camera.
  const at = run(penguin, pointer, 1, { x: -40 / 60, y: 10 / 60 });
  const swings = swingsOf(penguin);
  run(penguin, at, 3, STILL, swings.watch);
  assert.ok(swings.count() <= 1, `${swings.count()}`);
  const spot = spotOf(penguin.walker, WALK, at);
  assert.ok(Math.hypot(spot.x - penguin.walker.x, spot.y - penguin.walker.y) < 10);
});

test("led about at random, it always gets to its spot and settles there", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const random = createRandom(seed);
    const penguin = createPenguin({ x: 600, y: 400 });
    let pointer = run(penguin, { x: 600, y: 400 }, 1);
    for (let move = 0; move < 12; move += 1) {
      const angle = random.next() * Math.PI * 2;
      const far = 20 + random.next() * 130;
      const speed = 30 + random.next() * 170;
      const frames = Math.max(1, Math.round((far / speed) * 60));
      const by = { x: (Math.cos(angle) * far) / frames, y: (Math.sin(angle) * far) / frames };
      pointer = run(penguin, pointer, frames / 60, by);
      const acting = penguin.act !== "none";
      const swings = swingsOf(penguin);
      pointer = run(penguin, pointer, 5, STILL, swings.watch);
      const spot = spotOf(penguin.walker, WALK, pointer);
      // Unless the mouse came to rest on it: then it stays to be petted.
      const off =
        penguin.petted > 0 ? 0 : Math.hypot(spot.x - penguin.walker.x, spot.y - penguin.walker.y);
      assert.ok(off < 12, `seed ${seed} move ${move}: ${off} off its spot, ${penguin.go.going}`);
      // Five seconds left be, it turned to face the mouse, and maybe for a stretch, and back, and from
      // whatever it was at: no jitter.
      const most = acting ? 4 : 3;
      assert.ok(swings.count() <= most, `seed ${seed} move ${move}: ${swings.count()} swings`);
      assert.equal(penguin.go.going, "walk");
    }
  }
});

test("a short move up or down the screen, at any speed, never puts it on its belly", () => {
  for (const way of [1, -1]) {
    for (const far of [40, 60, 80, 100]) {
      for (const speed of [60, 150, 400]) {
        const { penguin, pointer } = settled();
        const frames = Math.max(1, Math.round((far / speed) * 60));
        let lying = 0;
        const at = run(penguin, pointer, frames / 60, { x: 0, y: (way * far) / frames }, () => {
          lying = Math.max(lying, penguin.rig.slide.x);
        });
        run(penguin, at, 4, STILL, () => {
          lying = Math.max(lying, penguin.rig.slide.x);
        });
        assert.ok(lying < 0.05, `${way * far}px at ${speed}: ${lying}`);
      }
    }
  }
});

test("chasing a running mouse it slides at the mouse's speed, and stops short of it at any frame rate", () => {
  for (const hz of [30, 60, 144]) {
    const penguin = createPenguin({ x: 300, y: 450 });
    let pointer = { x: 300, y: 450 };
    const frame = (by: Point) => {
      pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
      stepPenguin(penguin, pointer, by, 1 / hz);
    };
    for (let at = 0; at < hz; at += 1) {
      frame(STILL);
    }
    let slowest = Infinity;
    let fastest = 0;
    for (let at = 0; at < hz * 3; at += 1) {
      frame({ x: 250 / hz, y: 0 });
      if (at > hz * 2 && penguin.go.going === "slide") {
        slowest = Math.min(slowest, penguin.walker.speed);
        fastest = Math.max(fastest, penguin.walker.speed);
      }
    }
    // No pushing and dragging by turns: a steady slide.
    assert.ok(fastest - slowest < 30, `${hz}Hz: ${slowest}..${fastest}`);
    for (let at = 0; at < hz * 4; at += 1) {
      frame(STILL);
    }
    // Stopped behind the mouse, not under it, so it isn't petted.
    assert.ok(pointer.x - penguin.walker.x > 40, `${hz}Hz: ${pointer.x - penguin.walker.x}`);
    assert.equal(penguin.petted, 0);
  }
});

/** How many preens it starts left be `seconds`, each checked to be under its flipper toward the camera. */
const preensOf = (penguin: Penguin, pointer: Point, seconds: number) => {
  let preens = 0;
  run(penguin, pointer, seconds, STILL, () => {
    if (penguin.act === "preen" && penguin.actFor < 0.02) {
      preens += 1;
      assert.ok(Math.cos(penguin.rig.heading.x) * penguin.preenSide >= 0);
    }
  });
  return preens;
};

test("it preens under the flipper on the side toward the camera", () => {
  let preened = 0;
  for (const [index, heading] of [0.3, 1.2, 2, 2.8, -0.4, -2.6].entries()) {
    for (let tries = 0; tries < 6; tries += 1) {
      const at = { x: 400 + index * 37 + tries * 101, y: 300 };
      const penguin = createPenguin(at);
      const pointer = run(penguin, at, 1);
      penguin.rig.heading.x = heading;
      preened += preensOf(penguin, pointer, 25);
    }
  }
  assert.ok(preened > 6, `${preened}`);
});

/** The most it turns one way in any 2 seconds, watched frame to frame, while its feet get under 15 pixels. */
const spinOf = (penguin: Penguin) => {
  const frames: { at: Point; turned: number }[] = [];
  let last = penguin.rig.heading.x;
  let most = 0;
  return {
    most: () => most,
    watch: () => {
      const { x } = penguin.rig.heading;
      const turned = Math.atan2(Math.sin(x - last), Math.cos(x - last));
      last = x;
      frames.push({ at: { x: penguin.walker.x, y: penguin.walker.y }, turned });
      const window = frames.slice(-120);
      const [first] = window;
      if (first && Math.hypot(first.at.x - penguin.walker.x, first.at.y - penguin.walker.y) < 15) {
        most = Math.max(most, Math.abs(window.reduce((sum, { turned: each }) => sum + each, 0)));
      }
    },
  };
};

test("sent off and straight back, it hardly ever spins round on the spot", () => {
  const random = createRandom(7);
  const tries = 600;
  let spins = 0;
  for (let tried = 0; tried < tries; tried += 1) {
    const { penguin, pointer } = settled();
    const spin = spinOf(penguin);
    const angle = random.next() * Math.PI * 2;
    const speed = (100 + random.next() * 200) / 60;
    const by = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
    const out = run(penguin, pointer, 0.3 + random.next() * 0.9, by, spin.watch);
    const paused = run(penguin, out, 0.8 + random.next() * 1.2, STILL, spin.watch);
    const back = run(penguin, paused, 0.5, { x: -by.x, y: -by.y }, spin.watch);
    run(penguin, back, 4, STILL, spin.watch);
    spins += spin.most() > 4.5 ? 1 : 0;
  }
  // Past the camera the long way is 4.3 at most; a moving mouse can add a little to the odd one.
  assert.ok(spins < tries * 0.02, `${spins}`);
});

/** How many preens it starts left be `seconds`, each held, once under way, to the near flipper with its face showing. */
const facedPreensOf = (penguin: Penguin, pointer: Point, seconds: number) => {
  let preens = 0;
  let was = penguin.act;
  run(penguin, pointer, seconds, STILL, () => {
    if (penguin.act === "preen" && was !== "preen") {
      preens += 1;
    }
    if (penguin.act === "preen" && penguin.actFor > 0.5) {
      const { x } = penguin.rig.heading;
      assert.ok(Math.cos(x) * penguin.preenSide >= -0.15, `far side at ${x}`);
      assert.ok(Math.sin(x) > -0.5, `facing away at ${x}`);
    }
    was = penguin.act;
  });
  return preens;
};

test("a preen that starts as it turns to the mouse is still under the near flipper, face showing", () => {
  const random = createRandom(11);
  let preens = 0;
  for (let tries = 0; tries < 150; tries += 1) {
    const start = { x: 300 + tries * 3, y: 300 };
    const penguin = createPenguin(start);
    // Off to its side, so the mouse resting there isn't a petting.
    const beside = run(penguin, { x: start.x + 64, y: start.y - 34 }, 1);
    const angle = random.next() * Math.PI * 2;
    const by = { x: Math.cos(angle) * 3.3, y: Math.sin(angle) * 3.3 };
    const at = run(penguin, beside, 0.4 + random.next() * 0.6, by);
    preens += facedPreensOf(penguin, at, 12);
  }
  assert.ok(preens > 20, `${preens}`);
});

test("clicked on walking away, it turns to show itself off at once, not partway through its bray", () => {
  const penguin = createPenguin({ x: 400, y: 500 });
  const pointer = run(penguin, { x: 400, y: 500 }, 1);
  const at = run(penguin, pointer, 1.5, { x: 0, y: -1.2 });
  assert.ok(Math.sin(penguin.rig.heading.x) < -0.5, `${penguin.rig.heading.x}`);
  pokePenguin(penguin, { x: penguin.walker.x, y: penguin.walker.y - 20 });
  assert.equal(penguin.act, "display");
  let turned = 0;
  run(penguin, at, 1.7, STILL, (frame) => {
    if (turned === 0 && Math.sin(penguin.rig.heading.x) > 0) {
      turned = frame / 60;
    }
  });
  assert.ok(turned > 0 && turned < 0.6, `${turned}`);
});
