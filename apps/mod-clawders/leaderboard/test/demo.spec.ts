import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LOOP_SECONDS, demoAt, formatTokens } from "../src/lib/demo";

describe("demo", () => {
  it("starts idle with nothing on screen", () => {
    const state = demoAt(0);
    assert.equal(state.run.kind, "idle");
    assert.deepEqual(state.lines, []);
    assert.equal(state.spinner, null);
  });

  it("types the first prompt, then runs while Claude works", () => {
    assert.ok(demoAt(2.5).input.length > 0);
    const working = demoAt(1.5 + 2.2 + 4);
    assert.equal(working.run.kind, "live");
    assert.ok(working.spinner && working.spinner.tokens > 0);
    assert.deepEqual(working.lines[0], {
      kind: "prompt",
      text: "add dark mode to the settings page",
    });
  });

  it("keeps the run through a quick next prompt, counting every turn", () => {
    const secondTurn = demoAt(1.5 + 2.2 + 9 + 2.6 + 1);
    assert.equal(secondTurn.run.kind, "live");
    assert.ok(secondTurn.run.kind === "live" && secondTurn.run.tokens >= 1240);
  });

  it("ends the run once Claude stays quiet past the grace", () => {
    const over = demoAt(LOOP_SECONDS - 1);
    assert.equal(over.run.kind, "idle");
    assert.equal(over.run.kind === "idle" && over.run.last?.tokens, 1240 + 960 + 410);
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
