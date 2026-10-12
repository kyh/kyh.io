import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { duration, renderLeaderboard } from "../src/page";
import { runSchema } from "../src/runs";

const run = { coins: 12, name: "kai", seconds: 90, tokens: 4200 };

describe("leaderboard", () => {
  it("the run schema takes a well-formed run", () => {
    assert.deepEqual(runSchema.parse(run), run);
  });

  it("the run schema trims the name and strips control characters", () => {
    assert.equal(runSchema.parse({ ...run, name: "  k\u0007ai\n " }).name, "kai");
  });

  it("the run schema refuses what it cannot rank", () => {
    for (const body of [
      null,
      "run",
      { ...run, name: "" },
      { ...run, name: "x".repeat(33) },
      { ...run, tokens: 0 },
      { ...run, tokens: -1 },
      { ...run, tokens: 1.5 },
      { ...run, tokens: "4200" },
      { ...run, coins: Number.NaN },
      { coins: 1, name: "kai", tokens: 10 },
    ]) {
      assert.equal(runSchema.safeParse(body).success, false, JSON.stringify(body));
    }
  });

  it("duration reads as the largest two units", () => {
    assert.equal(duration(9), "9s");
    assert.equal(duration(65), "1m 05s");
    assert.equal(duration(3725), "1h 02m");
  });

  it("renderLeaderboard escapes names and ranks in order", () => {
    const html = renderLeaderboard([
      { ...run, endedAt: 0, name: "<b>me</b>", tokens: 9000 },
      { ...run, endedAt: 0, name: "you" },
    ]);
    assert.ok(html.includes("&lt;b&gt;me&lt;/b&gt;"));
    assert.ok(html.indexOf("9,000") < html.indexOf("4,200"));
  });

  it("renderLeaderboard says when there are no runs", () => {
    assert.ok(renderLeaderboard([]).includes("No runs yet."));
  });
});
