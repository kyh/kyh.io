// Run by `claude plugin test` against the engine itself: the mod's hooks with
// the clock, the environment, git and the leaderboard answered beneath.
import type { Engine } from "claude-code/testing";
import type { On } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

const LEADERBOARD = "https://leaderboard.test";

const ran = (stdout: string, exitCode = 0) => ({
  value: { exitCode, isStderrTruncated: false, isStdoutTruncated: false, stderr: "", stdout },
});

// The world beneath the mod: what it opened, and every run it posted.
const world = (on: On, { rank = 3 } = {}) => {
  const clock = mock.clock(on);
  mock.env(on, {});
  const opened: (string | undefined)[] = [];
  const posted: unknown[] = [];
  on("process.run", (_$, e) => ran(e.argv[0] === "git" ? "Kai\n" : "Darwin\n"));
  on("ui.open", (_$, e) => {
    opened.push(e.title);
    return { value: { isPlaced: true } };
  });
  on("http.fetch", (_$, e) => {
    posted.push({ body: JSON.parse(e.init?.body ?? "null"), url: e.url });
    return { value: { headers: {}, ok: true, status: 201, text: JSON.stringify({ rank }) } };
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("turn.start", (_$, e) => ({ turnId: e.turnId }));
  on("turn.complete", () => ({ text: "" }));
  // oxlint-disable-next-line require-yield -- the model beneath answers whole: no chunks, only the result
  on("turn.step", async function* answer(_$, e) {
    return {
      answer: "",
      index: e.index,
      stopReason: "end_turn",
      toolUses: [],
      turnId: e.turnId,
      usage: {
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        input_tokens: 10,
        model: "opus",
        output_tokens: Number(e.model),
      },
    };
  });
  return { clock, opened, posted };
};

const start = { cwd: "/repo", isInteractive: true, surface: "terminal" } as const;

// One model request inside a turn; the mock beneath reads its output tokens
// from the model name.
const step = async ($: Engine, tokens: number, agentId?: string) => {
  const stream = $.turn.step({
    agentId,
    index: 0,
    messageCount: 1,
    model: String(tokens),
    turnId: "t",
  });
  let piece = await stream.next();
  while (!piece.done) {
    piece = await stream.next();
  }
};

const turn = async ($: Engine, tokens: number) => {
  await $.turn.start({ text: "go", turnId: "t" });
  await step($, tokens);
  await $.turn.complete({
    answer: "",
    durationMs: 1,
    isAborted: false,
    reason: "answer",
    turnId: "t",
  });
};

test("opens the Subway Clauders pane when the session starts", async ($, on) => {
  const { opened } = world(on);
  await $.session.start(start);
  expect(opened).toEqual(["Subway Clauders"]);
});

test(
  "posts a run's output tokens once Claude has been quiet for five seconds",
  { options: { leaderboardUrl: LEADERBOARD } },
  async ($, on) => {
    const { clock, posted } = world(on);
    await $.session.start(start);
    await turn($, 700);
    await clock.advance(4999);
    expect(posted).toEqual([]);
    await clock.advance(1);
    expect(posted).toEqual([
      { body: { coins: 0, name: "Kai", seconds: 0, tokens: 700 }, url: `${LEADERBOARD}/runs` },
    ]);
  },
);

test(
  "a prompt within the grace carries the run on",
  { options: { leaderboardUrl: LEADERBOARD, playerName: "kyh" } },
  async ($, on) => {
    const { clock, posted } = world(on);
    await $.session.start(start);
    await turn($, 300);
    await clock.advance(3000);
    await turn($, 200);
    await clock.advance(5000);
    expect(posted).toEqual([
      { body: { coins: 0, name: "kyh", seconds: 3, tokens: 500 }, url: `${LEADERBOARD}/runs` },
    ]);
  },
);

test(
  "a subagent finishing does not end the run, and its tokens count",
  { options: { leaderboardUrl: LEADERBOARD } },
  async ($, on) => {
    const { clock, posted } = world(on);
    await $.session.start(start);
    await $.turn.start({ text: "go", turnId: "t" });
    await step($, 40, "agent-1");
    await $.turn.complete({
      agentId: "agent-1",
      answer: "",
      durationMs: 1,
      isAborted: false,
      reason: "answer",
      turnId: "t",
    });
    await clock.advance(10_000);
    expect(posted).toEqual([]);
    await $.turn.complete({
      answer: "",
      durationMs: 1,
      isAborted: false,
      reason: "answer",
      turnId: "t",
    });
    await clock.advance(5000);
    expect(posted.length).toBe(1);
  },
);

test(
  "posts nothing with the leaderboard off",
  { options: { leaderboard: false, leaderboardUrl: LEADERBOARD } },
  async ($, on) => {
    const { clock, posted } = world(on);
    await $.session.start(start);
    await turn($, 700);
    await clock.advance(5000);
    expect(posted).toEqual([]);
  },
);
