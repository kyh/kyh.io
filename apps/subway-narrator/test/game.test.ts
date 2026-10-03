import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { draw, encode, newGame, step } from "../hooks/game";

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
    }
  });

  it("draws printable cells that encode to the raster size", () => {
    const game = newGame();
    for (let i = 0; i < 100; i += 1) {
      step(game, 0.066);
    }
    const cells = draw(game, 40, 12);
    assert.equal(cells.length, 40 * 12 * 3);
    for (let i = 0; i < cells.length; i += 3) {
      assert.ok((cells[i] ?? 0) > 31);
    }
    assert.equal(encode(cells), Buffer.from(cells.buffer).toString("base64"));
  });
});
