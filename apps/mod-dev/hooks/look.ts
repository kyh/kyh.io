// How the reviewer reads the repository: between its answers it may ask to
// read a file, grep the code or list a directory, and the mod runs those for
// it, read-only and inside the repository. Pure but for running them, which
// register.tsx does.

const KINDS = ["read", "grep", "list"] as const;

export type LookKind = (typeof KINDS)[number];

export interface Look {
  kind: LookKind;
  // What to read or list, or the pattern to grep for.
  target: string;
  // A grep's path, a read's lines.
  path?: string;
  from?: number;
  to?: number;
}

export const MAX_ROUNDS = 3;
export const MAX_LOOKS = 8;
const MAX_LINES = 200;
const MAX_MATCHES = 60;
const MAX_ENTRIES = 80;

const LOOK = /^[\s*`-]*(?<kind>read|grep|list)[\s*`]*:\s*(?<arg>.+?)[\s`]*$/gimu;
const RANGE = /^(?<path>.+?):(?<from>\d+)(?:-(?<to>\d+))?$/u;
const GREP_IN = /^(?<pattern>.+?)\s+in\s+(?<path>\S+)$/u;

// A path the reviewer may look at: relative, inside the repository.
export const isSafePath = (path: string) =>
  path !== "" && !path.startsWith("/") && !path.startsWith("~") && !path.split("/").includes("..");

const lookOf = (kind: LookKind, arg: string): Look | undefined => {
  if (kind === "grep") {
    const found = GREP_IN.exec(arg)?.groups;
    const path = found?.path;
    if (path !== undefined && !isSafePath(path)) {
      return;
    }
    return path === undefined
      ? { kind, target: arg }
      : { kind, path, target: found?.pattern ?? arg };
  }
  const range = RANGE.exec(arg)?.groups;
  const target = range?.path ?? arg.replace(/\/$/u, "");
  if (!isSafePath(target) && !(kind === "list" && target === ".")) {
    return;
  }
  if (range === undefined) {
    return { kind, target };
  }
  const from = Number(range.from);
  return {
    from,
    kind,
    target,
    to: range.to === undefined ? from + MAX_LINES - 1 : Number(range.to),
  };
};

// The looks an answer asks for, the first few; none when it is a scorecard.
export const looksOf = (text: string): Look[] => {
  const looks: Look[] = [];
  for (const { groups = {} } of text.matchAll(LOOK)) {
    const kind = KINDS.find((one) => one === groups.kind?.toLowerCase());
    const look = kind === undefined ? undefined : lookOf(kind, groups.arg ?? "");
    if (look !== undefined) {
      looks.push(look);
    }
  }
  return looks.slice(0, MAX_LOOKS);
};

// A file's lines as the reviewer reads them, numbered, within its range.
export const linesOf = (text: string, { from = 1, target, to }: Look) => {
  const lines = text.split("\n");
  const last = Math.min(lines.length, to ?? from + MAX_LINES - 1, from + MAX_LINES - 1);
  const shown = lines
    .slice(from - 1, last)
    .map((line, i) => `${String(from + i).padStart(5)}  ${line}`);
  const more =
    lines.length > last
      ? [`[… ${lines.length - last} more lines: read: ${target}:${last + 1}-${last + MAX_LINES}]`]
      : [];
  return [...shown, ...more].join("\n");
};

export const matchesOf = (stdout: string) => {
  const lines = stdout
    .trimEnd()
    .split("\n")
    .filter((line) => line !== "");
  const more = lines.length > MAX_MATCHES ? [`[… ${lines.length - MAX_MATCHES} more matches]`] : [];
  return lines.length === 0 ? "(no matches)" : [...lines.slice(0, MAX_MATCHES), ...more].join("\n");
};

export const entriesOf = (entries: readonly { name: string; kind: string }[]) => {
  const names = entries
    .map(({ kind, name }) => (kind === "directory" ? `${name}/` : name))
    .toSorted();
  const more = names.length > MAX_ENTRIES ? [`[… ${names.length - MAX_ENTRIES} more]`] : [];
  return names.length === 0 ? "(empty)" : [...names.slice(0, MAX_ENTRIES), ...more].join("\n");
};

// How a look is named back to the reviewer.
export const lookLabel = ({ from, kind, path, target, to }: Look) => {
  if (kind === "grep") {
    return `grep: ${target}${path === undefined ? "" : ` in ${path}`}`;
  }
  return `${kind}: ${target}${from === undefined ? "" : `:${from}-${to}`}`;
};

// What the reviewer saw, appended to its prompt for the next round.
export const lookedText = (round: number, results: readonly { look: Look; text: string }[]) =>
  [
    `<looked round="${round}">`,
    ...results.map(({ look, text }) => `--- ${lookLabel(look)}\n${text}`),
    "</looked>",
  ].join("\n");
