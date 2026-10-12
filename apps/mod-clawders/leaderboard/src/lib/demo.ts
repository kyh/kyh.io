// The demo session the site plays beside the live game: prompts typed,
// Claude working through them, the quiet gaps between. Everything on screen
// is a pure function of the time into the loop, so it never drifts.
import { addTokens, endTurn, idle, resultOf, startTurn } from "@repo/mod-clawders/run";
import type { Run } from "@repo/mod-clawders/run";

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

const BEATS: Beat[] = [
  { kind: "type", seconds: 2.2, text: "add dark mode to the settings page" },
  {
    kind: "work",
    lines: [
      { kind: "tool", name: "Read", result: "Read 84 lines", target: "src/settings/page.tsx" },
      { kind: "tool", name: "Update", result: "Updated 2 lines", target: "src/settings/theme.ts" },
      {
        added: 'const theme = stored ?? (prefersDark ? "dark" : "light");',
        kind: "diff",
        removed: 'const theme = "light";',
      },
      { kind: "say", text: "Dark mode follows the system and remembers a manual pick." },
    ],
    seconds: 9,
    tokens: 1240,
    verb: "Clauding",
  },
  { kind: "type", seconds: 2.6, text: "now write tests for it" },
  {
    kind: "work",
    lines: [
      {
        kind: "tool",
        name: "Write",
        result: "Wrote 42 lines",
        target: "src/settings/theme.test.ts",
      },
      { kind: "tool", name: "Bash", result: "12 passed", target: "pnpm test" },
      { kind: "say", text: "Tests cover the system default, a stored choice and toggling." },
    ],
    seconds: 7.5,
    tokens: 960,
    verb: "Bootstrapping",
  },
  { kind: "type", seconds: 1.8, text: "commit and push" },
  {
    kind: "work",
    lines: [
      {
        kind: "tool",
        name: "Bash",
        result: "main 3f2c1a9",
        target: 'git commit -m "settings: dark mode"',
      },
      { kind: "say", text: "Committed and pushed to main." },
    ],
    seconds: 5,
    tokens: 410,
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
          text: `Clawders: run over at ${result.tokens.toLocaleString("en-US")} tokens, posted to the leaderboard`,
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
