export const GRACE_MS = 5000;

export interface Result {
  tokens: number;
  coins: number;
  seconds: number;
  rank: number | null;
}

export type Run =
  | { kind: "idle"; last: Result | null }
  | { kind: "live"; startedAt: number; tokens: number }
  | { kind: "ending"; startedAt: number; tokens: number; endsAt: number };

export const idle: Run = { kind: "idle", last: null };

export const isActive = (run: Run) => run.kind !== "idle";

export const startTurn = (run: Run, now: number) =>
  (run.kind === "idle"
    ? { kind: "live", startedAt: now, tokens: 0 }
    : { kind: "live", startedAt: run.startedAt, tokens: run.tokens }) satisfies Run;

export const addTokens = (run: Run, tokens: number) =>
  (run.kind === "idle" ? run : { ...run, tokens: run.tokens + tokens }) satisfies Run;

export const endTurn = (run: Run, now: number) =>
  (run.kind === "live" ? { ...run, endsAt: now + GRACE_MS, kind: "ending" } : run) satisfies Run;

export const resultOf = (run: Run, now: number, coins: number) =>
  (run.kind === "ending" && now >= run.endsAt
    ? {
        coins,
        seconds: Math.round((run.endsAt - GRACE_MS - run.startedAt) / 1000),
        tokens: run.tokens,
      }
    : null) satisfies Omit<Result, "rank"> | null;

const tokensOf = (count: number) => `${count.toLocaleString("en-US")} tokens`;

export const statusOf = (run: Run, coins: number, idleNote = "") => {
  const note = idleNote ? ` · ${idleNote}` : "";

  if (run.kind === "live") {
    return `● LIVE · ${tokensOf(run.tokens)} · ● ${coins}`;
  }

  if (run.kind === "ending") {
    return `◐ prompt within ${GRACE_MS / 1000}s to keep the run · ${tokensOf(run.tokens)} · ● ${coins}`;
  }

  if (!run.last) {
    return `○ idle · a run starts with your next prompt${note}`;
  }

  const place = run.last.rank === null ? "" : ` · #${run.last.rank} on the leaderboard`;

  return `○ idle · last run ${tokensOf(run.last.tokens)}${place}${note}`;
};

export const rankOf = (body: string) => {
  const rank = Number(/"rank":\s*(?<rank>\d+)/u.exec(body)?.groups?.rank);

  return Number.isInteger(rank) && rank > 0 ? rank : null;
};
