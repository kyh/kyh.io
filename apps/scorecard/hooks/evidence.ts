// What a session's tool calls show about its work: which checks ran, whether
// they passed, and whether anything was edited after them. Pure, so the rules
// are tested without a session.

export type Kind = "static" | "test" | "build" | "e2e";
export type State = "pass" | "fail" | "stale" | "none";

export const KINDS: readonly Kind[] = ["static", "test", "build", "e2e"];

// One tool call, read off the transcript into what the ledger needs.
export interface Use {
  tool: string;
  command: string;
  file: string;
  isBackground: boolean;
  isError: boolean;
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

interface Effect {
  kinds: Kind[];
  isEdit: boolean;
  isMasked: boolean;
  isQuiet: boolean;
}

// One command between shell operators, and the operator after it.
interface Simple {
  words: string[];
  op: string;
}

type TokenPart = "double" | "escaped" | "plain" | "single";

// Where a command runs: the repository, and whether a `cd` has left it.
interface Place {
  root: string;
  isCwdInside: boolean;
}

const QUIET: Effect = { isEdit: false, isMasked: false, isQuiet: true, kinds: [] };

const EDIT_TOOLS = new Set(["Edit", "MultiEdit", "NotebookEdit", "Write"]);
const BROWSER_TOOL = /^mcp__.*(?:browser|chrome|computer|playwright|puppeteer)/iu;
const PACKAGE_MANAGERS = new Set(["bun", "npm", "pnpm", "yarn"]);
const TASK_RUNNERS = new Set(["just", "make", "task", "turbo"]);
const SHELLS = new Set(["bash", "sh", "zsh"]);
const INTERPRETERS = new Set([
  "bun",
  "deno",
  "node",
  "perl",
  "php",
  "python",
  "python3",
  "ruby",
  "tsx",
]);
// How an inline script (`python3 - <<EOF`, `node -e`) writes or moves files.
const WRITE_API =
  /\bopen\([^)]*["'][awx]b?\+?["']|(?<!std(?:out|err))\.write(?:_bytes|_text)?\(|\b(?:appendFile|rename|rm|unlink|writeFile)(?:Sync)?\(|\bshutil\.|\bos\.(?:remove|rename|replace)\(|\bfile_put_contents\(/u;
const WRAPPERS = new Set([
  "bunx",
  "env",
  "exec",
  "nice",
  "nohup",
  "npx",
  "pnpx",
  "sudo",
  "time",
  "timeout",
]);
const RUNNERS = new Set([
  "bundle exec",
  "npm exec",
  "pnpm dlx",
  "pnpm exec",
  "poetry run",
  "python -m",
  "python3 -m",
  "uv run",
  "yarn dlx",
  "yarn exec",
]);
const VALUE_FLAGS = new Set([
  "-C",
  "-F",
  "-c",
  "--cwd",
  "--dir",
  "--filter",
  "--prefix",
  "--workspace",
]);
const REDIRECTS = new Set([">", ">>", ">|", "<", "<<", "<<<"]);
const ASSIGNMENT = /^[A-Za-z_]\w*=/u;
const LOCAL_URL = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])\b/u;
const HEREDOC =
  /<<-?[ \t]*(?<quote>["']?)(?<delimiter>\w+)\k<quote>(?<rest>[^\n]*)\n[\s\S]*?\n[ \t]*\k<delimiter>[ \t]*(?=\n|$)/gu;
const TOKEN =
  /(?<op>&&|\|\||[\n;&|()])|(?<redirect><<<|<<|>>|>\||[<>])|'(?<single>[^']*)'?|"(?<double>(?:[^"\\]|\\[\s\S])*)"?|\\(?<escaped>[\s\S]?)|(?<plain>[^\s;&|()<>'"\\]+)|[^\S\n]+/gu;

// Programs, or a program and its subcommands, that check the code.
const TOOLS = new Map<string, readonly Kind[]>([
  ["agent-browser", ["e2e"]],
  ["biome", ["static"]],
  ["cargo build", ["build"]],
  ["cargo check", ["static"]],
  ["cargo clippy", ["static"]],
  ["cargo nextest", ["test"]],
  ["cargo test", ["test"]],
  ["claude plugin test", ["test"]],
  ["claude plugin validate", ["static"]],
  ["cypress", ["e2e"]],
  ["deno check", ["static"]],
  ["deno lint", ["static"]],
  ["deno test", ["test"]],
  ["docker build", ["build"]],
  ["eslint", ["static"]],
  ["go build", ["build"]],
  ["go test", ["test"]],
  ["go vet", ["static"]],
  ["jest", ["test"]],
  ["mocha", ["test"]],
  ["mypy", ["static"]],
  ["next build", ["build"]],
  ["oxfmt", ["static"]],
  ["oxlint", ["static"]],
  ["playwright", ["e2e"]],
  ["prettier", ["static"]],
  ["pyright", ["static"]],
  ["pytest", ["test"]],
  ["rspec", ["test"]],
  ["ruff", ["static"]],
  ["tsc", ["static"]],
  ["unittest", ["test"]],
  ["vite build", ["build"]],
  ["vitest", ["test"]],
  ["vue-tsc", ["static"]],
]);

// What a package script or make target checks, by its name.
const SCRIPTS: readonly (readonly [RegExp, readonly Kind[]])[] = [
  [/e2e|playwright|cypress/u, ["e2e"]],
  [/^verify/u, ["static", "test"]],
  [/(?:^|[:_-])(?:tests?|spec)(?:$|[:_-])/u, ["test"]],
  [/^(?:check|fmt|format|lint|tsc|typecheck|type-check|types|validate)(?:$|[:_-])/u, ["static"]],
  [/^build(?:$|[:_-])/u, ["build"]],
];

// Commands that only read: left off the ledger.
const READ_ONLY = new Set([
  "[",
  "awk",
  "cat",
  "cut",
  "diff",
  "du",
  "echo",
  "file",
  "find",
  "grep",
  "head",
  "jq",
  "ls",
  "nl",
  "printf",
  "pwd",
  "rg",
  "sed",
  "sort",
  "stat",
  "tail",
  "test",
  "tr",
  "tree",
  "true",
  "uniq",
  "wc",
  "which",
]);
const GIT_READS = new Set([
  "blame",
  "branch",
  "diff",
  "log",
  "ls-files",
  "remote",
  "rev-parse",
  "show",
  "status",
]);
const GIT_EDITS = new Set([
  "am",
  "apply",
  "checkout",
  "cherry-pick",
  "merge",
  "pull",
  "rebase",
  "reset",
  "restore",
  "revert",
  "stash",
  "switch",
]);
const FILE_COMMANDS = new Set(["cp", "ln", "mv", "rm", "tee"]);
const INSTALLS = new Set(["add", "remove", "rm", "uninstall", "up", "update", "upgrade"]);
// Formatters that write in place unless asked only to check.
const FORMATTERS = new Set(["black", "cargo fmt", "deno fmt", "go fmt", "oxfmt", "ruff format"]);

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

// The text a token adds to its word, quotes and escapes removed; undefined
// for whitespace and operators.
const wordText = ({ double, escaped, plain, single }: Partial<Record<TokenPart, string>>) =>
  plain ?? single ?? double?.replaceAll(/\\(?<char>[\s\S])/gu, "$<char>") ?? escaped;

// Splits a command line at unquoted ; & | && || ( ) and newlines into simple
// commands, each its words with the quotes removed. Heredoc bodies are
// dropped and redirections become words of their own.
export const commandsOf = (line: string): Simple[] => {
  const source = line
    .replaceAll("\\\n", "")
    .replaceAll(HEREDOC, "<<$<delimiter>$<rest>")
    .replaceAll(/\d*[<>]&\d*-?|&>>?/gu, (op) => (op.startsWith("&") ? op.slice(1) : " "));
  const commands: Simple[] = [];
  let words: string[] = [];
  let word: string | undefined;
  const endWord = () => {
    if (word !== undefined) {
      words.push(word);
    }
    word = undefined;
  };
  const endCommand = (op: string) => {
    endWord();
    if (words.length > 0) {
      commands.push({ op, words });
    }
    words = [];
  };
  for (const { groups = {} } of source.matchAll(TOKEN)) {
    const { op, redirect } = groups;
    const text = wordText(groups);
    if (op !== undefined) {
      endCommand(op === "(" || op === ")" ? ";" : op);
    } else if (redirect !== undefined) {
      // `2>` names a stream, not a word of the command.
      word = word !== undefined && /^\d+$/u.test(word) ? undefined : word;
      endWord();
      words.push(redirect);
    } else if (text === undefined) {
      endWord();
    } else {
      word = (word ?? "") + text;
    }
  }
  endCommand("");
  return commands;
};

// The words that are not flags, skipping the values of flags that take one.
const positionals = (args: readonly string[]) => {
  const found: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (VALUE_FLAGS.has(arg)) {
      i += 1;
    } else if (!arg.startsWith("-")) {
      found.push(arg);
    }
  }
  return found;
};

const dropOptions = (words: readonly string[]) => {
  const at = words.findIndex((word) => !/^-|^\d+[smhd]?$/u.test(word));
  return at === -1 ? [] : words.slice(at);
};

// The command under its wrappers: `npx vitest` is vitest, `pnpm exec tsc` is
// tsc, `CI=1 timeout 60 pytest` is pytest.
const unwrap = (words: readonly string[]): readonly string[] => {
  const [first = "", second = ""] = words;
  if (ASSIGNMENT.test(first)) {
    return unwrap(words.slice(1));
  }
  if (WRAPPERS.has(first)) {
    return unwrap(dropOptions(words.slice(1)));
  }
  if (RUNNERS.has(`${first} ${second}`)) {
    return unwrap(dropOptions(words.slice(2)));
  }
  return words;
};

const splitRedirects = (words: readonly string[]) => {
  const args: string[] = [];
  const targets: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i] ?? "";
    if (REDIRECTS.has(word)) {
      if (word.startsWith(">")) {
        targets.push(words[i + 1] ?? "");
      }
      i += 1;
    } else {
      args.push(word);
    }
  }
  return { args, targets };
};

// The script a package manager runs: `pnpm -F x test`, `npm run lint`,
// `yarn workspace x build`.
const scriptOf = (program: string, words: readonly string[]) => {
  const rest = words[0] === "workspace" ? words.slice(2) : words;
  const [first = "", second = ""] = rest;
  if (first === "run" || first === "run-script") {
    return second;
  }
  // `npm t`, and bun's own runner.
  return first === "t" || (program === "bun" && first === "test") ? "test" : first;
};

const scriptKinds = (name: string): Kind[] => [
  ...(SCRIPTS.find(([pattern]) => pattern.test(name))?.[1] ?? []),
];

const kindsOf = (program: string, args: readonly string[]): Kind[] => {
  const words = positionals(args);
  const [sub = "", subsub = ""] = words;
  if (
    args.includes("--help") ||
    args.includes("--version") ||
    sub === "install" ||
    sub === "help"
  ) {
    return [];
  }
  if (PACKAGE_MANAGERS.has(program)) {
    return scriptKinds(scriptOf(program, words));
  }
  if (TASK_RUNNERS.has(program)) {
    return words.filter((word) => word !== "run").flatMap(scriptKinds);
  }
  if ((program === "node" || program === "tsx") && args.includes("--test")) {
    return ["test"];
  }
  if (["curl", "http", "wget", "xh"].includes(program)) {
    return args.some((arg) => LOCAL_URL.test(arg)) ? ["e2e"] : [];
  }
  const found =
    TOOLS.get(`${program} ${sub} ${subsub}`) ??
    TOOLS.get(`${program} ${sub}`) ??
    TOOLS.get(program) ??
    [];
  return [...found];
};

const gitEdits = (sub: string, args: readonly string[]) => {
  if (!GIT_EDITS.has(sub)) {
    return false;
  }
  if (sub === "checkout" || sub === "switch") {
    return !args.some((arg) => /^-[bBcC]$/u.test(arg));
  }
  if (sub === "reset") {
    return args.some((arg) => arg === "--hard" || arg === "--keep" || arg === "--merge");
  }
  if (sub === "stash") {
    return !args.includes("list") && !args.includes("show");
  }
  return true;
};

const editsFiles = (
  program: string,
  args: readonly string[],
  inRepo: (path: string) => boolean,
) => {
  const words = positionals(args);
  const [sub = ""] = words;
  if (args.includes("--fix") || args.includes("--write")) {
    return true;
  }
  if (program === "sed" || program === "perl") {
    const isInPlace = args.some((arg) => /^-[a-z]*i/iu.test(arg) || arg.startsWith("--in-place"));
    return isInPlace && inRepo(words.at(-1) ?? "");
  }
  if (FILE_COMMANDS.has(program)) {
    return words.some(inRepo);
  }
  if (program === "git") {
    return gitEdits(sub, args);
  }
  if (PACKAGE_MANAGERS.has(program)) {
    const isInstall = (sub === "install" || sub === "i") && words.length > 1;
    return (
      INSTALLS.has(sub) || isInstall || /fix|write|codegen|generate/u.test(scriptOf(program, words))
    );
  }
  if (FORMATTERS.has(program) || FORMATTERS.has(`${program} ${sub}`)) {
    return !args.some((arg) => arg === "--check" || arg === "--diff");
  }
  return (program === "prettier" || program === "gofmt") && args.includes("-w");
};

// Whether a path a command names lies in the repository: absolute ones by
// prefix, home- and variable-relative ones never, relative ones while the
// command has not left it.
const isRepoPath = (path: string, { isCwdInside, root }: Place) => {
  if (path === "" || path.startsWith("-") || path.startsWith("/dev/")) {
    return false;
  }
  if (path.startsWith("/")) {
    return path === root || path.startsWith(`${root}/`);
  }
  return /^[~$]/u.test(path) ? false : isCwdInside;
};

// Whether a `cd` leaves the command inside the repository.
const cdInside = (to: string, place: Place) =>
  to.startsWith("/") || /^[~$]/u.test(to)
    ? isRepoPath(to, { ...place, isCwdInside: false })
    : place.isCwdInside;

const merge = (effects: readonly Effect[]): Effect => {
  const isEdit = effects.some((effect) => effect.isEdit);
  const kinds = KINDS.filter((kind) => effects.some((effect) => effect.kinds.includes(kind)));
  return {
    isEdit,
    isMasked: effects.some((effect) => effect.isMasked),
    isQuiet: !isEdit && kinds.length === 0 && effects.every((effect) => effect.isQuiet),
    kinds,
  };
};

// What one simple command does to the code.
const commandEffect = (
  program: string,
  args: readonly string[],
  targets: readonly string[],
  place: Place,
) => {
  const inRepo = (path: string) => isRepoPath(path, place);
  const kinds = kindsOf(program, args);
  const sub = positionals(args)[0] ?? "";
  return {
    isEdit: targets.some(inRepo) || editsFiles(program, args, inRepo),
    isMasked: false,
    isQuiet: program === "" || READ_ONLY.has(program) || (program === "git" && GIT_READS.has(sub)),
    kinds,
  };
};

// What a Bash call does, command by command. A check's exit status is hidden
// from the call's when a pipe or anything but && follows it.
const bashEffect = (line: string, root: string): Effect => {
  let place: Place = { isCwdInside: true, root };
  const commands = commandsOf(line);
  const effects = commands.map(({ op, words }, i): Effect => {
    const { args: all, targets } = splitRedirects(words);
    const [program = "", ...args] = unwrap(all);
    const shell = args.findIndex((arg) => /^-[a-z]*c$/u.test(arg));
    if (program === "cd") {
      place = { ...place, isCwdInside: cdInside(args[0] ?? "~", place) };
      return QUIET;
    }
    const effect =
      SHELLS.has(program) && shell !== -1
        ? bashEffect(args[shell + 1] ?? "", root)
        : commandEffect(program, args, targets, place);
    const hasMore = i < commands.length - 1;
    const isMasked = effect.kinds.length > 0 && (op === "|" || (hasMore && op !== "&&"));
    // The script itself is in a heredoc or a quoted word, so read the whole line.
    const isScripted = INTERPRETERS.has(program) && WRITE_API.test(line);
    return {
      ...effect,
      isEdit: effect.isEdit || isScripted,
      isMasked: effect.isMasked || isMasked,
      isQuiet: effect.isQuiet && !isScripted,
    };
  });
  return merge(effects);
};

const effectOf = (use: Use, root: string): Effect => {
  if (EDIT_TOOLS.has(use.tool)) {
    const isEdit = !use.isError && isRepoPath(use.file, { isCwdInside: true, root });
    return isEdit ? { ...QUIET, isEdit, isQuiet: false } : QUIET;
  }
  if (use.tool === "Bash" && !use.isBackground) {
    return bashEffect(use.command, root);
  }
  return BROWSER_TOOL.test(use.tool) ? { ...QUIET, isQuiet: false, kinds: ["e2e"] } : QUIET;
};

const relativeTo = (path: string, root: string) =>
  path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;

// A command as the grader reads it: on one line, heredoc bodies left out.
const labelOf = (use: Use) => {
  const command = use.command.replaceAll(HEREDOC, "<<$<delimiter>$<rest>");
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
