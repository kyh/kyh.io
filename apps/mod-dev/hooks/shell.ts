export interface Simple {
  words: string[];
  op: string;
  input: string;
}

type TokenPart = "double" | "escaped" | "plain" | "single";

const MARK = "\u0000";

const HEREDOC =
  /<<-?[ \t]*(?<quote>["']?)(?<delimiter>\w+)\k<quote>(?<rest>[^\n]*)\n(?<body>[\s\S]*?)\n[ \t]*\k<delimiter>[ \t]*(?=\n|$)/gu;

const TOKEN =
  /(?<op>&&|\|\||[\n;&|()])|(?<redirect><<<|<<|>>|>\||[<>])|'(?<single>[^']*)'?|"(?<double>(?:[^"\\]|\\[\s\S])*)"?|\\(?<escaped>[\s\S]?)|(?<plain>[^\s;&|()<>'"\\]+)|[^\S\n]+/gu;

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

export const withoutHeredocs = (line: string) => line.replaceAll(HEREDOC, "<<$<delimiter>$<rest>");

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

export const commandsOf = (line: string) => {
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

const dropOptions = (words: readonly string[]) => {
  let at = 0;

  while (at < words.length && /^-|^\d+[smhd]?$/u.test(words[at] ?? "")) {
    at += WRAPPER_VALUE_FLAGS.has(words[at] ?? "") ? 2 : 1;
  }

  return words.slice(at);
};

export const unwrap = (words: readonly string[]) => {
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
