import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDuration } from "../src/lib/format";
import { runSchema } from "../src/lib/runs";

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
    assert.equal(formatDuration(9), "9s");
    assert.equal(formatDuration(65), "1m 05s");
    assert.equal(formatDuration(3725), "1h 02m");
  });
});
