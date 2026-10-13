import { atom, read, update } from "claude-code";
import type {
  EngineInterface,
  FsAncestorsRequest,
  Register,
  SessionMessage,
  ToolUseSummary,
} from "claude-code";

import type { Review } from "../types";
import { ledgerOf, statusOf, usesOf } from "./evidence";
import type { Ledger, Row, Use } from "./evidence";
import { DIFF_SCRIPT, fingerprintOf, hashOf, parseDiff } from "./git";
import { MARK_LOOK, VERDICT_COLOR, scoreRows, statusLine, verdictChip, verdictLine } from "./board";
import { asksOf, checksLine, fixLine, promptOf, replyOf, scorecardOf, verdictOf } from "./grade";
import type { Grade, Instruction } from "./grade";
import { entriesOf, linesOf, matchesOf } from "./look";
import type { Look } from "./look";
import {
  BAR,
  checksOf,
  dirsUp,
  gapText,
  gapsOf,
  isAsking,
  isShipping,
  isWaitingOn,
  managerOf,
  needsOf,
  packageFrom,
  reviewText,
  unverifiedOf,
} from "./proof";
import type { Check, Package } from "./proof";
import { reviewChange } from "./review";
import type { Models, Ports } from "./review";

const INSTRUCTION_FILES = ["AGENTS.md", "CLAUDE.md", "REVIEW.md"];
const MAX_DIRS = 30;
// How many times the gate sends Claude back before it lets the person decide.
const MAX_BLOCKS = 3;
const PANE = "mod-dev";

const IDLE: Review = { fingerprint: "", note: "", phase: "idle", reasons: [], replied: "" };
const checksAtom = atom({ key: "checks", plugin: "mod-dev" } as const, []);
const reviewAtom = atom({ key: "review", plugin: "mod-dev" } as const, IDLE);
const blocksAtom = atom({ key: "blocks", plugin: "mod-dev" } as const, 0);

// Where edits count: the repository's top level, else the session's root.
const rootOf = async ($: EngineInterface) => {
  try {
    const { exitCode, stdout } = await $.process.run(["git", "rev-parse", "--show-toplevel"]);
    if (exitCode === 0) {
      return stdout.trim();
    }
  } catch {
    // No git here: the session's root stands in.
  }
  return $.session.root();
};

// A transcript tool call in the ledger's terms. Its input is whatever the
// model sent, so the fields the ledger reads are taken as text here.
const useOf = ({ agentId, input, isError, text, tool }: ToolUseSummary): Use => ({
  agentId,
  command: String(input.command ?? ""),
  file: String(input.file_path ?? input.notebook_path ?? ""),
  isBackground: input.run_in_background === true,
  isError: isError === true,
  output: text ?? "",
  tool,
});

const rowOf = ({ role, text, toolUses }: SessionMessage): Row => ({
  role,
  text,
  toolUses: toolUses.map(useOf),
});

// The session as the gate reads it: its rows, and the ledger of its tool
// calls with each subagent's read in after the call that started it.
const readSession = async ($: EngineInterface) => {
  const messages = await $.session.messages();
  const rows = messages.map(rowOf);
  const agents = new Map<string, readonly Row[]>();
  for (const { agentId } of rows.flatMap((row) => row.toolUses)) {
    if (agentId !== undefined) {
      const found = await $.session.messages({ agentId });
      if (Array.isArray(found)) {
        agents.set(agentId, found.map(rowOf));
      }
    }
  }
  const root = await rootOf($);
  return { ledger: ledgerOf(usesOf(rows, agents), root), root, rows };
};

type Session = Awaited<ReturnType<typeof readSession>>;

// A file's text; empty when it can't be read.
const readText = async ($: EngineInterface, path: string) => {
  try {
    return await $.fs.read(path);
  } catch {
    return "";
  }
};

// The checks the edited files need, from the nearest package.json of each.
const checksFor = async ($: EngineInterface, { ledger, root }: Session, reply: string) => {
  const packages = new Map<string, Package | undefined>();
  const packageIn = async (dir: string) => {
    if (!packages.has(dir)) {
      const json = await readText($, `${root}/${dir ? `${dir}/` : ""}package.json`);
      packages.set(dir, packageFrom(dir, json));
    }
    return packages.get(dir);
  };
  const owners = new Map<string, Package | undefined>();
  for (const file of ledger.files) {
    let found: Package | undefined;
    for (const dir of dirsUp(file)) {
      found ??= await packageIn(dir);
    }
    owners.set(file, found);
  }
  const manager = managerOf(await readText($, `${root}/package.json`));
  const needs = needsOf(ledger.files, (file) => owners.get(file), manager);
  const checks = checksOf(ledger, needs, unverifiedOf(reply));
  await update($, checksAtom, () => checks);
  return checks;
};

const statusText = (ledger: Ledger, review: Review) => statusLine(statusOf(ledger), review);

const showStatus = async ($: EngineInterface) => {
  const session = await readSession($);
  await checksFor($, session, replyOf(session.rows));
  $.ui.status(statusText(session.ledger, await read($, reviewAtom)));
};

// The instruction files above the session's directory, then those nested on
// the way down to each edited directory.
const instructionsOf = async ($: EngineInterface, files: readonly string[], root: string) => {
  const found = new Map<string, string>();
  const scan = async (request: FsAncestorsRequest) => {
    try {
      for (const { content, dir, name } of await $.fs.ancestors(request)) {
        found.set(`${dir}/${name}`, content);
      }
    } catch {
      // A directory that cannot be read adds nothing.
    }
  };
  await scan({ names: INSTRUCTION_FILES });
  const byDir = new Map(files.map((file) => [file.slice(0, file.lastIndexOf("/") + 1), file]));
  for (const file of [...byDir.values()].slice(0, MAX_DIRS)) {
    await scan({ below: root, names: INSTRUCTION_FILES, of: `${root}/${file}` });
  }
  return [...found].map(([path, content]): Instruction => ({
    content,
    path: path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path,
  }));
};

const runDiff = async ($: EngineInterface, root: string, ref: string) => {
  try {
    return await $.process.run(["sh", "-c", DIFF_SCRIPT, "score", ref], {
      cwd: root,
      timeoutMs: 60_000,
    });
  } catch {
    return null;
  }
};

// Runs one of the reviewer's looks, read-only, inside the repository.
const runLook = async ($: EngineInterface, root: string, look: Look) => {
  try {
    if (look.kind === "read") {
      return linesOf(await $.fs.read(`${root}/${look.target}`), look);
    }
    if (look.kind === "list") {
      return entriesOf(await $.fs.list(`${root}/${look.target}`));
    }
    const { stdout } = await $.process.run(
      ["git", "grep", "-n", "-I", "-E", "-e", look.target, "--", ...(look.path ? [look.path] : [])],
      { cwd: root, timeoutMs: 20_000 },
    );
    return matchesOf(stdout);
  } catch (error) {
    return `(could not: ${error instanceof Error ? error.message : "refused"})`;
  }
};

// What the reviewer reaches through the session: model calls and reads.
const portsOf = ($: EngineInterface, root: string): Ports => ({
  complete: async ({ model, prompt, system }) => {
    try {
      const answer = await $.model.complete({
        effort: "high",
        maxTokens: 16_000,
        model,
        prompt,
        system,
        timeoutMs: 300_000,
      });
      return answer.isAnswered
        ? { text: answer.text }
        : { error: `${model} gave no answer (${answer.reason}).` };
    } catch (error) {
      return {
        error: `Could not ask ${model}: ${error instanceof Error ? error.message : "refused"}`,
      };
    }
  },
  look: (look) => runLook($, root, look),
});

// `said`: nothing to review (no change, no git); `failed`: the review failed.
type Proof =
  | { kind: "said" | "failed"; text: string }
  | { kind: "graded"; grade: Grade; checks: Check[]; card: string; isReady: boolean };

const failed = async ($: EngineInterface, text: string): Promise<Proof> => {
  await update($, reviewAtom, (review): Review => ({ ...review, note: text, phase: "failed" }));
  return { kind: "failed", text };
};

// Has the reviewer read the change as it stands, unless it already has.
const prove = async (
  $: EngineInterface,
  models: Models,
  { isForced = false, ref = "", reply }: { isForced?: boolean; ref?: string; reply?: string },
): Promise<Proof> => {
  const session = await readSession($);
  const { ledger, root, rows } = session;
  const said = reply ?? replyOf(rows);
  const checks = await checksFor($, session, said);
  const run = await runDiff($, root, ref);
  if (run?.exitCode === 2) {
    return { kind: "said", text: `${run.stderr.trim()}.` };
  }
  if (run?.exitCode !== 0) {
    return { kind: "said", text: "Needs a git repository to read the change from." };
  }
  const diff = parseDiff(run.stdout);
  if (diff.stat === "") {
    return {
      kind: "said",
      text: `Nothing to score: no changes against ${diff.against}. To compare with another commit: /score <ref>`,
    };
  }
  const evidence = statusOf(ledger) ?? "no edits through tools this session";
  const { lookModel, model } = models;
  const by = lookModel === model ? model : `${model}, read by ${lookModel}`;
  const footer = `${evidence} · against ${diff.against} (${diff.base.slice(0, 7)}) · reviewed by ${by}`;
  const fingerprint = `${fingerprintOf(diff)} ${checksLine(checks)}`;
  const replied = hashOf(said);
  const last = await read($, reviewAtom);
  const isSame =
    last.fingerprint === fingerprint && (last.verdict === "ready" || last.replied === replied);
  if (!isForced && last.phase === "done" && isSame && last.grade) {
    const { verdict } = verdictOf(last.grade);
    const card = scorecardOf(last.grade, checks, footer);
    return { card, checks, grade: last.grade, isReady: verdict === "ready", kind: "graded" };
  }
  const packet = promptOf({
    asks: asksOf(rows),
    checks,
    diff,
    instructions: await instructionsOf($, ledger.files, root),
    ledger,
    reply: said,
  });
  await update($, reviewAtom, (review): Review => ({ ...review, phase: "reviewing" }));
  $.ui.status(statusText(ledger, await read($, reviewAtom)));
  const reviewed = await reviewChange(portsOf($, root), models, packet);
  if ("error" in reviewed) {
    const proof = await failed($, reviewed.error);
    $.ui.status(statusText(ledger, await read($, reviewAtom)));
    return proof;
  }
  const { grade } = reviewed;
  const { reasons, verdict } = verdictOf(grade);
  await update($, reviewAtom, (): Review => ({
    fingerprint,
    grade,
    note: footer,
    phase: "done",
    reasons,
    replied,
    verdict,
  }));
  $.ui.status(statusText(ledger, await read($, reviewAtom)));
  const card = scorecardOf(grade, checks, footer);
  return { card, checks, grade, isReady: verdict === "ready", kind: "graded" };
};

// What sends Claude back from stopping: a needed check missing, else the
// reviewer's fixes; nothing when it asks the person something, when nothing
// was edited, or once it was sent back MAX_BLOCKS times since the last prompt.
const blockOf = async ($: EngineInterface, models: Models, reply: string) => {
  if (isAsking(reply)) {
    return;
  }
  if ((await read($, blocksAtom)) >= MAX_BLOCKS) {
    $.ui.toast("mod-dev: still not proven; /score shows what's missing");
    return;
  }
  const session = await readSession($);
  if (session.ledger.lastEdit === -1) {
    return;
  }
  const gaps = gapsOf(await checksFor($, session, reply));
  if (gaps.length > 0) {
    return gapText(gaps);
  }
  const proof = await prove($, models, { reply });
  if (proof.kind !== "graded" || proof.isReady) {
    return;
  }
  const { reasons, verdict } = verdictOf(proof.grade);
  return reviewText(verdict, reasons, proof.grade.fixes.map(fixLine));
};

export const register: Register = (on, options) => {
  const models: Models = {
    lookModel: String(options.lookModel ?? "sonnet"),
    model: String(options.model ?? "opus"),
  };
  const isGated = options.gate !== false;

  on("session.start", async ($, e, next) => {
    await $.command.register({
      argumentHint: "[base ref]",
      description:
        "Review this session's change: what is proven, and confidence, idiomatic, simplicity, scope and risk",
      name: "score",
    });
    $.clock.after(1, () => {
      void showStatus($);
    });
    return next(e);
  });

  // The bar, once, where Claude reads it before any work.
  on("classic.SessionStart", async ($, e, next) => {
    // oxlint-disable-next-line node/callback-return -- the bar joins what the chain returns
    const result = await next(e);
    const context = [...(result.additionalContext ?? []), BAR];
    return isGated ? { ...result, additionalContext: context } : result;
  });

  // A new prompt from the person: the gate starts counting again.
  on("prompt.submit", async ($, e, next) => {
    await update($, blocksAtom, () => 0);
    return next(e);
  });

  // The turn's tool calls are in the transcript by now; read them once it ends.
  on("turn.complete", ($, e, next) => {
    if (e.agentId === undefined) {
      $.clock.after(1, () => {
        void showStatus($);
      });
    }
    return next(e);
  });

  // The gate: Claude doesn't stop on an edited change until every check it
  // needs passed after the last edit (or was said to be impossible here) and
  // the reviewer finds it ready. A block from beneath stands.
  on("classic.Stop", async ($, e, next) => {
    const isWaiting = isWaitingOn(e.background_tasks ?? []);
    const block =
      isGated && !isWaiting ? await blockOf($, models, e.last_assistant_message ?? "") : undefined;
    if (block === undefined) {
      return next(e);
    }
    await update($, blocksAtom, (n) => n + 1);
    // oxlint-disable-next-line node/callback-return -- a block from beneath stands over this one
    const result = await next(e);
    return result.block === undefined ? { ...result, block } : result;
  });

  // The ship gate: no push or pull request for an edited change the reviewer
  // hasn't found ready.
  on("classic.PreToolUse", async ($, e, next) => {
    if (!isGated || !isShipping(e.tool, e.tool === "Bash" ? e.command : "")) {
      return next(e);
    }
    const { ledger } = await readSession($);
    if (ledger.lastEdit === -1) {
      return next(e);
    }
    const proof = await prove($, models, {});
    if (proof.kind === "failed") {
      return { deny: `mod-dev couldn't review the change, so it holds the push: ${proof.text}` };
    }
    if (proof.kind !== "graded" || proof.isReady) {
      return next(e);
    }
    const { reasons, verdict } = verdictOf(proof.grade);
    return {
      deny: `${reviewText(verdict, reasons, proof.grade.fixes.map(fixLine))}\nmod-dev holds pushes and pull requests until the change is ready; the person can push it themselves.`,
    };
  });

  on("command.run", { command: "score" }, async ($, e) => {
    void $.ui.open({ id: PANE, title: "mod-dev" });
    const proof = await prove($, models, { isForced: true, ref: e.args.trim() });
    if (proof.kind !== "graded") {
      return { text: proof.text };
    }
    // A headless `claude -p "/score"` exits 0 only when ready.
    return { exitCode: proof.isReady ? 0 : 1, text: proof.card };
  });

  // Above the prompt: where the needed checks stand and the reviewer's verdict.
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    const checks = await read($, checksAtom);
    const review = await read($, reviewAtom);
    if (e.props.hasSurvey || (checks.length === 0 && review.phase === "idle")) {
      return next(e);
    }
    const { Box, Button, Text } = $.ui.resolve(e);
    return (
      <Box flexDirection="row" gap={2}>
        <Text bold>proof</Text>
        {checks.map(({ kind, mark }) => (
          <Text key={kind} color={MARK_LOOK[mark].color} dimColor={mark === "none"}>
            {MARK_LOOK[mark].sign} {kind}
          </Text>
        ))}
        {review.phase === "reviewing" && <Text dimColor>reviewing…</Text>}
        {review.phase === "failed" && <Text color="error">review failed</Text>}
        {review.phase === "done" && review.verdict && review.grade && (
          <Text color={VERDICT_COLOR[review.verdict]}>
            {verdictChip(review.verdict, review.grade)}
          </Text>
        )}
        <Button
          key="details"
          label="Details"
          onPress={() => $.ui.open({ id: PANE, title: "mod-dev" })}
        />
      </Box>
    );
  });

  // The pane: the scorecard, the checks with how to run each, the fixes and
  // what each stands on.
  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e);
    const checks = await read($, checksAtom);
    const review = await read($, reviewAtom);
    const { grade } = review;
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={2}>
          {review.phase === "reviewing" && <Text dimColor>Reviewing the change…</Text>}
          {review.phase === "idle" && <Text dimColor>Not reviewed yet.</Text>}
          {review.phase === "failed" && <Text color="error">{review.note}</Text>}
          {review.phase === "done" && review.verdict && (
            <Text bold color={VERDICT_COLOR[review.verdict]}>
              {verdictLine(review.verdict, review.reasons)}
            </Text>
          )}
          <Button
            key="again"
            label="Review again"
            onPress={() => {
              void prove($, models, { isForced: true });
            }}
          />
        </Box>
        {grade && (
          <Box flexDirection="column">
            {scoreRows(grade).map((row) => (
              <Box key={row.label} flexDirection="row" gap={1}>
                <Text>{row.label}</Text>
                <Text color={row.color}>{row.bar}</Text>
                <Text bold>{row.score}</Text>
                <Text dimColor wrap="truncate-end">
                  {row.why}
                </Text>
              </Box>
            ))}
            <Box flexDirection="row" gap={1}>
              <Text>{"risk".padEnd(10)}</Text>
              <Text bold>{grade.risk.level}</Text>
              <Text dimColor wrap="truncate-end">
                {grade.risk.why}
              </Text>
            </Box>
          </Box>
        )}
        {checks.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Needs</Text>
            {checks.map(({ hint, kind, mark }) => (
              <Box key={kind} flexDirection="row" gap={1}>
                <Text color={MARK_LOOK[mark].color}>{MARK_LOOK[mark].sign}</Text>
                <Text>{kind.padEnd(6)}</Text>
                <Text dimColor wrap="truncate-end">
                  {hint}
                </Text>
              </Box>
            ))}
          </Box>
        )}
        {grade && grade.fixes.length > 0 && (
          <Box flexDirection="column">
            <Text bold>Fixes</Text>
            {grade.fixes.map(({ source, text }, i) => (
              <Box key={String(i)} flexDirection="column">
                <Text>
                  {i + 1}. {text}
                </Text>
                <Text dimColor> ↳ {source}</Text>
              </Box>
            ))}
          </Box>
        )}
        {review.phase === "done" && <Text dimColor>{review.note}</Text>}
      </Box>
    );
  });
};
