const KINDS = ["read", "grep", "list"] as const;

export type LookKind = (typeof KINDS)[number];

export interface Look {
  kind: LookKind;
  target: string;
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

export const isSafePath = (path: string) =>
  path !== "" && !path.startsWith("/") && !path.startsWith("~") && !path.split("/").includes("..");

const lookOf = (kind: LookKind, arg: string) => {
  if (kind === "grep") {
    const found = GREP_IN.exec(arg)?.groups;
    const path = found?.path;

    if (path !== undefined && !isSafePath(path)) {
      return null;
    }

    return (
      path === undefined ? { kind, target: arg } : { kind, path, target: found?.pattern ?? arg }
    ) satisfies Look | null;
  }

  const range = RANGE.exec(arg)?.groups;
  const target = range?.path ?? arg.replace(/\/$/u, "");

  if (!isSafePath(target) && !(kind === "list" && target === ".")) {
    return null;
  }

  if (range === undefined) {
    return { kind, target } satisfies Look | null;
  }

  const from = Number(range.from);

  return {
    from,
    kind,
    target,
    to: range.to === undefined ? from + MAX_LINES - 1 : Number(range.to),
  } satisfies Look | null;
};

export const looksOf = (text: string) => {
  const looks: Look[] = [];

  for (const { groups = {} } of text.matchAll(LOOK)) {
    const kind = KINDS.find((one) => one === groups.kind?.toLowerCase());
    const look = kind === undefined ? null : lookOf(kind, groups.arg ?? "");

    if (look !== null) {
      looks.push(look);
    }
  }

  return looks.slice(0, MAX_LOOKS);
};

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

export const lookLabel = ({ from, kind, path, target, to }: Look) => {
  if (kind === "grep") {
    return `grep: ${target}${path === undefined ? "" : ` in ${path}`}`;
  }

  return `${kind}: ${target}${from === undefined ? "" : `:${from}-${to}`}`;
};

export const lookedText = (round: number, results: readonly { look: Look; text: string }[]) =>
  [
    `<looked round="${round}">`,
    ...results.map(({ look, text }) => `--- ${lookLabel(look)}\n${text}`),
    "</looked>",
  ].join("\n");
