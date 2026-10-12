import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BEATS, LOOP_SECONDS, demoAt, formatTokens } from "../src/lib/demo";

// When each beat starts, in seconds into the loop.
const starts: number[] = [];
let at = 1.5;
let totalTokens = 0;
for (const beat of BEATS) {
  starts.push(at);
  at += beat.seconds;
  totalTokens += beat.kind === "work" ? beat.tokens : 0;
}
const firstWork = BEATS.findIndex((beat) => beat.kind === "work");
const secondWork = BEATS.findIndex((beat, index) => index > firstWork && beat.kind === "work");
const firstTokens = BEATS.find((beat) => beat.kind === "work")?.tokens ?? 0;

describe("demo", () => {
  it("starts idle with nothing on screen", () => {
    const state = demoAt(0);
    assert.equal(state.run.kind, "idle");
    assert.deepEqual(state.lines, []);
    assert.equal(state.spinner, null);
  });

  it("types the first prompt, then runs while Claude works", () => {
    assert.ok(demoAt((starts[0] ?? 0) + 1).input.length > 0);
    const working = demoAt((starts[firstWork] ?? 0) + 4);
    assert.equal(working.run.kind, "live");
    assert.ok(working.spinner && working.spinner.tokens > 0);
    assert.equal(working.lines[0]?.kind, "prompt");
  });

  it("keeps the run through a quick next prompt, counting every turn", () => {
    const secondTurn = demoAt((starts[secondWork] ?? 0) + 1);
    assert.equal(secondTurn.run.kind, "live");
    assert.ok(secondTurn.run.kind === "live" && secondTurn.run.tokens >= firstTokens);
  });

  it("ends the run once Claude stays quiet past the grace", () => {
    const over = demoAt(LOOP_SECONDS - 1);
    assert.equal(over.run.kind, "idle");
    assert.equal(over.run.kind === "idle" && over.run.last?.tokens, totalTokens);
    assert.equal(over.lines.at(-1)?.kind, "note");
  });

  it("loops", () => {
    assert.deepEqual(demoAt(LOOP_SECONDS + 0.5), demoAt(0.5));
  });

  it("counts tokens as the spinner does", () => {
    assert.equal(formatTokens(980), "980");
    assert.equal(formatTokens(1940), "1.9k");
  });
});
