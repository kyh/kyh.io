// Run by `claude plugin test` against the engine itself: the mod's hooks with
// the clock, the environment, speech and the OpenAI request answered beneath.
import type { AudioClip, On, SessionAppendInput } from "claude-code";
import { expect, mock, test } from "claude-code/testing";
import type { Engine } from "claude-code/testing";

const KEY = "sk-test";
const MP3 = "bXAz";

const reply = (text: string, agentId?: string): SessionAppendInput => ({
  agentId,
  door: "response",
  message: { content: [{ text, type: "text" }], role: "assistant", type: "assistant" },
  origin: { kind: "model", model: "opus" },
  uuid: "row",
});

// The kit keeps no rows and a test's hook may not answer for one, so the
// append rejects at the bottom, after the mod's hook has run.
const respond = async ($: Engine, row: SessionAppendInput) => {
  await expect($.session.append(row)).rejects.toThrow("no implementation for session.append");
};

const ran = (stdout: string, exitCode = 0) => ({
  value: { exitCode, isStderrTruncated: false, isStdoutTruncated: false, stderr: "", stdout },
});

// The world beneath the mod: `os` is what `uname -s` prints, `speech` what the
// OpenAI request script exits with.
const world = (on: On, { env = {}, os = "Darwin", speech = 0 } = {}) => {
  const clock = mock.clock(on);
  mock.env(on, env);
  const opened: (string | undefined)[] = [];
  const requests: string[] = [];
  const played: AudioClip[] = [];
  const spoken: string[] = [];
  const toasts: string[] = [];
  on("process.run", (_$, e) => {
    if (e.argv[0] === "uname") {
      return ran(`${os}\n`);
    }
    requests.push(e.init?.stdin ?? "");
    return ran(speech === 0 ? MP3 : "", speech);
  });
  on("ui.open", (_$, e) => {
    opened.push(e.title);
    return { value: { isPlaced: true } };
  });
  on("audio.play", (_$, e) => {
    played.push(e.clip);
    return { value: undefined };
  });
  on("audio.speak", (_$, e) => {
    spoken.push(e.text);
    return { value: { via: "system" } };
  });
  on("ui.toast", (_$, e) => {
    toasts.push(e.text);
    return { value: undefined };
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  return { clock, opened, played, requests, spoken, toasts };
};

const start = { cwd: "/repo", isInteractive: true, surface: "terminal" } as const;

test("opens the Subway Clauders pane when the session starts", async ($, on) => {
  const { opened } = world(on);
  await $.session.start(start);
  expect(opened).toEqual(["Subway Clauders"]);
});

test("reads the main reply aloud in the system voice without a key", async ($, on) => {
  const { clock, requests, spoken } = world(on);
  await $.session.start(start);
  await respond($, reply("Fixed the bug. Tests pass."));
  await respond($, reply("A subagent's notes.", "agent-1"));
  await clock.advance(10);
  expect(spoken).toEqual(["Fixed the bug.", "Tests pass."]);
  expect(requests).toEqual([]);
});

test("speaks with OpenAI on macOS", { options: { openaiApiKey: KEY } }, async ($, on) => {
  const { clock, played, requests, spoken } = world(on);
  await $.session.start(start);
  await respond($, reply("Done."));
  await clock.advance(10);
  expect(JSON.parse(requests[0] ?? "{}")).toMatchObject({ input: "Done.", voice: "ash" });
  expect(played).toEqual([{ base64: MP3, mime: "audio/mpeg" }]);
  expect(spoken).toEqual([]);
});

test("reads the key from OPENAI_API_KEY", async ($, on) => {
  const { clock, played } = world(on, { env: { OPENAI_API_KEY: KEY } });
  await $.session.start(start);
  await respond($, reply("Done."));
  await clock.advance(10);
  expect(played.length).toBe(1);
});

test("keeps the system voice off macOS", { options: { openaiApiKey: KEY } }, async ($, on) => {
  const { clock, requests, spoken, toasts } = world(on, { os: "Linux" });
  await $.session.start(start);
  await respond($, reply("Done."));
  await clock.advance(10);
  expect(toasts).toEqual(["mod-surfer: OpenAI voice plays on macOS only, using the system voice"]);
  expect(requests).toEqual([]);
  expect(spoken).toEqual(["Done."]);
});

test(
  "falls back to the system voice when OpenAI fails",
  { options: { openaiApiKey: KEY } },
  async ($, on) => {
    const { clock, requests, spoken, toasts } = world(on, { speech: 22 });
    await $.session.start(start);
    await respond($, reply("One. Two."));
    await clock.advance(10);
    expect(toasts).toEqual(["mod-surfer: OpenAI speech failed, using the system voice"]);
    expect(spoken).toEqual(["One.", "Two."]);
    // The second line was prefetched before the first failed; none after.
    expect(requests.length).toBe(2);
  },
);

test(
  "muted, it says nothing and asks OpenAI nothing",
  { options: { mute: true, openaiApiKey: KEY } },
  async ($, on) => {
    const { clock, played, requests, spoken } = world(on);
    await $.session.start(start);
    await respond($, reply("Done."));
    await clock.advance(10_000);
    expect(requests).toEqual([]);
    expect(played).toEqual([]);
    expect(spoken).toEqual([]);
  },
);

test("a new prompt drops the lines not yet read", async ($, on) => {
  const { clock, spoken } = world(on);
  await $.session.start(start);
  await respond($, reply("One. Two. Three."));
  await $.prompt.submit({ origin: { kind: "composer" }, text: "next", wait: false });
  await clock.advance(10);
  expect(spoken).toEqual([]);
});
