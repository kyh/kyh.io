import assert from "node:assert/strict";
import test from "node:test";

import { createPresses, createSpotlight, IDLE_MS, isHover, keyMove } from "./controls";

const spotlight = (options: { still?: boolean } = {}) => {
  const clock = { now: 0, takes: 0 };
  const lights = createSpotlight<string>({
    now: () => clock.now,
    onTake: () => {
      clock.takes += 1;
    },
    still: options.still ?? false,
  });
  return { clock, lights };
};

test("a pin outranks the mouse, and the mouse outranks the flyover", () => {
  const { lights } = spotlight();
  lights.play();
  lights.pass("kwadrants");
  assert.equal(lights.lit, "kwadrants");
  lights.recheck("stonksville");
  assert.equal(lights.lit, "stonksville");
  lights.pin("founding");
  assert.equal(lights.lit, "founding");
  lights.pin(null);
  assert.equal(lights.lit, "stonksville");
});

test("the mouse on a building stops the flyover; on open ground it doesn't", () => {
  const { clock, lights } = spotlight();
  lights.play();
  lights.pass("kwadrants");
  lights.hover(null);
  assert.equal(lights.touring, true);
  assert.equal(lights.lit, "kwadrants");
  assert.equal(clock.takes, 0);
  lights.hover("stonksville");
  assert.equal(lights.touring, false);
  assert.equal(lights.lit, "stonksville");
  assert.equal(clock.takes, 1);
});

test("a resting cursor's recheck is no hover", () => {
  assert.equal(isHover("mouse", 0, 0), false);
  assert.equal(isHover("mouse", 1, 0), true);
  assert.equal(isHover("mouse", 0, -2), true);
  // Fingers and pens don't hover the town; they tap it.
  assert.equal(isHover("touch", 4, 4), false);
  assert.equal(isHover("pen", 4, 4), false);
});

test("the town moving under a resting mouse relights it without taking the camera", () => {
  const { clock, lights } = spotlight();
  lights.recheck("founding");
  assert.equal(lights.lit, "founding");
  lights.recheck(null);
  assert.equal(lights.lit, null);
  assert.equal(clock.takes, 0);
});

test("a mouse leaving lets go of its building, unless a press is still down", () => {
  const { lights } = spotlight();
  lights.hover("founding");
  lights.leave(true);
  assert.equal(lights.lit, "founding");
  lights.leave(false);
  assert.equal(lights.lit, null);
});

test("a mouse tap opens at once; a finger shows first and opens on the second tap", () => {
  const { clock, lights } = spotlight();
  assert.equal(lights.tap("founding", "mouse"), "founding");
  assert.equal(lights.tap("kwadrants", "touch"), null);
  assert.equal(lights.lit, "kwadrants");
  assert.equal(lights.tap("kwadrants", "touch"), "kwadrants");
  // A tap on open ground lets the building go.
  assert.equal(lights.tap(null, "touch"), null);
  assert.equal(lights.lit, null);
  assert.equal(clock.takes, 4);
});

test("picking something up stops the flyover and lets go of the building under the hand", () => {
  const { lights } = spotlight();
  lights.play();
  lights.hover("founding");
  lights.play();
  lights.grab();
  assert.equal(lights.touring, false);
  assert.equal(lights.lit, null);
});

test("only arriving on a pin takes the camera", () => {
  const { clock, lights } = spotlight();
  lights.play();
  lights.pin(null);
  assert.equal(lights.touring, true);
  lights.pin("founding");
  assert.equal(lights.touring, false);
  assert.equal(clock.takes, 1);
});

test("the flyover lights only what it passes while it runs", () => {
  const { lights } = spotlight();
  lights.pass("founding");
  assert.equal(lights.lit, null);
  assert.equal(lights.play(), true);
  assert.equal(lights.play(), false);
  lights.pass("founding");
  assert.equal(lights.lit, "founding");
  lights.take();
  assert.equal(lights.lit, null);
});

test("left alone, the flyover comes back, but not over a hover or a press", () => {
  const { clock, lights } = spotlight();
  lights.take();
  clock.now = IDLE_MS - 1;
  assert.equal(lights.idle(false), false);
  clock.now = IDLE_MS + 1;
  assert.equal(lights.idle(false), true);
  // Something held down, or a building under the mouse, keeps the camera.
  assert.equal(lights.idle(true), false);
  lights.recheck("founding");
  assert.equal(lights.idle(false), false);
  lights.leave(false);
  lights.pin("founding");
  lights.pin(null);
  clock.now += IDLE_MS + 1;
  assert.equal(lights.idle(false), true);
  lights.play();
  assert.equal(lights.idle(false), false);
});

test("with reduced motion the flyover never runs", () => {
  const { clock, lights } = spotlight({ still: true });
  assert.equal(lights.play(), false);
  clock.now = IDLE_MS * 2;
  assert.equal(lights.idle(false), false);
});

test("a press that stays put is a tap; one that travels is a drag", () => {
  const presses = createPresses();
  presses.press(1, 100, 100);
  assert.equal(presses.move(1, 103, 104), null);
  assert.equal(presses.release(1, 0), "tap");
  presses.press(1, 100, 100);
  assert.deepEqual(presses.move(1, 106, 100), { dx: 6, dy: 0, kind: "drag", started: true });
  assert.deepEqual(presses.move(1, 110, 98), { dx: 4, dy: -2, kind: "drag", started: false });
  assert.equal(presses.release(1, 0), "drag");
  // A right press that stays put is neither.
  presses.press(1, 100, 100);
  assert.equal(presses.release(1, 2), null);
});

test("a press the browser takes back is never a tap", () => {
  const presses = createPresses();
  presses.press(1, 100, 100);
  presses.cancel(1);
  assert.equal(presses.count, 0);
  assert.equal(presses.release(1, 0), null);
});

test("a release that never pressed on the town is no tap", () => {
  const presses = createPresses();
  assert.equal(presses.release(1, 0), null);
});

test("two fingers pinch, and lifting them is no tap", () => {
  const presses = createPresses();
  presses.press(1, 0, 0);
  presses.press(2, 100, 0);
  assert.deepEqual(presses.move(2, 200, 0), {
    at: { x: 100, y: 0 },
    dx: 50,
    dy: 0,
    kind: "pinch",
    zoom: 2,
  });
  assert.equal(presses.release(1, 0), null);
  assert.equal(presses.release(2, 0), "drag");
  assert.equal(presses.count, 0);
});

test("arrows and WASD pan, plus and minus zoom, other keys leave the view be", () => {
  assert.deepEqual(keyMove("ArrowLeft"), { dx: 60, dy: 0, kind: "pan" });
  assert.deepEqual(keyMove("w"), { dx: 0, dy: 60, kind: "pan" });
  assert.deepEqual(keyMove("="), { factor: 1.25, kind: "zoom" });
  assert.deepEqual(keyMove("-"), { factor: 0.8, kind: "zoom" });
  for (const key of ["Shift", "x", "1", "Tab", "Enter", " "]) {
    assert.equal(keyMove(key), null, key);
  }
});
