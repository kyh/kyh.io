import type {
  EngineInterface,
  FsAncestorsRequest,
  ModelCompleteResult,
  Register,
  SessionMessage,
  ToolUseSummary,
} from "claude-code";

import { ledgerOf, statusOf, usesOf } from "./evidence";
import type { Row, Use } from "./evidence";
import { DIFF_SCRIPT, parseDiff } from "./git";
import { SYSTEM, asksOf, parseGrade, promptOf, replyOf, scorecardOf, verdictOf } from "./grade";
import type { Instruction } from "./grade";

const INSTRUCTION_FILES = ["AGENTS.md", "CLAUDE.md", "REVIEW.md"];
const MAX_DIRS = 30;

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

// The session as the scorecard reads it: its rows, and the ledger of its tool
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

const showStatus = async ($: EngineInterface) => {
  const { ledger } = await readSession($);
  $.ui.status(statusOf(ledger));
};

// The instruction files above the session's directory, then those nested on
// the way down to each edited directory.
const instructionsOf = async ($: EngineInterface, files: readonly string[], root: string) => {
  const found = new Map<string, string>();
  const read = async (request: FsAncestorsRequest) => {
    try {
      for (const { content, dir, name } of await $.fs.ancestors(request)) {
        found.set(`${dir}/${name}`, content);
      }
    } catch {
      // A directory that cannot be read adds nothing.
    }
  };
  await read({ names: INSTRUCTION_FILES });
  const byDir = new Map(files.map((file) => [file.slice(0, file.lastIndexOf("/") + 1), file]));
  for (const file of [...byDir.values()].slice(0, MAX_DIRS)) {
    await read({ below: root, names: INSTRUCTION_FILES, of: `${root}/${file}` });
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

const score = async ($: EngineInterface, model: string, ref: string) => {
  const { ledger, root, rows } = await readSession($);
  const run = await runDiff($, root, ref);
  if (run?.exitCode === 2) {
    return { text: `${run.stderr.trim()}.` };
  }
  if (run?.exitCode !== 0) {
    return { text: "Needs a git repository to read the change from." };
  }
  const diff = parseDiff(run.stdout);
  if (diff.stat === "") {
    return {
      text: `Nothing to score: no changes against ${diff.against}. To compare with another commit: /score <ref>`,
    };
  }
  const prompt = promptOf({
    asks: asksOf(rows),
    diff,
    instructions: await instructionsOf($, ledger.files, root),
    ledger,
    reply: replyOf(rows),
  });
  $.ui.status(`scoring with ${model}…`);
  let answer: ModelCompleteResult;
  try {
    answer = await $.model.complete({
      effort: "high",
      maxTokens: 16_000,
      model,
      prompt,
      system: SYSTEM,
      timeoutMs: 300_000,
    });
  } catch (error) {
    return {
      text: `Could not ask ${model}: ${error instanceof Error ? error.message : "refused"}`,
    };
  } finally {
    $.ui.status(statusOf(ledger));
  }
  if (!answer.isAnswered) {
    return { text: `${model} gave no answer (${answer.reason}).` };
  }
  const grade = parseGrade(answer.text);
  if (grade === undefined) {
    return {
      text: `${model}'s answer did not fit the scorecard:\n\n${answer.text.slice(0, 1500)}`,
    };
  }
  const evidence = statusOf(ledger) ?? "no edits through tools this session";
  const footer = `${evidence} · against ${diff.against} (${diff.base.slice(0, 7)}) · graded by ${model}`;
  // A headless `claude -p "/score"` exits 0 only when ready.
  return {
    exitCode: verdictOf(grade).verdict === "ready" ? 0 : 1,
    text: scorecardOf(grade, footer),
  };
};

export const register: Register = (on, options) => {
  const model = String(options.model ?? "opus");

  on("session.start", async ($, e, next) => {
    await $.command.register({
      argumentHint: "[base ref]",
      description: "Score this session's work: confidence, idiomatic, simplicity, scope and risk",
      name: "score",
    });
    $.clock.after(1, () => {
      void showStatus($);
    });
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

  on("command.run", { command: "score" }, ($, e) => score($, model, e.args.trim()));
};
