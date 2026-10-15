// The demo session the site plays beside the live game: prompts typed,
// Claude working through them, the quiet gaps between. Everything on screen
// is a pure function of the time into the loop, so it never drifts.
import { addTokens, endTurn, idle, resultOf, startTurn } from "@repo/mod-commuting-clawders/run";
import type { Run } from "@repo/mod-commuting-clawders/run";

export type Line =
  | { kind: "prompt"; text: string }
  | { kind: "tool"; name: string; target: string; result: string }
  | { kind: "diff"; removed: string; added: string }
  | { kind: "say"; text: string }
  | { kind: "note"; text: string };

type Beat =
  | { kind: "type"; text: string; seconds: number }
  | { kind: "work"; verb: string; seconds: number; tokens: number; lines: Line[] }
  // Claude quiet past the grace: the run is over, and the screen rests.
  | { kind: "over"; seconds: number };

export interface Spinner {
  verb: string;
  seconds: number;
  tokens: number;
}

export interface DemoState {
  lines: Line[];
  input: string;
  spinner: Spinner | null;
  run: Run;
}

const GRACE_SECONDS = 5;

export const BEATS: readonly Beat[] = [
  {
    kind: "type",
    seconds: 3.2,
    text: "build a support agent that answers from our docs and hands off to a human when unsure",
  },
  {
    kind: "work",
    lines: [
      { kind: "tool", name: "Glob", result: "Found 48 files", target: "docs/**/*.md" },
      { kind: "tool", name: "Read", result: "Read 212 lines", target: "docs/support/refunds.md" },
      { kind: "tool", name: "Write", result: "Wrote 96 lines", target: "agent/tools.ts" },
      { kind: "tool", name: "Write", result: "Wrote 142 lines", target: "agent/index.ts" },
      { added: "tools: [searchDocs, escalateToHuman],", kind: "diff", removed: "tools: []," },
      {
        kind: "say",
        text: "The agent searches the docs, cites its sources, and hands off when its confidence drops below 0.6.",
      },
    ],
    seconds: 16,
    tokens: 4830,
    verb: "Architecting",
  },
  { kind: "type", seconds: 2.6, text: "add evals for the hand-off" },
  {
    kind: "work",
    lines: [
      { kind: "tool", name: "Write", result: "Wrote 18 cases", target: "evals/hand-off.yaml" },
      { kind: "tool", name: "Bash", result: "16/18 passed", target: "pnpm eval hand-off" },
      {
        added: "if (confidence < 0.6 || mentionsRefund(question)) return escalate();",
        kind: "diff",
        removed: "if (confidence < 0.6) return escalate();",
      },
      { kind: "tool", name: "Bash", result: "18/18 passed", target: "pnpm eval hand-off" },
      { kind: "say", text: "Refund questions now always reach a person. All 18 cases pass." },
    ],
    seconds: 13,
    tokens: 3120,
    verb: "Evaluating",
  },
  { kind: "type", seconds: 2.4, text: "stream the replies and show a typing indicator" },
  {
    kind: "work",
    lines: [
      { kind: "tool", name: "Update", result: "Updated 31 lines", target: "agent/server.ts" },
      { kind: "tool", name: "Update", result: "Updated 12 lines", target: "web/chat.tsx" },
      { kind: "tool", name: "Bash", result: "64 passed", target: "pnpm test" },
      {
        kind: "say",
        text: "Replies stream token by token; the indicator shows until the first one lands.",
      },
    ],
    seconds: 11,
    tokens: 2410,
    verb: "Streaming",
  },
  { kind: "type", seconds: 2, text: "ship it behind a flag" },
  {
    kind: "work",
    lines: [
      {
        kind: "tool",
        name: "Bash",
        result: "Switched to a new branch",
        target: "git switch -c support-agent",
      },
      { added: "support_agent_v1: { default: false },", kind: "diff", removed: "" },
      { kind: "tool", name: "Bash", result: "#482 opened", target: "gh pr create --fill" },
      { kind: "say", text: "Opened #482 with the agent behind support_agent_v1, off by default." },
    ],
    seconds: 8,
    tokens: 1140,
    verb: "Shipping",
  },
  { kind: "over", seconds: GRACE_SECONDS + 4 },
];

const START = 1.5;

export const LOOP_SECONDS = BEATS.reduce((sum, beat) => sum + beat.seconds, START);

const ms = (seconds: number) => Math.round(seconds * 1000);

export const demoAt = (time: number): DemoState => {
  const t = time % LOOP_SECONDS;
  const lines: Line[] = [];
  let input = "";
  let spinner: Spinner | null = null;
  let run: Run = idle;
  let at = START;
  for (const beat of BEATS) {
    if (t < at) {
      break;
    }
    const into = Math.min(t - at, beat.seconds);
    const done = t >= at + beat.seconds;
    if (beat.kind === "type") {
      input = done
        ? ""
        : beat.text.slice(0, Math.ceil((into / (beat.seconds * 0.8)) * beat.text.length));
      if (done) {
        lines.push({ kind: "prompt", text: beat.text });
      }
    } else if (beat.kind === "work") {
      run = startTurn(run, ms(at));
      const share = into / beat.seconds;
      const tokens = Math.round(share * beat.tokens);
      run = addTokens(run, tokens);
      const shown = Math.floor(share * (beat.lines.length + 1));
      lines.push(...beat.lines.slice(0, done ? beat.lines.length : shown));
      if (done) {
        run = endTurn(run, ms(at + beat.seconds));
      } else {
        spinner = { seconds: Math.floor(into), tokens, verb: beat.verb };
      }
    } else if (into >= GRACE_SECONDS) {
      const result = resultOf(run, ms(at + GRACE_SECONDS), 0);
      if (result) {
        run = { kind: "idle", last: { ...result, rank: null } };
        lines.push({
          kind: "note",
          text: `Commuting Clawders: run over at ${result.tokens.toLocaleString("en-US")} tokens, posted to the leaderboard`,
        });
      }
    }
    at += beat.seconds;
  }
  return { input, lines, run, spinner };
};

// Claude Code's spinner count: "980 tokens", "1.9k tokens".
export const formatTokens = (tokens: number) =>
  tokens < 1000 ? `${tokens}` : `${(tokens / 1000).toFixed(1)}k`;
