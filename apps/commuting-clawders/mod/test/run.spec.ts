import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GRACE_MS,
  addTokens,
  endTurn,
  idle,
  rankOf,
  resultOf,
  startTurn,
  statusOf,
} from "../hooks/run";

describe("run", () => {
  it("counts tokens only while a run is on", () => {
    assert.deepEqual(addTokens(idle, 50), idle);
    const live = addTokens(addTokens(startTurn(idle, 1000), 300), 200);
    assert.deepEqual(live, { kind: "live", startedAt: 1000, tokens: 500 });
  });

  it("is over only once the grace has passed", () => {
    const ending = endTurn(addTokens(startTurn(idle, 0), 900), 60_000);
    assert.equal(resultOf(ending, 60_000 + GRACE_MS - 1, 4), null);
    assert.deepEqual(resultOf(ending, 60_000 + GRACE_MS, 4), {
      coins: 4,
      seconds: 60,
      tokens: 900,
    });
  });

  it("goes on when a prompt comes within the grace", () => {
    const ending = endTurn(addTokens(startTurn(idle, 0), 900), 10_000);
    const resumed = startTurn(ending, 12_000);
    assert.deepEqual(resumed, { kind: "live", startedAt: 0, tokens: 900 });
    assert.equal(resultOf(resumed, 10_000 + GRACE_MS, 0), null);
  });

  it("starts afresh after a run is over", () => {
    const over = { kind: "idle", last: { coins: 1, rank: 2, seconds: 3, tokens: 4 } } as const;
    assert.deepEqual(startTurn(over, 50), { kind: "live", startedAt: 50, tokens: 0 });
  });

  it("reads the leaderboard's rank", () => {
    assert.equal(rankOf('{"rank":3}'), 3);
    assert.equal(rankOf('{"error":"bad"}'), null);
    assert.equal(rankOf('{"rank":0}'), null);
  });

  it("says where the run stands", () => {
    assert.equal(
      statusOf(addTokens(startTurn(idle, 0), 12_345), 7),
      "● LIVE · 12,345 tokens · ● 7",
    );
    assert.match(statusOf(endTurn(startTurn(idle, 0), 0), 0), /^◐ prompt within 5s/u);
    assert.equal(
      statusOf({ kind: "idle", last: { coins: 0, rank: 2, seconds: 9, tokens: 80 } }, 0),
      "○ idle · last run 80 tokens · #2 on the leaderboard",
    );
    assert.equal(
      statusOf(idle, 0, "posting as kai to clawders.kyh.io"),
      "○ idle · a run starts with your next prompt · posting as kai to clawders.kyh.io",
    );
    assert.equal(statusOf(startTurn(idle, 0), 0, "runs stay local"), "● LIVE · 0 tokens · ● 0");
  });
});
