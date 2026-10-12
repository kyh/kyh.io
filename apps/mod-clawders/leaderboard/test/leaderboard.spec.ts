import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDuration } from "../src/lib/format";
import { posterOf } from "../src/lib/poster";
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

  it("refuses more tokens than a run that long could write", () => {
    assert.equal(runSchema.safeParse({ ...run, seconds: 10, tokens: 9000 }).success, true);
    assert.equal(runSchema.safeParse({ ...run, seconds: 10, tokens: 9001 }).success, false);
  });

  it("knows a poster by a daily hash of their IP, never the IP", () => {
    const day = new Date("2026-10-12T10:00:00Z");
    const one = posterOf(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), day);
    assert.equal(one, posterOf(new Headers({ "x-real-ip": "203.0.113.7" }), day));
    assert.notEqual(
      one,
      posterOf(new Headers({ "x-real-ip": "203.0.113.7" }), new Date("2026-10-13")),
    );
    assert.ok(!one.includes("203.0.113.7"));
  });

  it("duration reads as the largest two units", () => {
    assert.equal(formatDuration(9), "9s");
    assert.equal(formatDuration(65), "1m 05s");
    assert.equal(formatDuration(3725), "1h 02m");
  });
});
