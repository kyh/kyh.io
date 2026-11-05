import assert from "node:assert/strict";
import test from "node:test";

import type { Creature, Pose } from "./follower/creature";
import type { Point } from "./follower/walk";
import { reindeer } from "./christmas/reindeer";
import { bunny } from "./easter/bunny";
import { ghost } from "./halloween/ghost";
import { dragon } from "./lunar-new-year/dragon";
import { leprechaun } from "./st-patricks/leprechaun";
import { turkey } from "./thanksgiving/turkey";
import { lovebird } from "./valentines/lovebird";

/** A session: the mouse wandering, darting, doubling back, then a click on it, then left be a minute. */
const session = <State>(creature: Creature<State>, check: (pose: Pose, pointer: Point) => void) => {
  let pointer = { x: 400, y: 300 };
  const state = creature.create(pointer);
  let said = new Set<string>();
  const frame = (by: Point, seconds = 1 / 60) => {
    pointer = { x: pointer.x + by.x, y: pointer.y + by.y };
    creature.step(state, pointer, by, seconds);
    const pose = creature.pose(state);
    if (pose.say !== null) {
      said.add(pose.say);
    }
    check(pose, pointer);
  };
  const moves: [Point, number][] = [
    [{ x: 4, y: 1 }, 1],
    [{ x: -14, y: 0 }, 0.6],
    [{ x: 0, y: -9 }, 0.5],
    [{ x: 25, y: 18 }, 0.4],
  ];
  for (const [by, seconds] of moves) {
    for (let at = 0; at < seconds * 60; at += 1) {
      frame(by);
    }
  }
  // Clicked on, it answers at once.
  said = new Set();
  creature.poke(state, creature.pose(state).at);
  frame({ x: 0, y: 0 });
  const answered = said;
  // A slow frame, then left be a minute.
  said = new Set();
  frame({ x: 0, y: 0 }, 2);
  for (let at = 0; at < 60 * 60; at += 1) {
    frame({ x: 0, y: 0 });
  }
  return { answered, idle: said };
};

const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/gu;

const sweep = <State>(name: string, creature: Creature<State>) => {
  test(`the ${name} stays with the mouse, posed in numbers, and has its say`, () => {
    let parts = 0;
    let last = 0;
    const { answered, idle } = session(creature, (pose, pointer) => {
      assert.ok(Number.isFinite(pose.at.x) && Number.isFinite(pose.at.y), name);
      last = Math.hypot(pose.at.x - pointer.x, pose.at.y - pointer.y);
      parts = Object.keys(pose.parts).length;
      for (const [part, { d, transform, opacity }] of Object.entries(pose.parts)) {
        const drawn = `${d ?? ""} ${transform ?? ""}`;
        assert.ok(!/NaN|Infinity|undefined/u.test(drawn), `${name} ${part}: ${drawn}`);
        for (const [n] of drawn.matchAll(NUMBER)) {
          assert.ok(Math.abs(Number(n)) < 1000, `${name} ${part}: ${n}`);
        }
        assert.ok(opacity === undefined || (opacity >= 0 && opacity <= 1), `${name} ${part}`);
      }
    });
    assert.ok(parts > 0, name);
    // Caught up and settled by the pointer once it's left be.
    assert.ok(last < 100, `${name}: ${last}`);
    assert.equal(answered.size, 1, name);
    // Left be a minute, it pipes up unprompted, more than once and not always the same.
    assert.ok(idle.size >= 2, `${name}: ${[...idle].join(", ")}`);
  });
};

// Every theme's follower, by the pure creature its `follower.tsx` draws.
sweep("bunny", bunny);
sweep("dragon", dragon);
sweep("ghost", ghost);
sweep("leprechaun", leprechaun);
sweep("lovebird", lovebird);
sweep("reindeer", reindeer);
sweep("turkey", turkey);
