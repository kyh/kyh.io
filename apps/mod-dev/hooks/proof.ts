// What a change has to prove before Claude may call it done: the checks its
// packages offer, where each stands now, the ones Claude said it could not
// run, and what the gate tells Claude when something is missing. Pure, so the
// rules are tested without a session.

import type { Kind } from "./commands";
import { stateOf } from "./evidence";
import type { Ledger, State } from "./evidence";

// The package an edited file belongs to: its directory under the repository
// (empty at the root), its name and its scripts.
export interface Package {
  dir: string;
  name: string;
  scripts: readonly string[];
}

// A check the change needs, and the commands that would run it.
export interface Need {
  kind: Kind;
  commands: string[];
}

export type Mark = State | "waived";

// Where a needed check stands: its mark, and the commands to run it or why
// Claude could not.
export interface Check {
  kind: Kind;
  mark: Mark;
  hint: string;
}

// Files that change no behavior: nothing to run for them.
const INERT = /\.(?:md|mdx|txt|png|jpe?g|gif|svg|webp|ico)$|(?:^|\/)(?:LICENSE|\.gitignore)$/iu;
const TEST_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|tests?|e2e)\//u;
const STATIC_SCRIPTS = ["typecheck", "check", "lint", "tsc"];
// Scripts that start something to drive: an app, a server, a session.
const RUN_SCRIPTS = ["dev", "start", "session", "preview"];
const ORDER: readonly Kind[] = ["static", "test", "build", "e2e"];

// The package manager a root package.json names, else npm.
export const managerOf = (json: string) =>
  /"packageManager"\s*:\s*"(?<name>pnpm|yarn|bun|npm)@/u.exec(json)?.groups?.name ?? "npm";

const run = (manager: string, pkg: Package, script: string) => {
  if (manager === "pnpm") {
    return `pnpm -F ${pkg.name} ${script}`;
  }
  if (manager === "yarn") {
    return `yarn workspace ${pkg.name} ${script}`;
  }
  return pkg.dir === "" ? `${manager} run ${script}` : `cd ${pkg.dir} && ${manager} run ${script}`;
};

// The checks a change needs, from the package of each edited file: static and
// test where the package has scripts for them, e2e where a source file
// changed in a package that runs.
export const needsOf = (
  files: readonly string[],
  packageOf: (file: string) => Package | undefined,
  manager: string,
): Need[] => {
  const found = new Map<Kind, Set<string>>();
  const need = (kind: Kind, command: string) => {
    found.set(kind, (found.get(kind) ?? new Set()).add(command));
  };
  for (const file of files) {
    const pkg = INERT.test(file) ? undefined : packageOf(file);
    if (pkg !== undefined) {
      const lint = STATIC_SCRIPTS.find((script) => pkg.scripts.includes(script));
      if (lint !== undefined) {
        need("static", run(manager, pkg, lint));
      }
      if (pkg.scripts.includes("test")) {
        need("test", run(manager, pkg, "test"));
      }
      const start = RUN_SCRIPTS.find((script) => pkg.scripts.includes(script));
      if (start !== undefined && !TEST_FILE.test(file)) {
        need("e2e", `${run(manager, pkg, start)}, then drive the change`);
      }
    }
  }
  return ORDER.flatMap((kind) => {
    const commands = found.get(kind);
    return commands === undefined ? [] : [{ commands: [...commands], kind }];
  });
};

const UNVERIFIED =
  /^[\s>*_`-]*unverified[\s*_`:]*(?<kind>static|test|build|e2e)\b[\s*_`]*[—–:-]*\s*(?<why>.+)$/gimu;

// The checks Claude said it could not run, each with its reason: lines like
// `Unverified: e2e — needs the production database`.
export const unverifiedOf = (reply: string) => {
  const waived = new Map<Kind, string>();
  for (const { groups = {} } of reply.matchAll(UNVERIFIED)) {
    const kind = ORDER.find((one) => one === groups.kind?.toLowerCase());
    if (kind !== undefined && !waived.has(kind)) {
      waived.set(kind, (groups.why ?? "").trim());
    }
  }
  return waived;
};

// Where each needed check stands for the code as it is now.
export const checksOf = (
  ledger: Ledger,
  needs: readonly Need[],
  waived: ReadonlyMap<Kind, string>,
): Check[] =>
  needs.map(({ commands, kind }) => {
    const state = stateOf(ledger, kind);
    const why = waived.get(kind);
    if (state !== "pass" && why !== undefined) {
      return { hint: why, kind, mark: "waived" };
    }
    return { hint: commands.join("; "), kind, mark: state };
  });

export const gapsOf = (checks: readonly Check[]) =>
  checks.filter((check) => check.mark !== "pass" && check.mark !== "waived");

// Whether Claude stopped to wait on work that will wake it (a subagent, a
// workflow, a monitor). A background shell, a dev server say, wakes nothing.
export const isWaitingOn = (tasks: readonly { type: string }[]) =>
  tasks.some((task) => task.type !== "shell");

// Whether Claude ended its turn on a question to the person: not a claim of
// done, so nothing to hold it to yet.
export const isAsking = (reply: string) =>
  reply.trimEnd().split("\n").at(-1)?.trimEnd().endsWith("?") === true;

const STANDING: Readonly<Record<Mark, string>> = {
  fail: "failed after your last edit",
  none: "never ran",
  pass: "passed",
  stale: "ran before your last edit",
  waived: "can't run here",
};

const E2E =
  "agent-browser against the dev server, curl against a local route, or claude --plugin-dir for a plugin";

// What the gate tells Claude when a needed check is missing.
export const gapText = (gaps: readonly Check[]) =>
  [
    "mod-dev: this change isn't proven yet. Before you say it's done:",
    ...gaps.map((gap) => {
      const how = gap.kind === "e2e" ? `${gap.hint} (${E2E})` : gap.hint;
      return `- ${gap.kind} ${STANDING[gap.mark]}: ${how}`;
    }),
    "If one truly can't run here, say so in your reply on a line of its own, `Unverified: <check> — <why>`, and the reviewer will weigh the reason.",
  ].join("\n");

// What the gate tells Claude when the reviewer found the change not ready.
export const reviewText = (verdict: string, reasons: readonly string[], fixes: readonly string[]) =>
  [
    `mod-dev: the reviewer says ${verdict}${reasons.length > 0 ? ` (${reasons.join("; ")})` : ""}. Fix these, then check again:`,
    ...fixes.map((fix, i) => `${i + 1}. ${fix}`),
    "If a finding is wrong, say why in your reply instead; the reviewer reads it.",
  ].join("\n");

// The bar Claude works to, told once as the session starts.
export const BAR = `mod-dev holds this session to one rule: never say a change is done before it is proven.
- Before writing, find the precedent: the sibling file, the other callers, the package's own way of doing it, and the docs of the installed version (node_modules) for APIs you use. Follow it, and name what you followed in your reply.
- After your last edit, run the checks the change needs: typecheck and lint, the tests, and drive the change for real where it runs (a browser, a request, the built CLI).
- A check that can't run here goes in your reply on a line of its own: \`Unverified: <static|test|e2e> — <why>\`.
When you stop with edits, mod-dev checks this and has a separate reviewer read the change; it sends you back if anything is missing.`;

// The directories a file's package may sit in, nearest first, the root last.
export const dirsUp = (file: string) => {
  const parts = file.split("/").slice(0, -1);
  return [...[...parts.keys()].map((n) => parts.slice(0, parts.length - n).join("/")), ""];
};

// A package.json as the gate reads it: its name and the names of its
// scripts; undefined when it is missing or no JSON.
export const packageFrom = (dir: string, json: string): Package | undefined => {
  try {
    // SAFETY: `name` is made a string, and only the keys of `scripts` are read:
    // a non-object there names no known script, or throws into the catch.
    const { name, scripts = {} } = JSON.parse(json) as {
      name?: unknown;
      scripts?: Record<string, string>;
    };
    return {
      dir,
      name: name === undefined ? dir || "." : String(name),
      scripts: Object.keys(scripts),
    };
  } catch {
    // Missing, or no JSON: no package here.
  }
};
