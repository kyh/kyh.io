import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SYSTEM } from "../hooks/grade";
import type { Look } from "../hooks/look";
import { LOOK_SYSTEM, reviewChange } from "../hooks/review";
import type { Answer, Ports } from "../hooks/review";

const SCORECARD = `confidence: 8 | tests fresh
idiomatic: 8 | follows src/a.ts
simplicity: 9 | small
scope: 9 | as asked
risk: low | new file
fix: export it like the others | src/index.ts:3`;

const MODELS = { lookModel: "sonnet", model: "opus" };

// Ports that answer the looker from `looks` in turn and the judge with
// `judge`, recording every call.
const portsOf = (looks: readonly Answer[], judge?: Answer) => {
  const calls: { model: string; system: string; prompt: string }[] = [];
  const read: Look[] = [];
  let looked = 0;
  const ports: Ports = {
    complete: (request) => {
      calls.push(request);
      if (request.system === SYSTEM) {
        return Promise.resolve(judge ?? { text: SCORECARD });
      }
      looked += 1;
      return Promise.resolve(looks[looked - 1] ?? { text: "done" });
    },
    look: (look) => {
      read.push(look);
      return Promise.resolve(`(${look.target})`);
    },
  };
  return { calls, ports, read };
};

describe("reviewChange", () => {
  it("looks on the cheaper model, then judges on the main one with what was read", async () => {
    const { calls, ports, read } = portsOf([{ text: "read: src/a.ts\ngrep: export in src" }]);
    const reviewed = await reviewChange(ports, MODELS, "<packet>");
    assert.ok("grade" in reviewed);
    assert.equal(reviewed.grade.fixes[0]?.source, "src/index.ts:3");
    assert.deepEqual(
      calls.map(({ model, system }) => [model, system === LOOK_SYSTEM ? "look" : "judge"]),
      [
        ["sonnet", "look"],
        ["sonnet", "look"],
        ["opus", "judge"],
      ],
    );
    assert.deepEqual(
      read.map((look) => look.target),
      ["src/a.ts", "export"],
    );
    assert.match(
      calls[2]?.prompt ?? "",
      /^<packet>\n\n<looked round="1">\n--- read: src\/a\.ts\n\(src\/a\.ts\)/u,
    );
  });

  it("stops looking after three rounds", async () => {
    const look = { text: "read: src/a.ts" };
    const { calls, ports, read } = portsOf([look, look, look, look, look]);
    await reviewChange(ports, MODELS, "<packet>");
    assert.equal(read.length, 3);
    assert.equal(calls.length, 4);
  });

  it("judges without reading when looking fails", async () => {
    const { calls, ports } = portsOf([{ error: "overloaded" }]);
    const reviewed = await reviewChange(ports, MODELS, "<packet>");
    assert.ok("grade" in reviewed);
    assert.equal(calls.at(-1)?.prompt, "<packet>");
  });

  it("fails when the judge does", async () => {
    assert.deepEqual(await reviewChange(portsOf([], { error: "no answer" }).ports, MODELS, "p"), {
      error: "no answer",
    });
    const offFormat = await reviewChange(portsOf([], { text: "Looks good!" }).ports, MODELS, "p");
    assert.deepEqual(offFormat, {
      error: "opus's answer did not fit the scorecard:\n\nLooks good!",
    });
  });
});
