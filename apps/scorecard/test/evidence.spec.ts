import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  commandsOf,
  ledgerOf,
  ledgerText,
  looksFailed,
  stateOf,
  statusOf,
  usesOf,
} from "../hooks/evidence";
import type { Kind, Ledger, Row, Use } from "../hooks/evidence";

const ROOT = "/repo";

const call = (tool: string, fields: Partial<Use> = {}): Use => ({
  command: "",
  file: "",
  isBackground: false,
  isError: false,
  output: "",
  tool,
  ...fields,
});
const bash = (command: string, fields: Partial<Use> = {}) => call("Bash", { command, ...fields });
const edit = (file: string, fields: Partial<Use> = {}) => call("Edit", { file, ...fields });

const ledger = (...uses: Use[]) => ledgerOf(uses, ROOT);

// What one Bash call shows up as on the ledger: its kinds and whether it
// edits, or "quiet" when it is left off.
const countsAs = (command: string) => {
  const [step] = ledger(bash(command)).steps;
  return step === undefined ? "quiet" : { isEdit: step.isEdit, kinds: step.kinds.join("+") };
};

describe("commandsOf", () => {
  it("splits at operators and keeps quoted words whole", () => {
    assert.deepEqual(commandsOf(`cd "apps/my app" && pnpm test | tail -5; echo 'a && b'`), [
      { op: "&&", words: ["cd", "apps/my app"] },
      { op: "|", words: ["pnpm", "test"] },
      { op: ";", words: ["tail", "-5"] },
      { op: "", words: ["echo", "a && b"] },
    ]);
  });

  it("drops heredoc bodies and stream duplications, and splits off redirections", () => {
    assert.deepEqual(
      commandsOf("cat > src/a.ts <<'EOF'\npnpm test && rm -rf /\nEOF\npnpm lint 2>&1"),
      [
        { op: "\n", words: ["cat", ">", "src/a.ts", "<<", "EOF"] },
        { op: "", words: ["pnpm", "lint"] },
      ],
    );
    assert.deepEqual(commandsOf("pnpm test 2> err.log"), [
      { op: "", words: ["pnpm", "test", ">", "err.log"] },
    ]);
  });

  it("joins continued lines and unescapes double quotes", () => {
    assert.deepEqual(commandsOf('pnpm \\\n  test -- "say \\"hi\\""'), [
      { op: "", words: ["pnpm", "test", "--", 'say "hi"'] },
    ]);
  });
});

describe("what a Bash call counts as", () => {
  it("reads checks through package managers, task runners and wrappers", () => {
    assert.deepEqual(countsAs("pnpm -F @repo/kyh test"), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("pnpm verify"), { isEdit: false, kinds: "static+test" });
    assert.deepEqual(countsAs("npm run typecheck"), { isEdit: false, kinds: "static" });
    assert.deepEqual(countsAs("yarn workspace web build"), { isEdit: false, kinds: "build" });
    assert.deepEqual(countsAs("turbo run lint test --filter=web"), {
      isEdit: false,
      kinds: "static+test",
    });
    assert.deepEqual(countsAs("CI=1 timeout 120 npx vitest run"), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("python -m pytest -x"), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("tsx --test 'test/*.spec.ts'"), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("go test ./..."), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("claude plugin test apps/scorecard"), {
      isEdit: false,
      kinds: "test",
    });
    assert.deepEqual(countsAs(`bash -lc "pnpm test"`), { isEdit: false, kinds: "test" });
  });

  it("counts driving the running app as end to end", () => {
    assert.deepEqual(countsAs("agent-browser open http://localhost:3000"), {
      isEdit: false,
      kinds: "e2e",
    });
    assert.deepEqual(countsAs("curl -s http://127.0.0.1:3000/health"), {
      isEdit: false,
      kinds: "e2e",
    });
    assert.deepEqual(countsAs("npx playwright test"), { isEdit: false, kinds: "e2e" });
    assert.deepEqual(countsAs("curl -s https://example.com"), { isEdit: false, kinds: "" });
    assert.deepEqual(countsAs("npx playwright install"), { isEdit: false, kinds: "" });
  });

  it("finds edits made from the shell, inside the repository only", () => {
    assert.deepEqual(countsAs("sed -i 's/a/b/' src/x.ts"), { isEdit: true, kinds: "" });
    assert.deepEqual(countsAs("cat > src/a.ts <<'EOF'\npnpm test\nEOF"), {
      isEdit: true,
      kinds: "",
    });
    assert.deepEqual(countsAs("echo done >> notes.md"), { isEdit: true, kinds: "" });
    assert.deepEqual(countsAs("git checkout -- src/x.ts"), { isEdit: true, kinds: "" });
    assert.deepEqual(countsAs("git stash"), { isEdit: true, kinds: "" });
    assert.deepEqual(countsAs("pnpm add zod"), { isEdit: true, kinds: "" });
    assert.deepEqual(countsAs("pnpm lint --fix"), { isEdit: true, kinds: "static" });
    assert.deepEqual(countsAs("pnpm format:fix"), { isEdit: true, kinds: "static" });
    assert.deepEqual(countsAs("oxfmt src"), { isEdit: true, kinds: "static" });
    assert.deepEqual(countsAs("oxfmt --check src"), { isEdit: false, kinds: "static" });
    assert.deepEqual(countsAs("echo x > /tmp/out.txt"), "quiet");
    assert.deepEqual(countsAs("cd /tmp && echo x > out.txt"), "quiet");
    assert.deepEqual(countsAs("pnpm test > /tmp/test.log"), { isEdit: false, kinds: "test" });
    assert.deepEqual(countsAs("rm -rf /tmp/scratch"), { isEdit: false, kinds: "" });
    assert.deepEqual(countsAs("git checkout -b feature"), { isEdit: false, kinds: "" });
    assert.deepEqual(countsAs("pnpm install"), { isEdit: false, kinds: "" });
  });

  it("counts an inline script that writes files as an edit", () => {
    const script =
      "python3 - <<'EOF'\np = 'src/a.ts'\nopen(p, 'w').write('x')\nEOF\nnpx tsc --noEmit";
    assert.deepEqual(countsAs(script), { isEdit: true, kinds: "static" });
    assert.deepEqual(countsAs(`node -e "require('fs').writeFileSync('a.json', '{}')"`), {
      isEdit: true,
      kinds: "",
    });
    assert.deepEqual(countsAs(`node -e "process.stdout.write(String(1 + 1))"`), {
      isEdit: false,
      kinds: "",
    });
  });

  it("leaves reads off the ledger", () => {
    for (const command of [
      "git status && git diff",
      "ls -la",
      "sed -n 1,20p src/x.ts",
      "cat a | grep b",
    ]) {
      assert.equal(countsAs(command), "quiet", command);
    }
  });
});

describe("ledgerOf", () => {
  it("records repository edits through tools, and skips the rest", () => {
    const { files, lastEdit, steps } = ledger(
      call("Read", { file: "/repo/a.ts" }),
      edit("/repo/src/a.ts"),
      call("Write", { file: "/tmp/notes.md" }),
      edit("/repo/src/b.ts", { isError: true }),
      call("Write", { file: "/repo/src/a.ts" }),
    );
    assert.deepEqual(files, ["src/a.ts"]);
    assert.equal(lastEdit, 4);
    assert.deepEqual(
      steps.map((step) => step.index),
      [1, 4],
    );
  });

  it("trusts the exit status unless a pipe hides it, then reads the output", () => {
    const failed = { isError: true, output: "Exit code 1\n1 failed" };
    assert.equal(ledger(bash("pnpm test", failed)).steps[0]?.isPassed, false);
    assert.equal(
      ledger(bash("pnpm test | tail", { output: "# fail 2" })).steps[0]?.isPassed,
      false,
    );
    assert.equal(
      ledger(bash("pnpm test || true", { output: "Tests  3 failed" })).steps[0]?.isPassed,
      false,
    );
    assert.equal(ledger(bash("pnpm test | tail", { output: "# fail 0" })).steps[0]?.isPassed, true);
    // Unpiped, a passing run that mentions errors still passes.
    assert.equal(
      ledger(bash("pnpm test", { output: "ok - reports 2 errors" })).steps[0]?.isPassed,
      true,
    );
  });

  it("follows each subagent's calls after the call that started it", () => {
    const rows: Row[] = [
      {
        role: "assistant",
        text: "",
        toolUses: [call("Agent", { agentId: "a1" }), bash("pnpm lint")],
      },
    ];
    const agents = new Map<string, Row[]>([
      ["a1", [{ role: "assistant", text: "", toolUses: [edit("/repo/x.ts")] }]],
    ]);
    assert.deepEqual(
      usesOf(rows, agents).map((use) => use.tool),
      ["Agent", "Edit", "Bash"],
    );
  });
});

describe("freshness", () => {
  const kinds: Kind[] = ["static", "test", "e2e"];
  const states = (sample: Ledger) => kinds.map((kind) => stateOf(sample, kind));

  it("passes a check that ran after the last edit, and stales one before it", () => {
    assert.deepEqual(states(ledger(edit("/repo/a.ts"), bash("pnpm lint"), bash("pnpm test"))), [
      "pass",
      "pass",
      "none",
    ]);
    assert.deepEqual(states(ledger(bash("pnpm lint"), edit("/repo/a.ts"), bash("pnpm test"))), [
      "stale",
      "pass",
      "none",
    ]);
    assert.deepEqual(states(ledger(edit("/repo/a.ts"), bash("pnpm test", { isError: true }))), [
      "none",
      "fail",
      "none",
    ]);
  });

  it("counts a check in the same call as a fix to it", () => {
    assert.equal(stateOf(ledger(edit("/repo/a.ts"), bash("pnpm lint --fix")), "static"), "pass");
  });
});

describe("statusOf", () => {
  it("says nothing before an edit", () => {
    assert.equal(statusOf(ledger(bash("pnpm test"))), undefined);
  });

  it("shows each kind, and build once one ran", () => {
    assert.equal(
      statusOf(ledger(bash("pnpm test"), edit("/repo/a.ts"), bash("pnpm lint"))),
      "verified: static ✓ · test stale · e2e –",
    );
    assert.equal(
      statusOf(ledger(edit("/repo/a.ts"), bash("pnpm build", { isError: true }))),
      "verified: static – · test – · build ✗ · e2e –",
    );
  });
});

describe("ledgerText", () => {
  it("lays out the timeline for the grader, failures with their output", () => {
    const text = ledgerText(
      ledger(
        bash("pnpm test"),
        edit("/repo/src/a.ts"),
        bash("pnpm test", { isError: true, output: "boom\n1 failed" }),
      ),
    );
    assert.match(text, /^1 edit; the last at step 1 of 3 tool calls\./u);
    assert.match(text, /Files edited: src\/a\.ts/u);
    assert.match(text, /0 {2}test pass stale {2}pnpm test/u);
    assert.match(text, /2 {2}test FAIL fresh {2}pnpm test\n {9}\| boom\n {9}\| 1 failed/u);
    assert.match(text, /Now: static none, test fail, build none, e2e none$/u);
  });
});

describe("looksFailed", () => {
  it("reads the failure summaries of common runners", () => {
    for (const output of [
      " 6 pass\n 1 fail\nRan 7 tests across 1 file.",
      "src/a.ts:3:7: error eslint(no-unused-vars): x is unused",
      "error[E0308]: mismatched types",
      "Tests  1 failed | 4 passed",
      "error TS2322: no",
      "--- FAIL: TestX",
      "ELIFECYCLE  Command failed",
    ]) {
      assert.equal(looksFailed(output), true, output);
    }
    for (const output of ["# pass 3\n# fail 0", "Found 0 errors", "all good"]) {
      assert.equal(looksFailed(output), false, output);
    }
  });
});
