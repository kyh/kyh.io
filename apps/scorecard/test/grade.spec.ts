import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ledgerOf } from "../hooks/evidence";
import type { Row } from "../hooks/evidence";
import {
  asksOf,
  fitPatch,
  parseGrade,
  promptOf,
  replyOf,
  scorecardOf,
  verdictOf,
} from "../hooks/grade";
import type { Grade } from "../hooks/grade";

const ANSWER = `confidence: 6 | tests ran before the last two edits
idiomatic: 8 | follows the subway-narrator layout
simplicity: 7 | evidence.ts packs the shell parser and the ledger together
scope: 9 | both asks done
risk: medium | touches the shared lint config
fix: rerun pnpm test after the last edit
fix: split the shell parser out of evidence.ts`;

const grade = (
  scores: [number, number, number, number],
  level: Grade["risk"]["level"] = "low",
): Grade => {
  const [confidence, idiomatic, simplicity, scope] = scores;
  return {
    fixes: [],
    risk: { level, why: "" },
    scores: {
      confidence: { score: confidence, why: "" },
      idiomatic: { score: idiomatic, why: "" },
      scope: { score: scope, why: "" },
      simplicity: { score: simplicity, why: "" },
    },
  };
};

describe("parseGrade", () => {
  it("reads one line per dimension, then the fixes", () => {
    assert.deepEqual(parseGrade(ANSWER), {
      fixes: ["rerun pnpm test after the last edit", "split the shell parser out of evidence.ts"],
      risk: { level: "medium", why: "touches the shared lint config" },
      scores: {
        confidence: { score: 6, why: "tests ran before the last two edits" },
        idiomatic: { score: 8, why: "follows the subway-narrator layout" },
        scope: { score: 9, why: "both asks done" },
        simplicity: { score: 7, why: "evidence.ts packs the shell parser and the ledger together" },
      },
    });
  });

  it("tolerates markdown, a /10 and other separators", () => {
    const parsed = parseGrade(
      "Here you go:\n- **Confidence**: 7/10 — fresh tests\n- idiomatic: 8 - ok\n- simplicity: 12 : long\n- scope: 9\n- Risk: HIGH — migration",
    );
    assert.equal(parsed?.scores.confidence.score, 7);
    assert.equal(parsed?.scores.confidence.why, "fresh tests");
    assert.equal(parsed?.scores.simplicity.score, 10);
    assert.equal(parsed?.scores.scope.why, "");
    assert.deepEqual(parsed?.risk, { level: "high", why: "migration" });
  });

  it("refuses an answer missing a dimension, and keeps three fixes", () => {
    assert.equal(parseGrade(ANSWER.replace(/^scope.*$/mu, "")), undefined);
    assert.equal(parseGrade(ANSWER.replace("risk: medium", "risk: severe")), undefined);
    assert.equal(parseGrade(`${ANSWER}\nfix: a\nfix: b`)?.fixes.length, 3);
    assert.deepEqual(parseGrade(ANSWER.replaceAll(/^fix: .*$/gmu, "fix: none"))?.fixes, []);
  });
});

describe("verdictOf", () => {
  it("is ready when every score clears its bar", () => {
    assert.deepEqual(verdictOf(grade([7, 8, 7, 9])), { reasons: [], verdict: "ready" });
  });

  it("raises the bar for confidence with the risk", () => {
    assert.deepEqual(verdictOf(grade([8, 8, 8, 8], "high")), {
      reasons: ["confidence 8 < 9 for high risk"],
      verdict: "fix first",
    });
    assert.equal(verdictOf(grade([8, 8, 8, 8], "medium")).verdict, "ready");
  });

  it("is not ready when any score is low", () => {
    assert.equal(verdictOf(grade([9, 9, 4, 9])).verdict, "not ready");
  });
});

describe("scorecardOf", () => {
  it("draws the verdict, a row per dimension, the fixes and the footer", () => {
    const parsed = parseGrade(ANSWER.replace("both asks done", "a | b"));
    assert.ok(parsed);
    const card = scorecardOf(parsed, "verified: static ✓");
    assert.match(card, /^\*\*fix first\*\* · confidence 6 < 8 for medium risk\n/u);
    assert.match(
      card,
      /\| confidence \| `██████░░░░` 6 \| tests ran before the last two edits \|/u,
    );
    assert.match(card, /\| scope \| `█████████░` 9 \| a \\\| b \|/u);
    assert.match(card, /\| risk \| medium \| touches the shared lint config \|/u);
    assert.match(card, /\*\*Fixes\*\*\n1\. rerun pnpm test after the last edit\n2\. split/u);
    assert.match(card, /\n\nverified: static ✓$/u);
  });
});

describe("what the grader reads", () => {
  const rows: Row[] = [
    {
      role: "user",
      text: "<system-reminder>be nice</system-reminder>Add a /health route",
      toolUses: [],
    },
    { role: "user", text: "<command-name>/score</command-name>", toolUses: [] },
    { role: "user", text: "Base directory for this skill: /skills/x\n\nDo things.", toolUses: [] },
    { role: "assistant", text: "Added it. Tests pass.", toolUses: [] },
    { role: "assistant", text: "  ", toolUses: [] },
  ];

  it("takes the person's requests and the agent's last reply", () => {
    assert.deepEqual(asksOf(rows), ["Add a /health route"]);
    assert.equal(replyOf(rows), "Added it. Tests pass.");
  });

  it("wraps each part in its own tag", () => {
    const prompt = promptOf({
      asks: asksOf(rows),
      diff: {
        against: "origin/main",
        base: "abc",
        patch: "diff --git a/x b/x\n+1\n",
        stat: " x | 1 +",
      },
      instructions: [{ content: "Use pnpm.", path: "CLAUDE.md" }],
      ledger: ledgerOf([], "/repo"),
      reply: replyOf(rows),
    });
    assert.match(prompt, /<requests>\n1\. Add a \/health route\n<\/requests>/u);
    assert.match(prompt, /<reply>\nAdded it\. Tests pass\.\n<\/reply>/u);
    assert.match(prompt, /<ledger>\nNo edits through tools in 0 tool calls\./u);
    assert.match(
      prompt,
      /<diff against="origin\/main">\n x \| 1 \+\n\ndiff --git a\/x b\/x\n\+1\n\n<\/diff>/u,
    );
    assert.match(prompt, /<instructions>\n--- CLAUDE\.md\nUse pnpm\.\n<\/instructions>$/u);
  });
});

const fileDiff = (name: string, size: number) =>
  `diff --git a/${name} b/${name}\n${"x".repeat(size)}\n`;

describe("fitPatch", () => {
  it("keeps small files whole and cuts the large ones to what is left", () => {
    const patch = fileDiff("small", 100) + fileDiff("generated", 10_000) + fileDiff("medium", 400);
    const fitted = fitPatch(patch, 2000);
    assert.ok(fitted.includes(fileDiff("small", 100)));
    assert.ok(fitted.includes(fileDiff("medium", 400)));
    assert.match(
      fitted,
      /diff --git a\/generated b\/generated\nx+\n\[… \d+ more characters of this file cut\]/u,
    );
    assert.ok(fitted.length < 2200);
  });

  it("leaves a patch within budget alone", () => {
    const patch = fileDiff("a", 10) + fileDiff("b", 10);
    assert.equal(fitPatch(patch, 1000), patch);
  });
});
