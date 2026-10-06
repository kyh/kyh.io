// What a session's tool calls show about its work: the ledger of its edits
// and checks, and where each kind of check stands for the code as it is now.
// Pure, so the rules are tested without a session.

import { EDIT_TOOLS, KINDS, effectOf } from "./commands";
import type { Call, Kind } from "./commands";
import { withoutHeredocs } from "./shell";

export type State = "pass" | "fail" | "stale" | "none";

// One tool call, read off the transcript into what the ledger needs.
export interface Use extends Call {
  output: string;
  agentId?: string;
}

export interface Row {
  role: "user" | "assistant";
  text: string;
  toolUses: readonly Use[];
}

// A tool call worth showing: an edit, a check, or a command that ran.
export interface Step {
  index: number;
  label: string;
  kinds: Kind[];
  isEdit: boolean;
  isPassed: boolean;
  tail: string;
}

export interface Ledger {
  steps: Step[];
  files: string[];
  lastEdit: number;
  total: number;
}

// How runners, compilers and package managers report a failure, for when a
// pipe or `|| true` keeps it out of the exit status.
const FAILED = [
  /\b[1-9]\d* (?:errors?|failed|failing|failures?)\b/u,
  /^(?:#|ℹ) fail [1-9]/mu,
  /\berror TS\d+/u,
  /^(?:FAIL|--- FAIL|\(fail\))/mu,
  /^\s*[1-9]\d* fail$/mu,
  /:\d+:\d+: error\b|^error(?:\[\w+\])?:/mu,
  /^\s*Failed:\s+\S/mu,
  /test result: FAILED/u,
  /\bERR_PNPM_|\bELIFECYCLE\b|^npm ERR!/mu,
];

const MARKS: Readonly<Record<State, string>> = { fail: "✗", none: "–", pass: "✓", stale: "stale" };
const MAX_STEPS = 80;

export const looksFailed = (output: string) => FAILED.some((pattern) => pattern.test(output));

const relativeTo = (path: string, root: string) =>
  path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;

// A command as the grader reads it: on one line, heredoc bodies left out.
const labelOf = (use: Use) => {
  const command = withoutHeredocs(use.command);
  const flat = (use.tool === "Bash" ? command : use.tool).replaceAll(/\s+/gu, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 159)}…` : flat;
};

const tailOf = (output: string) => output.trimEnd().split("\n").slice(-8).join("\n").slice(-600);

// The session's tool calls in order, each subagent's after the call that
// started it.
export const usesOf = (rows: readonly Row[], agents: ReadonlyMap<string, readonly Row[]>): Use[] =>
  rows.flatMap((row) =>
    row.toolUses.flatMap((use) => {
      const calls = use.agentId === undefined ? undefined : agents.get(use.agentId);
      return calls === undefined ? [use] : [use, ...usesOf(calls, agents)];
    }),
  );

export const ledgerOf = (uses: readonly Use[], root: string): Ledger => {
  const ledger: Ledger = { files: [], lastEdit: -1, steps: [], total: uses.length };
  for (const [index, use] of uses.entries()) {
    const effect = effectOf(use, root);
    if (!effect.isQuiet) {
      const isPassed = !use.isError && !(effect.isMasked && looksFailed(use.output));
      const isFileEdit = effect.isEdit && EDIT_TOOLS.has(use.tool);
      const file = relativeTo(use.file, root);
      ledger.steps.push({
        index,
        isEdit: effect.isEdit,
        isPassed,
        kinds: effect.kinds,
        label: isFileEdit ? file : labelOf(use),
        tail: isPassed ? "" : tailOf(use.output),
      });
      if (effect.isEdit) {
        ledger.lastEdit = index;
      }
      if (isFileEdit && !ledger.files.includes(file)) {
        ledger.files.push(file);
      }
    }
  }
  return ledger;
};

// Where a kind of check stands for the code as it is now: the last one of
// its kind, unless an edit came after it.
export const stateOf = (ledger: Ledger, kind: Kind): State => {
  const last = ledger.steps.findLast((step) => step.kinds.includes(kind));
  if (last === undefined) {
    return "none";
  }
  if (last.index < ledger.lastEdit) {
    return "stale";
  }
  return last.isPassed ? "pass" : "fail";
};

// The status line: what is verified about the code as it stands, once
// something was edited. Build shows once one ran.
export const statusOf = (ledger: Ledger) => {
  if (ledger.lastEdit === -1) {
    return;
  }
  const parts = KINDS.flatMap((kind) => {
    const state = stateOf(ledger, kind);
    return kind === "build" && state === "none" ? [] : [`${kind} ${MARKS[state]}`];
  });
  return `verified: ${parts.join(" · ")}`;
};

const stepLine = (step: Step, lastEdit: number) => {
  const what: string[] = [];
  if (step.kinds.length > 0) {
    what.push(
      step.kinds.join("+"),
      step.isPassed ? "pass" : "FAIL",
      step.index < lastEdit ? "stale" : "fresh",
    );
  } else if (!step.isEdit) {
    what.push(step.isPassed ? "ran" : "ran, failed");
  }
  if (step.isEdit) {
    what.push("edit");
  }
  return `${String(step.index).padStart(5)}  ${what.join(" ")}  ${step.label}`;
};

// The ledger as the grader reads it: the timeline, then where each kind of
// check stands now.
export const ledgerText = (ledger: Ledger) => {
  const edits = ledger.steps.filter((step) => step.isEdit).length;
  const head =
    ledger.lastEdit === -1
      ? `No edits through tools in ${ledger.total} tool calls.`
      : `${edits} edit${edits === 1 ? "" : "s"}; the last at step ${ledger.lastEdit} of ${ledger.total} tool calls.`;
  const steps = ledger.steps.slice(-MAX_STEPS);
  const lines = steps.flatMap((step) => [
    stepLine(step, ledger.lastEdit),
    ...(step.tail ? step.tail.split("\n").map((line) => `         | ${line}`) : []),
  ]);
  const skipped = ledger.steps.length - steps.length;
  const now = KINDS.map((kind) => `${kind} ${stateOf(ledger, kind)}`).join(", ");
  return [
    head,
    `Files edited: ${ledger.files.join(", ") || "none"}`,
    ...(skipped > 0 ? [`(${skipped} earlier steps left out)`] : []),
    ...lines,
    `Now: ${now}`,
  ].join("\n");
};
