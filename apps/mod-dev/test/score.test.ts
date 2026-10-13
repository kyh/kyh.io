// Run by `claude plugin test` against the engine itself: the mod's hooks with
// the transcript, git, the repository's files and the reviewer answered
// beneath.
import type { CommandRunInput, ModelCompleteRequest, On, SessionMessage } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

const ROOT = "/repo";

const WRITE = {
  input: { content: "export const health = () => 'ok';\n", file_path: "/repo/src/health.ts" },
  text: "File created",
  tool: "Write",
  tool_use_id: "t1",
};
const TEST = {
  input: { command: "pnpm test" },
  text: "# pass 1\n# fail 0",
  tool: "Bash",
  tool_use_id: "t2",
};

const messages = (reply: string): SessionMessage[] => [
  { role: "user", text: "Add a health check and test it", toolUses: [] },
  { role: "assistant", text: "", toolUses: [WRITE, TEST] },
  { role: "assistant", text: reply, toolUses: [] },
];

const REPLY = "Added src/health.ts after src/version.ts; tests pass.";

const DIFF = [
  "abc1234def",
  "origin/main",
  " src/health.ts | 1 +",
  " 1 file changed, 1 insertion(+)",
  "",
  "diff --git a/src/health.ts b/src/health.ts",
  "+export const health = () => 'ok';",
].join("\n");

const ANSWER = `confidence: 8 | pnpm test passed after the last edit
idiomatic: 8 | matches src/version.ts
simplicity: 9 | one function
scope: 9 | the check and its test
risk: low | a new file
fix: export it from src/index.ts like the others | src/index.ts:3
fix: make it nicer | taste`;

const NOT_READY = `${ANSWER.replace("idiomatic: 8", "idiomatic: 6")}\nfix: tighten the name | src/index.ts:3`;

// The root package: tests, no typecheck, and a dev server when `isApp`.
const packageJson = (isApp: boolean) =>
  JSON.stringify({
    name: "app",
    packageManager: "pnpm@10.0.0",
    scripts: isApp ? { dev: "next dev", test: "vitest" } : { test: "vitest" },
  });

const FILES = new Map([[`${ROOT}/src/version.ts`, "export const version = () => '1';\n"]]);

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

interface World {
  // The judge's answers in order, the last one repeated.
  answers?: readonly string[];
  // The looker's answers in order, then "done".
  looks?: readonly string[];
  diff?: string;
  diffExit?: number;
  isApp?: boolean;
  reply?: string;
}

// The world beneath the mod: the transcript, git, the root package.json and
// one source file, the reviewer, and the tools a push would run.
const world = (
  on: On,
  {
    answers = [ANSWER],
    diff = DIFF,
    diffExit = 0,
    isApp = false,
    looks = [],
    reply = REPLY,
  }: World = {},
) => {
  // What the judge and the looker were asked.
  const asked: ModelCompleteRequest[] = [];
  const looked: ModelCompleteRequest[] = [];
  const read: string[] = [];
  const shipped: string[] = [];
  const statuses: (string | undefined)[] = [];
  const toasts: string[] = [];
  on("session.messages", () => ({ value: messages(reply) }));
  on("session.root", () => ({ value: ROOT }));
  on("process.run", (_$, e) => {
    if (e.argv[1] === "grep") {
      return ran("src/version.ts:1:export const version = () => '1';\n");
    }
    return e.argv[0] === "git" ? ran(`${ROOT}\n`) : ran(diff, diffExit);
  });
  // Elsewhere, an empty read stands for no file.
  on("fs.read", (_$, e) => {
    read.push(e.path);
    const text = e.path === `${ROOT}/package.json` ? packageJson(isApp) : FILES.get(e.path);
    return { value: text ?? "" };
  });
  on("fs.ancestors", (_$, e) => ({
    value:
      e.of === undefined ? [{ content: "Use pnpm.", dir: ROOT, name: "CLAUDE.md", parts: [] }] : [],
  }));
  on("model.complete", (_$, e) => {
    if (String(e.system).startsWith("You prepare a code review.")) {
      const text = looks[looked.length] ?? "done";
      looked.push(e);
      return { value: { isAnswered: true, text, usage: USAGE } };
    }
    const text = answers[Math.min(asked.length, answers.length - 1)] ?? "";
    asked.push(e);
    return { value: { isAnswered: true, text, usage: USAGE } };
  });
  on("tool.call", (_$, e) => {
    shipped.push(e.tool === "Bash" ? e.command : e.tool);
    return { result: {}, text: "" };
  });
  on("ui.status", (_$, e) => {
    statuses.push(e.text);
    return { value: undefined };
  });
  on("ui.toast", (_$, e) => {
    toasts.push(e.text);
    return { value: undefined };
  });
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("classic.SessionStart", () => ({}));
  on("classic.Stop", () => ({}));
  return { asked, looked, read, shipped, statuses, toasts };
};

const stop = (last_assistant_message = REPLY) => ({
  last_assistant_message,
  stop_hook_active: false,
});

test("/score has the reviewer read the change and answers with the scorecard", async ($, on) => {
  const { asked, looked, statuses } = world(on);
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("**ready**");
  expect(text).toContain("| confidence | `████████░░` 8 | pnpm test passed after the last edit |");
  expect(text).toContain("1. export it from src/index.ts like the others — `src/index.ts:3`");
  expect(text).not.toContain("make it nicer");
  expect(text).toContain("**Needs** test ✓");
  expect(text).toContain(
    "verified: static – · test ✓ · e2e – · against origin/main (abc1234) · reviewed by opus, read by sonnet",
  );
  expect(exitCode).toBe(0);
  expect(looked.map((request) => request.model)).toEqual(["sonnet"]);
  expect(asked.length).toBe(1);
  expect(asked[0]?.model).toBe("opus");
  expect(asked[0]?.system).toContain("You review a coding agent's work before it merges.");
  const prompt = String(asked[0]?.prompt);
  expect(prompt).toContain("1. Add a health check and test it");
  expect(prompt).toContain(`<reply>\n${REPLY}\n</reply>`);
  expect(prompt).toContain("<checks>\ntest: pass | pnpm -F app test\n</checks>");
  expect(prompt).toContain("--- CLAUDE.md\nUse pnpm.");
  expect(statuses).toContain("verified: static – · test ✓ · e2e – · reviewing…");
  expect(statuses.at(-1)).toBe("verified: static – · test ✓ · e2e – · ready");
});

test(
  "/score asks the models the config names",
  { options: { lookModel: "haiku", model: "sonnet" } },
  async ($, on) => {
    const { asked, looked } = world(on);
    await $.command.run(SCORE);
    expect(asked[0]?.model).toBe("sonnet");
    expect(looked[0]?.model).toBe("haiku");
  },
);

test("the reviewer looks around the repository before it answers", async ($, on) => {
  const looks = "read: src/version.ts\ngrep: export const in src\nread: ../secrets.txt\nlist: /etc";
  const { asked, looked, read } = world(on, { looks: [looks] });
  const { text } = await $.command.run(SCORE);
  expect(text).toContain("**ready**");
  expect(looked.length).toBe(2);
  expect(asked.length).toBe(1);
  const judged = String(asked[0]?.prompt);
  expect(judged).toContain("--- read: src/version.ts\n    1  export const version = () => '1';");
  expect(judged).toContain("--- grep: export const in src\nsrc/version.ts:1:export const version");
  expect(judged).not.toContain("--- read: ../secrets.txt");
  expect(judged).not.toContain("--- list: /etc");
  expect(read).toContain(`${ROOT}/src/version.ts`);
  expect(read.some((path) => path.includes("secrets"))).toBe(false);
});

test("the reviewer stops looking after three rounds", async ($, on) => {
  const look = "read: src/version.ts";
  const { asked, looked } = world(on, { looks: [look, look, look, look] });
  const { text } = await $.command.run(SCORE);
  expect(text).toContain("**ready**");
  expect(looked.length).toBe(3);
  expect(asked.length).toBe(1);
  expect(String(asked[0]?.prompt)).toContain('<looked round="3">');
});

test("/score exits 1 when the work is not ready", async ($, on) => {
  world(on, { answers: [ANSWER.replace("confidence: 8", "confidence: 3")] });
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("**not ready** · confidence 3 < 7 for low risk");
  expect(exitCode).toBe(1);
});

test("/score shows an answer it cannot read instead of a scorecard", async ($, on) => {
  world(on, { answers: ["Looks good to me!"] });
  const { exitCode, text } = await $.command.run(SCORE);
  expect(text).toContain("opus's answer did not fit the scorecard:\n\nLooks good to me!");
  expect(exitCode).toBe(undefined);
});

test("/score has nothing to review without changes, and asks no one", async ($, on) => {
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

test("Claude reads the bar as the session starts", async ($, on) => {
  world(on);
  const { additionalContext } = await $.classic.SessionStart({ source: "startup" });
  expect(additionalContext?.join("\n")).toContain("never say a change is done before it is proven");
});

test("the gate sends Claude back for a check the change needs and never ran", async ($, on) => {
  const { asked } = world(on, { isApp: true });
  const { block } = await $.classic.Stop(stop());
  expect(block).toContain("mod-dev: this change isn't proven yet");
  expect(block).toContain("- e2e never ran: pnpm -F app dev, then drive the change");
  expect(asked.length).toBe(0);
});

test("the gate takes a check Claude says it can't run, and the reviewer's ready", async ($, on) => {
  const reply = `${REPLY}\n\nUnverified: e2e — the route needs the production database`;
  const { asked } = world(on, { isApp: true, reply });
  const { block } = await $.classic.Stop(stop(reply));
  expect(block).toBe(undefined);
  expect(String(asked[0]?.prompt)).toContain(
    "e2e: waived | the route needs the production database",
  );
});

test("the gate passes the reviewer's cited fixes back to Claude", async ($, on) => {
  world(on, { answers: [NOT_READY] });
  const { block } = await $.classic.Stop(stop());
  expect(block).toBe(
    "mod-dev: the reviewer says fix first (idiomatic 6 < 7). Fix these, then check again:\n1. export it from src/index.ts like the others (src/index.ts:3)\n2. tighten the name (src/index.ts:3)\nIf a finding is wrong, say why in your reply instead; the reviewer reads it.",
  );
});

test("the gate lets go after three tries", async ($, on) => {
  const { toasts } = world(on, { answers: [NOT_READY] });
  for (const _ of [1, 2, 3]) {
    const { block } = await $.classic.Stop(stop());
    expect(block).toContain("the reviewer says fix first");
  }
  const { block } = await $.classic.Stop(stop());
  expect(block).toBe(undefined);
  expect(toasts).toEqual(["mod-dev: still not proven; /score shows what's missing"]);
});

test("the reviewer reads Claude's answer to a finding, and reads a ready change once", async ($, on) => {
  const { asked } = world(on, { answers: [NOT_READY, ANSWER] });
  await $.classic.Stop(stop());
  await $.classic.Stop(stop());
  expect(asked.length).toBe(1);
  const answer = "src/index.ts re-exports nothing by design: see its header.";
  const { block } = await $.classic.Stop(stop(answer));
  expect(block).toBe(undefined);
  expect(asked.length).toBe(2);
  expect(String(asked[1]?.prompt)).toContain(`<reply>\n${answer}\n</reply>`);
  await $.classic.Stop(stop("Anything else?\nNo, that's all."));
  expect(asked.length).toBe(2);
});

test("the gate lets a question to the person through", async ($, on) => {
  const { asked } = world(on, { isApp: true });
  const { block } = await $.classic.Stop(stop("Should the route be public?"));
  expect(block).toBe(undefined);
  expect(asked.length).toBe(0);
});

test("the gate is off when the config says so", { options: { gate: false } }, async ($, on) => {
  world(on, { isApp: true });
  const { block } = await $.classic.Stop(stop());
  expect(block).toBe(undefined);
});

test("no push for a change the reviewer hasn't found ready", async ($, on) => {
  const { shipped } = world(on, { answers: [NOT_READY] });
  const pushed = await $.tool.call({ command: "git push -u origin HEAD", tool: "Bash" });
  expect(pushed.isError).toBe(true);
  expect(pushed.text).toContain("mod-dev holds pushes and pull requests until the change is ready");
  expect(shipped).toEqual([]);
  await $.tool.call({ command: "git status", tool: "Bash" });
  expect(shipped).toEqual(["git status"]);
});

test("the gate holds while a dev server runs in the background", async ($, on) => {
  world(on, { isApp: true });
  const server = { description: "pnpm dev", id: "b1", status: "running", type: "shell" };
  const { block } = await $.classic.Stop({ ...stop(), background_tasks: [server] });
  expect(block).toContain("mod-dev: this change isn't proven yet");
});

test("no push when the review fails", async ($, on) => {
  const { shipped } = world(on, { answers: ["Looks good to me!"] });
  const pushed = await $.tool.call({ command: "git push", tool: "Bash" });
  expect(pushed.isError).toBe(true);
  expect(pushed.text).toContain("mod-dev couldn't review the change, so it holds the push");
  expect(shipped).toEqual([]);
});

test("a ready change pushes", async ($, on) => {
  const { shipped } = world(on);
  await $.tool.call({ command: "git push", tool: "Bash" });
  expect(shipped).toEqual(["git push"]);
});

const BAND = {
  bodyColumns: 100,
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  scroll: { bodyRows: 9, offset: 0, totalRows: 1 },
  view: {},
};

for (const surface of ["terminal", "desktop"] as const) {
  test(`the band and the pane show the proof on ${surface}`, async ($, on) => {
    const reply = `${REPLY}\nUnverified: e2e — no browser here`;
    world(on, { answers: [NOT_READY], isApp: true, reply });
    await $.classic.Stop(stop(reply));
    const band = await $.ui.mount({
      component: "AbovePrompt",
      plugin: "mod-dev",
      props: BAND,
      surface,
    });
    expect(await band.find({ text: /✓ test/u })).toBeDefined();
    expect(await band.find({ text: /\? e2e/u })).toBeDefined();
    expect(await band.find({ text: /● fix first 8·6·9·9/u })).toBeDefined();
    expect(await band.find({ key: "details" })).toBeDefined();
    const pane = await $.ui.mount({
      component: "Pane",
      plugin: "mod-dev",
      props: { ...BAND, isFocused: false, placement: "dock", title: "mod-dev" },
      requestId: "mod-dev",
      surface,
    });
    expect(await pane.find({ text: /● fix first · idiomatic 6 < 7/u })).toBeDefined();
    expect(await pane.find({ text: "██████░░░░" })).toBeDefined();
    expect(await pane.find({ text: /no browser here/u })).toBeDefined();
    expect(await pane.find({ text: /↳ src\/index\.ts:3/u })).toBeDefined();
    expect(await pane.find({ text: /2\. tighten the name/u })).toBeDefined();
  });
}
