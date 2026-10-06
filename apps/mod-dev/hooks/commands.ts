// What a tool call does to the code: the checks it runs, and whether it
// edits the repository. Read off Bash commands by what they run, through
// package scripts, task runners and wrappers. Pure, so it is tested alone.

import { commandsOf, positionals, splitRedirects, unwrap } from "./shell";

export type Kind = "static" | "test" | "build" | "e2e";

export const KINDS: readonly Kind[] = ["static", "test", "build", "e2e"];

// A tool call, as far as what it does to the code goes.
export interface Call {
  tool: string;
  command: string;
  file: string;
  isBackground: boolean;
  isError: boolean;
}

// What a call does: the kinds of check it runs, whether it edits, whether a
// pipe hides a check's exit status, and whether it only reads.
export interface Effect {
  kinds: Kind[];
  isEdit: boolean;
  isMasked: boolean;
  isQuiet: boolean;
}

// Where a command runs: the repository, and whether a `cd` has left it.
interface Place {
  root: string;
  isCwdInside: boolean;
}

const QUIET: Effect = { isEdit: false, isMasked: false, isQuiet: true, kinds: [] };

export const EDIT_TOOLS = new Set(["Edit", "MultiEdit", "NotebookEdit", "Write"]);
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
// How a script an interpreter runs inline (`python3 - <<EOF`, `node -e`)
// writes or moves files.
const WRITE_API =
  /\bopen\([^)]*["'][awx]b?\+?["']|(?<!std(?:out|err))\.write(?:_bytes|_text)?\(|\b(?:appendFile|rename|rm|unlink|writeFile)(?:Sync)?\(|\bshutil\.|\bos\.(?:remove|rename|replace)\(|\bfile_put_contents\(/u;
const LOCAL_URL = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])\b/u;
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
// Flags that point a command at a directory: `git -C`, `pnpm --dir`.
const DIR_FLAGS = new Set(["-C", "--cwd", "--dir", "--prefix"]);

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
  // A plugin loaded into a real session is a plugin run for real.
  if (program === "claude" && args.includes("--plugin-dir")) {
    return ["e2e"];
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

// Where a command acts: the directory a flag points it at, else where it runs.
const dirOf = (args: readonly string[]) => {
  const at = args.findIndex((arg) => DIR_FLAGS.has(arg));
  return at === -1 ? "." : (args[at + 1] ?? ".");
};

const editsFiles = (
  program: string,
  args: readonly string[],
  inRepo: (path: string) => boolean,
) => {
  const words = positionals(args);
  const [sub = ""] = words;
  // Commands that write the paths they name.
  if (program === "sed" || program === "perl") {
    const isInPlace = args.some((arg) => /^-[a-z]*i/iu.test(arg) || arg.startsWith("--in-place"));
    return isInPlace && inRepo(words.at(-1) ?? "");
  }
  if (FILE_COMMANDS.has(program)) {
    return words.some(inRepo);
  }
  // The rest write where they act.
  if (!inRepo(dirOf(args))) {
    return false;
  }
  if (args.includes("--fix") || args.includes("--write")) {
    return true;
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

// What one simple command does to the code. `input` is what it reads from
// heredocs: an interpreter's script, when it is fed one.
const commandEffect = (
  program: string,
  args: readonly string[],
  { input, place, targets }: { input: string; place: Place; targets: readonly string[] },
) => {
  const inRepo = (path: string) => isRepoPath(path, place);
  const isScripted =
    INTERPRETERS.has(program) && inRepo(".") && WRITE_API.test([...args, input].join("\n"));
  const sub = positionals(args)[0] ?? "";
  const isRead =
    program === "" || READ_ONLY.has(program) || (program === "git" && GIT_READS.has(sub));
  return {
    isEdit: isScripted || targets.some(inRepo) || editsFiles(program, args, inRepo),
    isMasked: false,
    isQuiet: isRead && !isScripted,
    kinds: kindsOf(program, args),
  };
};

// What a Bash call does, command by command. A check's exit status is hidden
// from the call's when a pipe or anything but && follows it.
const bashEffect = (line: string, root: string): Effect => {
  let place: Place = { isCwdInside: true, root };
  const commands = commandsOf(line);
  const effects = commands.map(({ input, op, words }, i): Effect => {
    const { args: all, targets } = splitRedirects(words);
    const [program = "", ...args] = unwrap(all);
    if (program === "cd") {
      place = { ...place, isCwdInside: cdInside(args[0] ?? "~", place) };
      return QUIET;
    }
    // A shell's own script: `sh -c '...'`, or a heredoc fed to `bash`.
    const flag = args.findIndex((arg) => /^-[a-z]*c$/u.test(arg));
    const script = flag === -1 ? input : (args[flag + 1] ?? "");
    const effect =
      SHELLS.has(program) && script !== ""
        ? bashEffect(script, root)
        : commandEffect(program, args, { input, place, targets });
    const hasMore = i < commands.length - 1;
    const isMasked = effect.kinds.length > 0 && (op === "|" || (hasMore && op !== "&&"));
    return { ...effect, isMasked: effect.isMasked || isMasked };
  });
  return merge(effects);
};

export const effectOf = (call: Call, root: string): Effect => {
  if (EDIT_TOOLS.has(call.tool)) {
    const isEdit = !call.isError && isRepoPath(call.file, { isCwdInside: true, root });
    return isEdit ? { ...QUIET, isEdit, isQuiet: false } : QUIET;
  }
  if (call.tool === "Bash" && !call.isBackground) {
    return bashEffect(call.command, root);
  }
  return BROWSER_TOOL.test(call.tool) ? { ...QUIET, isQuiet: false, kinds: ["e2e"] } : QUIET;
};
