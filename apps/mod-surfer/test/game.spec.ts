import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RAMP_LENGTH, RUNNER_D, TRAIN_LENGTH, newGame, step } from "../hooks/game";

describe("runner", () => {
  it("the autopilot survives a long run and collects coins", () => {
    for (const seed of [3, 7, 42]) {
      const game = newGame(seed);
      let crashes = 0;
      for (let i = 0; i < 3000; i += 1) {
        const before = game.crash;
        step(game, 0.066);
        if (game.crash > before) {
          crashes += 1;
        }
      }
      assert.ok(game.score > 1000);
      assert.ok(game.coins > 0);
      assert.ok(crashes < 5, `seed ${seed} crashed ${crashes} times`);
      assert.equal(game.crashes, crashes);
      assert.ok(game.jumps > 0 && game.landings >= game.jumps);
    }
  });

  it("a train alongside keeps its lane shut until its tail passes", () => {
    const game = newGame();
    game.nextSpawn = Number.POSITIVE_INFINITY;
    game.things.push({ color: 0, d: RUNNER_D - 1, hasRamp: false, kind: "train", lane: 0 });
    for (let i = 0; i < 5; i += 1) {
      step(game, 0.01);
      assert.notEqual(game.lane, 0);
    }
    assert.equal(game.crash, 0);
  });

  it("drops a train once all of it is behind the runner", () => {
    const game = newGame();
    game.nextSpawn = Number.POSITIVE_INFINITY;
    game.lane = 2;
    game.x = 2;
    const train = { color: 0, d: -0.5, hasRamp: false, kind: "train" as const, lane: 0 };
    game.things.push(train);
    step(game, 0.01);
    assert.ok(game.things.includes(train));
    train.d = -TRAIN_LENGTH - 0.9;
    step(game, 0.05);
    assert.ok(!game.things.includes(train));
  });

  it("runs up a ramp, along the roof, and drops off the end", () => {
    const game = newGame();
    game.nextSpawn = Number.POSITIVE_INFINITY;
    game.things.push({
      color: 0,
      d: RUNNER_D + RAMP_LENGTH + 1,
      hasRamp: true,
      kind: "train",
      lane: 1,
    });
    let highest = 0;
    for (let i = 0; i < 40; i += 1) {
      step(game, 0.033);
      highest = Math.max(highest, game.roof);
    }
    assert.equal(game.crash, 0);
    assert.equal(highest, 1);
    for (let i = 0; i < 60; i += 1) {
      step(game, 0.033);
    }
    assert.equal(game.roof, 0);
  });

  it("a train's side is a wall, not a way up", () => {
    const game = newGame();
    game.nextSpawn = Number.POSITIVE_INFINITY;
    game.lane = 0;
    game.things.push({ color: 0, d: RUNNER_D - 1, hasRamp: false, kind: "train", lane: 1 });
    step(game, 0.01);
    assert.equal(game.roof, 0);
    assert.ok(game.crash > 0);
  });
});
