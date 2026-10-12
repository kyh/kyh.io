// A run: the stretch Claude keeps working, scored by the output tokens it
// spends. It survives a quiet gap of GRACE_MS so the next prompt can carry it
// on; past that it is over and goes to the leaderboard.

export const GRACE_MS = 5000;

export interface Result {
  tokens: number;
  coins: number;
  seconds: number;
  // Where it placed among players' bests; null when the leaderboard did not answer.
  rank: number | null;
}

export type Run =
  | { kind: "idle"; last: Result | null }
  | { kind: "live"; startedAt: number; tokens: number }
  | { kind: "ending"; startedAt: number; tokens: number; endsAt: number };

export const idle: Run = { kind: "idle", last: null };

export const isActive = (run: Run) => run.kind !== "idle";

export const startTurn = (run: Run, now: number): Run =>
  run.kind === "idle"
    ? { kind: "live", startedAt: now, tokens: 0 }
    : { kind: "live", startedAt: run.startedAt, tokens: run.tokens };

export const addTokens = (run: Run, tokens: number): Run =>
  run.kind === "idle" ? run : { ...run, tokens: run.tokens + tokens };

export const endTurn = (run: Run, now: number): Run =>
  run.kind === "live" ? { ...run, endsAt: now + GRACE_MS, kind: "ending" } : run;

// The run's result once its grace has passed; null while it can still go on.
// Its time stops where Claude went quiet, not where the grace ran out.
export const resultOf = (run: Run, now: number, coins: number): Omit<Result, "rank"> | null =>
  run.kind === "ending" && now >= run.endsAt
    ? {
        coins,
        seconds: Math.round((run.endsAt - GRACE_MS - run.startedAt) / 1000),
        tokens: run.tokens,
      }
    : null;

const tokensOf = (count: number) => `${count.toLocaleString("en-US")} tokens`;

export const statusOf = (run: Run, coins: number) => {
  if (run.kind === "live") {
    return `● LIVE · ${tokensOf(run.tokens)} · ● ${coins}`;
  }
  if (run.kind === "ending") {
    return `◐ prompt within ${GRACE_MS / 1000}s to keep the run · ${tokensOf(run.tokens)} · ● ${coins}`;
  }
  if (!run.last) {
    return "○ idle · a run starts with your next prompt";
  }
  const place = run.last.rank === null ? "" : ` · #${run.last.rank} on the leaderboard`;
  return `○ idle · last run ${tokensOf(run.last.tokens)}${place}`;
};

// The leaderboard's answer to a posted run: `{ "rank": n }`.
export const rankOf = (body: string) => {
  const rank = Number(/"rank":\s*(?<rank>\d+)/u.exec(body)?.groups?.rank);
  return Number.isInteger(rank) && rank > 0 ? rank : null;
};
