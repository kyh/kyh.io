import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreRows, statusLine, verdictChip, verdictLine } from "../hooks/board";
import { parseGrade } from "../hooks/grade";

const grade = parseGrade(`confidence: 8 | fresh
idiomatic: 6 | foreign pattern
simplicity: 9 | small
scope: 3 | missed a request
risk: low | new file`);

describe("board", () => {
  it("draws the verdict for the band and the pane", () => {
    assert.ok(grade);
    assert.equal(verdictChip("not ready", grade), "● not ready 8·6·9·3");
    assert.equal(verdictLine("fix first", ["idiomatic 6 < 7"]), "● fix first · idiomatic 6 < 7");
    assert.equal(verdictLine("ready", []), "● ready");
  });

  it("colors each score by where it stands", () => {
    assert.ok(grade);
    assert.deepEqual(
      scoreRows(grade).map(({ color, label, score }) => [label, score, color]),
      [
        ["confidence", " 8", "success"],
        ["idiomatic ", " 6", "warning"],
        ["simplicity", " 9", "success"],
        ["scope     ", " 3", "error"],
      ],
    );
    assert.equal(scoreRows(grade)[0]?.bar, "████████░░");
  });

  it("adds the review to the status line", () => {
    assert.equal(statusLine(undefined, { phase: "done", verdict: "ready" }), undefined);
    assert.equal(
      statusLine("verified: test ✓", { phase: "reviewing" }),
      "verified: test ✓ · reviewing…",
    );
    assert.equal(
      statusLine("verified: test ✓", { phase: "done", verdict: "ready" }),
      "verified: test ✓ · ready",
    );
    assert.equal(statusLine("verified: test ✓", { phase: "idle" }), "verified: test ✓");
  });
});
