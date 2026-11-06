import assert from "node:assert/strict";
import test from "node:test";

import type { Lovebird } from "./lovebird";
import type { Point } from "../follower/walk";
import { createLovebird, lovebird, stepLovebird } from "./lovebird";
import { lovebirdPose, SIZE, tailHangOf } from "./lovebird-pose";
import { flexAt, stepFlex } from "./flex";
import { swayOf } from "../follower/chain";

const STILL: Point = { x: 0, y: 0 };

/** Runs it `seconds` at 60 frames a second after a pointer moving `by` a frame. */
const run = (bird: Lovebird, from: Point, seconds: number, by = STILL) => {
  let pointer = from;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
  }
  return pointer;
};

const perched = () => {
  const bird = createLovebird({ x: 300, y: 300 });
  run(bird, { x: 300, y: 300 }, 3);
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
  return bird;
};

test("left be, it lands on the pointer's tip", () => {
  const bird = perched();
  assert.equal(bird.x, 300);
  assert.equal(bird.y, 300);
});

test("perched, it rides a gentle move along on the pointer", () => {
  const bird = perched();
  // 6 pixels a frame: 360 a second, gentle, but more than it would land from.
  const pointer = run(bird, { x: 300, y: 300 }, 0.5, { x: 6, y: 0 });
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
  assert.equal(bird.x, pointer.x);
  assert.equal(bird.y, pointer.y);
});

test("perched, a quick move shakes it off and it flies", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.3, { x: 15, y: 0 });
  assert.ok(bird.perch < 0.1, `${bird.perch}`);
  assert.ok(bird.x < pointer.x - 10, "behind");
});

test("shaken off, it flies and lands again, rather than snapping back onto the pointer", () => {
  const bird = perched();
  // One quick jerk (over a twentieth of a second), then the pointer moves on gently.
  let pointer = run(bird, { x: 300, y: 300 }, 3 / 60, { x: 15, y: 0 });
  pointer = run(bird, pointer, 0.1, { x: 2, y: 0 });
  assert.ok(Math.hypot(bird.x - pointer.x, bird.y - pointer.y) > 4, "still flying");
  // Left be, it lands on it again.
  run(bird, pointer, 3);
  assert.ok(bird.perch > 0.99, `${bird.perch}`);
});

test("perched, its wings are folded and its feet grip; in the air, they're spread and tucked", () => {
  const bird = perched();
  assert.ok(bird.rig.spread.x < 0.05, `${bird.rig.spread.x}`);
  assert.ok(bird.rig.legs.x > 0.95, `${bird.rig.legs.x}`);
  run(bird, { x: 300, y: 300 }, 0.4, { x: 15, y: 0 });
  assert.ok(bird.rig.spread.x > 0.5, `${bird.rig.spread.x}`);
  assert.ok(bird.rig.legs.x < 0.2, `${bird.rig.legs.x}`);
});

test("it flares to land: body up, tail fanned, feet thrown forward", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.6, { x: 15, y: 0 });
  let flare = 0;
  let reach = 0;
  let fan = 0;
  for (let frame = 0; frame < 180; frame += 1) {
    stepLovebird(bird, pointer, STILL, 1 / 60);
    flare = Math.max(flare, bird.rig.flare.x);
    reach = Math.max(reach, bird.rig.reach.x);
    fan = Math.max(fan, bird.rig.fan.x);
  }
  assert.ok(flare > 0.7 && reach > 0.5 && fan > 0.7, `${flare} ${reach} ${fan}`);
  assert.ok(bird.perch > 0.99);
});

test("flying round a curve, it banks into the turn", () => {
  const bird = perched();
  // Off to the right, then curving down toward the camera: its heading turns toward +z, its left.
  let pointer = run(bird, { x: 300, y: 300 }, 0.5, { x: 12, y: 0 });
  let most = 0;
  for (let frame = 0; frame < 40; frame += 1) {
    const angle = (frame / 40) * Math.PI * 0.9;
    const by = { x: Math.cos(angle) * 9, y: Math.sin(angle) * 9 };
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    most = Math.max(most, bird.rig.bank.x);
  }
  assert.ok(most > 0.25, `${most}`);
});

test("its tail visibly trails: shaken off, the chain swings well off where it lies", () => {
  const bird = perched();
  let most = 0;
  let pointer = { x: 300, y: 300 };
  for (let frame = 0; frame < 40; frame += 1) {
    const by = frame === 0 ? { x: 30, y: 0 } : { x: 8, y: 0 };
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    const sway = swayOf(bird.tail, tailHangOf(bird));
    most = Math.max(most, Math.hypot(sway.x, sway.y));
  }
  assert.ok(most > 3, `${most}`);
});

test("perched, carried off it sways back over its feet, then forward, and settles", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 0.15, { x: 3, y: 0 });
  assert.ok(bird.sway.x < -0.05, `lags back: ${bird.sway.x}`);
  run(bird, pointer, 3);
  assert.ok(Math.abs(bird.sway.x) < 0.02, `settles: ${bird.sway.x}`);
});

test("a click elsewhere always makes it cock its head", () => {
  const bird = perched();
  for (let click = 0; click < 5; click += 1) {
    bird.act = "none";
    lovebird.poke(bird, { x: 900, y: 900 });
    assert.equal(bird.act, "tilt");
  }
});

test("a flex rings the same at 30, 60 and 144 frames a second", () => {
  const ends = [30, 60, 144].map((fps) => {
    const flex = flexAt(1);
    for (let frame = 0; frame < Math.round(0.2 * fps); frame += 1) {
      stepFlex(flex, 0, 3, 0.25, 1 / fps);
    }
    return flex.x;
  });
  const [a = 0, b = 0, c = 0] = ends;
  assert.ok(Math.abs(a - b) < 0.02 && Math.abs(b - c) < 0.02, ends.join(", "));
  // Past its goal and back: it rings.
  assert.ok(Math.min(...ends) < 0, ends.join(", "));
});

/** Where a layer stacks in its pose: higher is nearer the camera. */
const stackOf = (bird: Lovebird, layer: string) => lovebirdPose(bird).order?.indexOf(layer) ?? -1;
const nearWingOf = (bird: Lovebird) => (bird.view.near === 1 ? "wing-0" : "wing-1");

test("perched, its near wing's in front of its body and its far one behind, whichever way it flew in", () => {
  for (const way of [1, -1]) {
    const bird = perched();
    const pointer = run(bird, { x: 300, y: 300 }, 0.5, { x: 15 * way, y: 0 });
    run(bird, pointer, 3);
    assert.ok(bird.perch > 0.99);
    const near = nearWingOf(bird);
    const far = near === "wing-0" ? "wing-1" : "wing-0";
    assert.ok(stackOf(bird, near) > stackOf(bird, "body"), `${way}: ${lovebirdPose(bird).order}`);
    assert.ok(stackOf(bird, far) < stackOf(bird, "body"), `${way}: ${lovebirdPose(bird).order}`);
  }
});

test("flying round and round, its layers don't flicker", () => {
  const bird = perched();
  let pointer = run(bird, { x: 300, y: 300 }, 3 / 60, { x: 20, y: 0 });
  const orders: string[] = [];
  for (let frame = 0; frame < 600; frame += 1) {
    const by = { x: Math.cos(frame / 30) * 5, y: Math.sin(frame / 30) * 5 };
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    orders.push(lovebirdPose(bird).order?.join(",") ?? "");
  }
  // A change undone within a tenth of a second is a flicker.
  let flickers = 0;
  for (let frame = 2; frame < orders.length; frame += 1) {
    const back = orders.slice(Math.max(0, frame - 7), frame - 1);
    if (orders[frame] !== orders[frame - 1] && back.includes(orders[frame] ?? "")) {
      flickers += 1;
    }
  }
  assert.equal(flickers, 0);
});

test("a gentle move rides along at any frame rate, and a long frame doesn't shake it off", () => {
  for (const fps of [30, 60, 120, 144]) {
    const bird = createLovebird({ x: 300, y: 300 });
    let pointer = run(bird, { x: 300, y: 300 }, 3);
    // Mouse events at 60 a second, 6 pixels each: 360 pixels a second.
    let t = 0;
    let event = 0;
    for (let frame = 0; frame < fps; frame += 1) {
      t += 1 / fps;
      const moved = { x: 0, y: 0 };
      while (event <= t) {
        moved.x += 6;
        event += 1 / 60;
      }
      pointer = { x: pointer.x + moved.x, y: pointer.y };
      stepLovebird(bird, pointer, moved, 1 / fps);
      assert.ok(bird.riding, `${fps} fps`);
    }
  }
  const bird = perched();
  stepLovebird(bird, { x: 330, y: 300 }, { x: 30, y: 0 }, 0.1);
  assert.ok(bird.riding, "a tenth of a second's hitch at 300 pixels a second");
});

test("it comes in and takes hold without a jump", () => {
  const bird = perched();
  const pointer = run(bird, { x: 300, y: 300 }, 1, { x: 7, y: 0 });
  let last = { x: bird.x, y: bird.y };
  let longest = 0;
  let flying = 0;
  for (let frame = 0; frame < 180 && bird.perch < 0.99; frame += 1) {
    stepLovebird(bird, pointer, STILL, 1 / 60);
    const step = Math.hypot(bird.x - last.x, bird.y - last.y);
    if (Math.hypot(pointer.x - bird.x, pointer.y - bird.y) < 30) {
      longest = Math.max(longest, step);
      flying += bird.riding ? 0 : 1;
    }
    last = { x: bird.x, y: bird.y };
  }
  assert.ok(bird.perch > 0.99);
  // Its last 30 pixels in a few frames, none a jump; no creeping in over many.
  assert.ok(longest < 9, `${longest}`);
  assert.ok(flying < 20, `${flying} frames`);
});

test("a brisk move and it launches calmly; only a real jerk tumbles it off", () => {
  const calm = perched();
  run(calm, { x: 300, y: 300 }, 0.1, { x: 14, y: 0 });
  assert.ok(!calm.riding);
  // Not ruffled: no more than a petting's fluff.
  assert.ok(calm.rig.fluff.x < 0.6, `${calm.rig.fluff.x}`);
  assert.ok(calm.scramble === 0 && !["eep!", "whoa!"].includes(calm.emotes.line ?? ""));
  const jerked = perched();
  run(jerked, { x: 300, y: 300 }, 0.1, { x: 40, y: 0 });
  assert.ok(!jerked.riding);
  assert.ok(jerked.rig.fluff.x > 0.8 && jerked.scramble > 0, `${jerked.rig.fluff.x}`);
});

test("carried along, it holds on without preening or glancing about, and settles soon after", () => {
  const bird = perched();
  let pointer = { x: 300, y: 300 };
  for (let frame = 0; frame < 120; frame += 1) {
    pointer = run(bird, pointer, 1 / 60, { x: 8, y: 0 });
    assert.ok(bird.riding);
    if (frame > 5) {
      assert.ok(bird.act === "none" || bird.act === "tilt", bird.act);
      assert.equal(bird.gaze, 0);
    }
  }
  run(bird, pointer, 0.8);
  assert.equal(bird.wings.balance, 0);
  assert.ok(Math.abs(bird.sway.x) < 0.45);
});

test("carried a long way, it hops off by itself, then lands once the pointer rests", () => {
  const bird = perched();
  let pointer = run(bird, { x: 300, y: 300 }, 2, { x: 4, y: 0 });
  assert.ok(bird.riding);
  pointer = run(bird, pointer, 2, { x: 4, y: 0 });
  assert.ok(!bird.riding);
  run(bird, pointer, 3);
  assert.ok(bird.perch > 0.99);
});

/** Steps it a frame at a time after a pointer moving `by` a frame, counting the nuzzles it begins. */
const nuzzlesIn = (bird: Lovebird, from: Point, seconds: number, by = STILL) => {
  let pointer = from;
  let nuzzles = 0;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    const was = bird.act;
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    stepLovebird(bird, pointer, by, 1 / 60);
    nuzzles += bird.act === "nuzzle" && was !== "nuzzle" ? 1 : 0;
  }
  return { nuzzles, pointer };
};

test("a petting is a settled while on a resting pointer: once a perch, not at each pause of a ride", () => {
  const bird = createLovebird({ x: 300, y: 300 });
  let { nuzzles, pointer } = nuzzlesIn(bird, { x: 300, y: 300 }, 5);
  assert.equal(nuzzles, 1, "settled on it");
  // Carried along with pauses: still the same perch, so no more pettings.
  for (let pause = 0; pause < 4; pause += 1) {
    ({ pointer } = nuzzlesIn(bird, pointer, 0.6, { x: 2.5, y: 0 }));
    const rest = nuzzlesIn(bird, pointer, 1.5);
    nuzzles += rest.nuzzles;
  }
  assert.ok(bird.riding);
  assert.equal(nuzzles, 1, "pauses in a ride");
  // Off it and back on: a new perch, a new petting.
  ({ pointer } = nuzzlesIn(bird, pointer, 0.3, { x: 14, y: 0 }));
  assert.ok(!bird.riding);
  nuzzles += nuzzlesIn(bird, pointer, 6).nuzzles;
  assert.equal(nuzzles, 2, "landed again");
});

test("a petting that comes mid-act is let go if the pointer moves on before the act ends", () => {
  const bird = createLovebird({ x: 300, y: 300 });
  let pointer = { x: 300, y: 300 };
  bird.next = 99;
  while (bird.petted < 1.2) {
    stepLovebird(bird, pointer, STILL, 1 / 60);
  }
  Object.assign(bird, { act: "preen", actFor: 0, next: 99 });
  run(bird, pointer, 1.5);
  assert.ok(bird.nuzzleDue);
  // Carried off gently, then set down: no nuzzle owed from before.
  pointer = run(bird, pointer, 0.3, { x: 2, y: 0 });
  assert.ok(!bird.nuzzleDue);
  assert.equal(nuzzlesIn(bird, pointer, 0.5).nuzzles, 0);
});

test("perched, a click (on whatever's under the pointer) makes it flinch and cock its head; it stays", () => {
  const bird = perched();
  lovebird.poke(bird, { x: 300, y: 300 });
  assert.equal(bird.act, "tilt");
  assert.ok(bird.emotes.line !== null);
  run(bird, { x: 300, y: 300 }, 1);
  assert.ok(bird.riding);
});

test("preening, it holds its near wing off its side, in front of its body, its head down at it", () => {
  const bird = perched();
  bird.act = "none";
  bird.next = 99;
  stepLovebird(bird, { x: 300, y: 300 }, STILL, 1 / 60);
  bird.act = "preen";
  bird.actFor = 0;
  run(bird, { x: 300, y: 300 }, 0.9);
  assert.ok(bird.rig.preen.x > 0.8, `${bird.rig.preen.x}`);
  assert.ok(bird.rig.spread.x < 0.05);
  assert.ok(stackOf(bird, nearWingOf(bird)) > stackOf(bird, "body"));
});

test("jerked off, it says so at once, whatever it was saying", () => {
  const bird = perched();
  bird.emotes.line = "♥";
  bird.emotes.left = 5;
  run(bird, { x: 300, y: 300 }, 0.1, { x: 40, y: 0 });
  assert.ok(["eep!", "whoa!"].includes(bird.emotes.line ?? ""), `${bird.emotes.line}`);
});

test("off the pointer, it's soon a bird in the air: feet pushed off then tucked, wings open, eyes open, body down", () => {
  const bird = perched();
  bird.rig.content.x = 1;
  const pitch = bird.rig.pitch.x;
  run(bird, { x: 300, y: 300 }, 3 / 60, { x: 14, y: 0 });
  assert.ok(!bird.riding);
  // Its feet still down a moment as it pushes off: they don't vanish behind it the frame it leaves.
  assert.ok(bird.view.feetDown, "feet down as it pushes off");
  run(bird, { x: 342, y: 300 }, 7 / 60, { x: 14, y: 0 });
  assert.ok(bird.rig.legs.x < 0.3, `legs ${bird.rig.legs.x}`);
  assert.ok(bird.rig.spread.x > 0.6, `spread ${bird.rig.spread.x}`);
  assert.equal(bird.rig.content.x, 0);
  assert.ok(bird.rig.pitch.x < pitch - 0.1, `pitch ${bird.rig.pitch.x}`);
});

test("carried straight up, it crouches into the lift and rises off its feet as it's stopped", () => {
  const bird = perched();
  let most = 0;
  let least = 0;
  let pointer = { x: 300, y: 300 };
  for (let frame = 0; frame < 60; frame += 1) {
    const by = { x: 0, y: frame < 36 ? -5 : 0 };
    pointer = run(bird, pointer, 1 / 60, by);
    most = Math.max(most, bird.dip.x);
    least = Math.min(least, bird.dip.x);
  }
  assert.ok(bird.riding);
  assert.ok(most > 0.8 && least < -0.8, `${least} ${most}`);
});

test("rousing, it shakes itself in the screen's plane, its feathers up at once", () => {
  const bird = perched();
  Object.assign(bird, { act: "rouse", actFor: 0, next: 99 });
  let shake = 0;
  for (let frame = 0; frame < 20; frame += 1) {
    stepLovebird(bird, { x: 300, y: 300 }, STILL, 1 / 60);
    shake = Math.max(shake, Math.abs(bird.shiver));
  }
  assert.ok(shake > 0.1, `${shake}`);
  assert.ok(bird.rig.fluff.x > 0.7, `${bird.rig.fluff.x}`);
});

/** The area of a path's outline, its points taken as a polygon (pixels²). */
const areaOf = (d: string) => {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
  let area = 0;
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    // Round to the first point again: the outline's closed.
    const next = (index + 2) % (numbers.length - (numbers.length % 2));
    const [x0 = 0, y0 = 0] = numbers.slice(index, index + 2);
    const [x1 = 0, y1 = 0] = numbers.slice(next, next + 2);
    area += x0 * y1 - x1 * y0;
  }
  return Math.abs(area / 2);
};

test("flaring to land toward the camera, its wings show broad, not edge on", () => {
  const bird = perched();
  // Off down the screen, toward the camera, then left be: it comes in to land facing the camera.
  const pointer = run(bird, { x: 300, y: 300 }, 0.6, { x: 0, y: 14 });
  let flared = 0;
  let thinnest = Number.POSITIVE_INFINITY;
  for (let frame = 0; frame < 180 && !bird.riding; frame += 1) {
    stepLovebird(bird, pointer, STILL, 1 / 60);
    if (bird.rig.flare.x > 0.7) {
      flared += 1;
      const { parts } = lovebirdPose(bird);
      thinnest = Math.min(
        thinnest,
        areaOf(parts["wing-0"]?.d ?? ""),
        areaOf(parts["wing-1"]?.d ?? ""),
      );
    }
  }
  assert.ok(flared > 2, `${flared} frames flared`);
  assert.ok(thinnest > 25, `${thinnest}`);
});

/** How thick a path's outline is across its length, seen (pixels): its area over its span. */
const thicknessOf = (d: string) => {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
  let span = 0;
  for (let a = 0; a + 1 < numbers.length; a += 2) {
    for (let b = a + 2; b + 1 < numbers.length; b += 2) {
      const dx = (numbers[a] ?? 0) - (numbers[b] ?? 0);
      const dy = (numbers[a + 1] ?? 0) - (numbers[b + 1] ?? 0);
      span = Math.max(span, Math.hypot(dx, dy));
    }
  }
  return (1.5 * areaOf(d) * SIZE) / Math.max(span, 1);
};

test("coming in to land from any side, neither wing is ever edge on in the last fifth of a second", () => {
  // The pointer's last move, from far off to where it rests: right (it comes in from above-left), down (from above), left (from above-right), and the rest round.
  for (const way of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const angle = (way * Math.PI) / 180;
    const rest = { x: 600, y: 500 };
    const from = { x: rest.x - 420 * Math.cos(angle), y: rest.y - 420 * Math.sin(angle) };
    const bird = createLovebird(from);
    let pointer = run(bird, from, 1.5);
    for (let frame = 1; frame <= 12; frame += 1) {
      const next = {
        x: from.x + ((rest.x - from.x) * frame) / 12,
        y: from.y + ((rest.y - from.y) * frame) / 12,
      };
      stepLovebird(bird, next, { x: next.x - pointer.x, y: next.y - pointer.y }, 1 / 60);
      pointer = next;
    }
    const seen: number[][] = [];
    for (let frame = 0; frame < 240 && !bird.riding; frame += 1) {
      stepLovebird(bird, rest, STILL, 1 / 60);
      const { parts } = lovebirdPose(bird);
      seen.push(["wing-0", "wing-1"].map((wing) => thicknessOf(parts[wing]?.d ?? "")));
    }
    assert.ok(bird.riding, `${way}: landed`);
    const last = seen.slice(-12).flat();
    assert.ok(Math.min(...last) > 1.5, `${way}: ${last.map((n) => n.toFixed(1)).join(" ")}`);
  }
});
