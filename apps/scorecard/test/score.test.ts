// Run by `claude plugin test` against the engine itself: the mod's hooks with
// the transcript, git, the instruction files and the grader answered beneath.
import type { CommandRunInput, ModelCompleteRequest, On, SessionMessage } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

const ROOT = "/repo";

const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Add a health check and test it", toolUses: [] },
  {
    role: "assistant",
    text: "",
    toolUses: [
      {
        input: { content: "export const health = () => 'ok';\n", file_path: "/repo/src/health.ts" },
        text: "File created",
        tool: "Write",
        tool_use_id: "t1",
      },
      {
        input: { command: "pnpm test" },
        text: "# pass 1\n# fail 0",
        tool: "Bash",
        tool_use_id: "t2",
      },
    ],
  },
  { role: "assistant", text: "Added src/health.ts; tests pass.", toolUses: [] },
];

const DIFF = [
  "abc1234def",
  "origin/main",
  " src/health.ts | 1 +",
  " 1 file changed, 1 insertion(+)",
  "",
  "diff --git a/src/health.ts b/src/health.ts",
  "+export const health = () => 'ok';",
].join("\n");

const ANSWER = `confidence: 7 | pnpm test passed after the last edit; nothing ran the route
idiomatic: 8 | matches src/ layout
simplicity: 9 | one function
scope: 9 | the check and its test
risk: low | a new file
fix: curl /health on a running server`;

// /score as the person types it.
const SCORE: CommandRunInput = {
  args: "",
  command: "score",
  origin: { kind: "composer" },
  presentation: { columns: 120, isFullscreen: true },
};

const USAGE = {
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  input_tokens: 10,
  output_tokens: 10,
};

const ran = (stdout: string, exitCode = 0) => ({
  value: { exitCode, isStderrTruncated: false, isStdoutTruncated: false, stderr: "", stdout },
});

// The world beneath the mod; `diff` is what the git script prints.
const world = (on: On, { answer = ANSWER, diff = DIFF, diffExit = 0 } = {}) => {
  const asked: ModelCompleteRequest[] = [];
  const statuses: (string | undefined)[] = [];
  on("session.messages", () => ({ value: MESSAGES }));
  on("session.root", () => ({ value: ROOT }));
  on("process.run", (_$, e) => (e.argv[0] === "git" ? ran(`${ROOT}\n`) : ran(diff, diffExit)));
  on("fs.ancestors", (_$, e) => ({
    value:
      e.of === undefined ? [{ content: "Use pnpm.", dir: ROOT, name: "CLAUDE.md", parts: [] }] : [],
  }));
  on("model.complete", (_$, e) => {
    asked.push(e);
    return { value: { isAnswered: true, text: answer, usage: USAGE } };
  });
  on("ui.status", (_$, e) => {
    statuses.push(e.text);
    return { value: undefined };
  });
  return { asked, statuses };
};

test("/score grades the session and answers with the scorecard", async ($, on) => {
  const { asked, statuses } = world(on);
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("**ready**");
  expect(text).toContain(
    "| confidence | `███████░░░` 7 | pnpm test passed after the last edit; nothing ran the route |",
  );
  expect(text).toContain("1. curl /health on a running server");
  expect(text).toContain(
    "verified: static – · test ✓ · e2e – · against origin/main (abc1234) · graded by opus",
  );
  expect(exitCode).toBe(0);
  expect(asked.length).toBe(1);
  expect(asked[0]?.model).toBe("opus");
  expect(asked[0]?.system).toContain("You review a coding agent's work before it merges.");
  expect(asked[0]?.prompt).toContain("1. Add a health check and test it");
  expect(asked[0]?.prompt).toContain("<reply>\nAdded src/health.ts; tests pass.\n</reply>");
  expect(asked[0]?.prompt).toContain("1  test pass fresh  pnpm test");
  expect(asked[0]?.prompt).toContain("--- CLAUDE.md\nUse pnpm.");
  expect(statuses).toEqual(["scoring with opus…", "verified: static – · test ✓ · e2e –"]);
});

test("/score asks the model the config names", { options: { model: "sonnet" } }, async ($, on) => {
  const { asked } = world(on);
  await $.command.run(SCORE);
  expect(asked[0]?.model).toBe("sonnet");
});

test("/score exits 1 when the work is not ready", async ($, on) => {
  world(on, { answer: ANSWER.replace("confidence: 7", "confidence: 3") });
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("**not ready** · confidence 3 < 7 for low risk");
  expect(exitCode).toBe(1);
});

test("/score shows an answer it cannot read instead of a scorecard", async ($, on) => {
  world(on, { answer: "Looks good to me!" });
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("opus's answer did not fit the scorecard:\n\nLooks good to me!");
  expect(exitCode).toBe(undefined);
});

test("/score has nothing to grade without changes, and asks no model", async ($, on) => {
  const { asked } = world(on, { diff: "abc1234def\norigin/main\n" });
  const { text } = await $.command.run(SCORE);
  expect(text).toBe(
    "Nothing to score: no changes against origin/main. To compare with another commit: /score <ref>",
  );
  expect(asked.length).toBe(0);
});

test("/score says why it cannot read a change", async ($, on) => {
  world(on, { diffExit: 3 });
  const { text } = await $.command.run(SCORE);
  expect(text).toBe("Needs a git repository to read the change from.");
});

test("the session registers /score and shows what is verified", async ($, on) => {
  const clock = mock.clock(on);
  const { statuses } = world(on);
  const registered: string[] = [];
  on("command.register", (_$, e) => {
    registered.push(e.name);
    return { value: { command: e.name } };
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  await $.session.start({ cwd: ROOT, isInteractive: true, surface: "terminal" });
  await clock.advance(1);
  expect(registered).toEqual(["score"]);
  expect(statuses).toEqual(["verified: static – · test ✓ · e2e –"]);
});
