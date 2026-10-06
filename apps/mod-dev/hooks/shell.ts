// Enough of the shell to read what an agent ran: a command line split into
// simple commands, quotes, escapes, redirections and heredocs understood, no
// expansions.

// One command between shell operators: its words, the operator after it, and
// what it reads from heredocs.
export interface Simple {
  words: string[];
  op: string;
  input: string;
}

type TokenPart = "double" | "escaped" | "plain" | "single";

// Stands in for a heredoc body while the line is split; a shell drops NULs,
// so no command has one.
const MARK = "\u0000";

const HEREDOC =
  /<<-?[ \t]*(?<quote>["']?)(?<delimiter>\w+)\k<quote>(?<rest>[^\n]*)\n(?<body>[\s\S]*?)\n[ \t]*\k<delimiter>[ \t]*(?=\n|$)/gu;
const TOKEN =
  /(?<op>&&|\|\||[\n;&|()])|(?<redirect><<<|<<|>>|>\||[<>])|'(?<single>[^']*)'?|"(?<double>(?:[^"\\]|\\[\s\S])*)"?|\\(?<escaped>[\s\S]?)|(?<plain>[^\s;&|()<>'"\\]+)|[^\S\n]+/gu;
// `2>&1`, `>&2`, `&>`: where streams go, not words of the command.
const DUPLICATION = /\d*[<>]&\d*-?|&>>?/gu;

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
// Wrapper flags that take a value: `env -u NAME`, `nice -n 5`, `npx -p pkg`.
const WRAPPER_VALUE_FLAGS = new Set([
  "-k",
  "-n",
  "-p",
  "-s",
  "-u",
  "--kill-after",
  "--package",
  "--signal",
  "--unset",
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

// A line with each heredoc's body left out, for showing it on one line.
export const withoutHeredocs = (line: string) => line.replaceAll(HEREDOC, "<<$<delimiter>$<rest>");

// Takes the heredoc bodies out of a line, a numbered mark left where each was.
const liftHeredocs = (line: string) => {
  const bodies: string[] = [];
  let source = "";
  let at = 0;
  for (const { 0: whole, groups = {}, index } of line.matchAll(HEREDOC)) {
    source += `${line.slice(at, index)}<< ${MARK}${bodies.length}${groups.rest ?? ""}`;
    bodies.push(groups.body ?? "");
    at = index + whole.length;
  }
  return { bodies, source: source + line.slice(at) };
};

// The text a token adds to its word, quotes and escapes removed; undefined
// for whitespace and operators.
const wordText = ({ double, escaped, plain, single }: Partial<Record<TokenPart, string>>) =>
  plain ?? single ?? double?.replaceAll(/\\(?<char>[\s\S])/gu, "$<char>") ?? escaped;

const split = (source: string) => {
  const commands: { op: string; words: string[] }[] = [];
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

// Splits a command line at unquoted ; & | && || ( ) and newlines into simple
// commands, each its words with the quotes removed and redirections as words
// of their own. A heredoc's body goes to the command that reads it.
export const commandsOf = (line: string): Simple[] => {
  const { bodies, source } = liftHeredocs(line);
  return split(
    source
      .replaceAll("\\\n", "")
      .replaceAll(DUPLICATION, (op) => (op.startsWith("&") ? op.slice(1) : " ")),
  ).map(({ op, words }) => ({
    input: words
      .filter((word) => word.startsWith(MARK))
      .map((word) => bodies[Number(word.slice(MARK.length))] ?? "")
      .join("\n"),
    op,
    words,
  }));
};

// The words that are not flags, skipping the values of flags that take one.
export const positionals = (args: readonly string[]) => {
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

// A wrapper's own options: flags, durations, and the values some flags take.
const dropOptions = (words: readonly string[]) => {
  let at = 0;
  while (at < words.length && /^-|^\d+[smhd]?$/u.test(words[at] ?? "")) {
    at += WRAPPER_VALUE_FLAGS.has(words[at] ?? "") ? 2 : 1;
  }
  return words.slice(at);
};

// The command under its wrappers: `npx vitest` is vitest, `pnpm exec tsc` is
// tsc, `CI=1 timeout 60 pytest` is pytest.
export const unwrap = (words: readonly string[]): readonly string[] => {
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

// A command's words apart from its redirections, and the files it writes to.
export const splitRedirects = (words: readonly string[]) => {
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
