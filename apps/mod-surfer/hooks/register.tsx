import { atom, read, update } from "claude-code";
import type { EngineInterface, Register } from "claude-code";

import type { Caption } from "../types";

import { draw, encode, newGame, step } from "./game";
import { SPEECH_SCRIPT, readMs, speechRequest, toSentences } from "./narrate";

const PANE = "subway";
const TITLE = "Subway Clauders";
const FRAME_MS = 66;
const MAX_QUEUE = 30;

const caption = atom({ key: "caption", plugin: "mod-surfer" } as const, "");
const isRunning = atom({ key: "isRunning", plugin: "mod-surfer" } as const, false);

// One line of narration and, once asked for, its mp3 as base64 (empty when
// synthesis failed).
interface Line {
  text: Caption;
  audio?: Promise<string>;
}

// Frame-rate values live in the module: a reload starts a fresh run.
const game = newGame();
const queue: Line[] = [];
const openai = { key: "", model: "gpt-4o-mini-tts", voice: "ash" };
let size: { cols: number; rows: number } | null = null;
let running = false;
let muted = false;
let speaking = false;
let canSpeak = true;
let pausedFrameSent = false;

const runSpeech = async ($: EngineInterface, text: Caption) => {
  try {
    const { exitCode, stdout } = await $.process.run(["sh", "-c", SPEECH_SCRIPT], {
      env: { OPENAI_API_KEY: openai.key },
      stdin: speechRequest(text, openai.voice, openai.model),
      timeoutMs: 40_000,
    });
    return exitCode === 0 ? stdout.trim() : "";
  } catch {
    return "";
  }
};

const synthesize = ($: EngineInterface, line: Line) => {
  line.audio ??= runSpeech($, line.text);
  return line.audio;
};

// Synthesizes the next lines while the current one plays, so lines run on
// without a request's wait between them.
const prefetch = ($: EngineInterface) => {
  if (!openai.key || muted) {
    return;
  }
  for (const line of queue.slice(0, 2)) {
    void synthesize($, line);
  }
};

// Plays the line with OpenAI's voice; false when nothing could be played.
const playOpenai = async ($: EngineInterface, line: Line) => {
  const audio = await synthesize($, line);
  if (!audio) {
    openai.key = "";
    $.ui.toast("mod-surfer: OpenAI speech failed, using the system voice");
    return false;
  }
  await update($, caption, () => line.text);
  try {
    await $.audio.play({ base64: audio, mime: "audio/mpeg" });
    return true;
  } catch {
    // Stop paying for speech nobody hears; the system voice takes over.
    openai.key = "";
    $.ui.toast("mod-surfer: OpenAI audio would not play, using the system voice");
    return false;
  }
};

// `$.audio.play` plays clips through afplay, so only macOS hears them.
const canPlayClips = async ($: EngineInterface) => {
  try {
    const { stdout } = await $.process.run(["uname", "-s"]);
    return stdout.trim() === "Darwin";
  } catch {
    return false;
  }
};

const playSystem = async ($: EngineInterface, line: Line) => {
  await update($, caption, () => line.text);
  if (!canSpeak) {
    return false;
  }
  try {
    await $.audio.speak(line.text);
    return true;
  } catch {
    canSpeak = false;
    $.ui.toast("mod-surfer: no speech synthesizer here, captions only");
    return false;
  }
};

// Whether the line was heard; when not, its caption still shows.
const voice = async ($: EngineInterface, line: Line) => {
  if (muted) {
    await update($, caption, () => line.text);
    return false;
  }
  if (openai.key) {
    const isPlayed = await playOpenai($, line);
    if (isPlayed || openai.key) {
      return isPlayed;
    }
  }
  return playSystem($, line);
};

// Says the next queued line, then schedules the one after it; a line nobody
// heard stays up for as long as it takes to read.
const sayNext = async ($: EngineInterface) => {
  const line = queue.shift();
  if (!line) {
    speaking = false;
    $.clock.after(1500, () => {
      if (!speaking) {
        void update($, caption, () => "");
      }
    });
    return;
  }
  prefetch($);
  let isHeard = false;
  try {
    isHeard = await voice($, line);
  } catch {
    // A failed line still keeps the queue moving.
    isHeard = false;
  }
  $.clock.after(isHeard ? 1 : readMs(line.text), () => {
    void sayNext($);
  });
};

const narrate = ($: EngineInterface) => {
  if (speaking) {
    return;
  }
  speaking = true;
  $.clock.after(1, () => {
    void sayNext($);
  });
};

const frame = async ($: EngineInterface) => {
  if (!size) {
    return;
  }
  const isActive = running || speaking;
  if (isActive) {
    step(game, FRAME_MS / 1000);
    pausedFrameSent = false;
  } else if (pausedFrameSent) {
    return;
  } else {
    pausedFrameSent = true;
  }
  const cells = encode(draw(game, size.cols, size.rows, !isActive));
  try {
    const { deny } = await $.ui.blit({ cells, key: "game", requestId: PANE });
    if (deny) {
      size = null;
    }
  } catch {
    // The pane is closed: stop drawing until it renders again.
    size = null;
  }
};

const statusOf = (isActive: boolean, isQuiet: boolean) => {
  const parts = [isActive ? "● LIVE" : "○ idle"];
  if (isQuiet) {
    parts.push("muted");
  } else {
    parts.push(openai.key ? `openai ${openai.voice}` : "system voice");
  }
  return `${parts.join(" · ")}${speaking && !isQuiet ? " 🔊" : ""}`;
};

export const register: Register = (on, options) => {
  openai.voice = String(options.voice ?? openai.voice);
  openai.model = String(options.model ?? openai.model);
  muted = options.mute === true;

  on("session.start", async ($, e, next) => {
    const key = String(options.openaiApiKey ?? "") || ((await $.env.get("OPENAI_API_KEY")) ?? "");
    openai.key = key && (await canPlayClips($)) ? key : "";
    if (key && !openai.key) {
      $.ui.toast("mod-surfer: OpenAI voice plays on macOS only, using the system voice");
    }
    void $.ui.open({ id: PANE, title: TITLE });
    // oxlint-disable-next-line unicorn/no-array-method-this-argument -- $.clock.every is a timer, not Array#every
    $.clock.every(FRAME_MS, () => {
      void frame($);
    });

    return next(e);
  });

  // A new prompt makes the rest of the last reply stale.
  on("prompt.submit", ($, e, next) => {
    queue.length = 0;
    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    running = true;
    await update($, isRunning, () => true);
    return next(e);
  });

  on("turn.complete", async ($, e, next) => {
    running = false;
    await update($, isRunning, () => false);
    return next(e);
  });

  on("session.append", ($, e, next) => {
    if (e.agentId || e.door !== "response" || e.message.role !== "assistant") {
      return next(e);
    }
    const text = e.message.content
      .flatMap((block) => (block.type === "text" ? [String(block.text)] : []))
      .join("\n");
    // A long reply is read from its start; lines past the cap are dropped.
    const room = Math.max(0, MAX_QUEUE - queue.length);
    queue.push(
      ...toSentences(text)
        .slice(0, room)
        .map((sentence) => ({ text: sentence })),
    );
    prefetch($);
    narrate($);

    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const line = await read($, caption);
    const isActive = await read($, isRunning);
    const status = statusOf(isActive, muted);

    if (e.surface !== "terminal") {
      const { Box, Text } = $.ui.resolve(e);
      return (
        <Box flexDirection="column">
          <Text dimColor>{status}</Text>
          <Text bold>{line || "…"}</Text>
        </Box>
      );
    }

    const { Box, Raster, Text } = $.ui.resolve(e);
    const cols = Math.max(20, Math.min(512, e.props.bodyColumns));
    const rows = Math.max(8, Math.min(256, (e.viewport?.rows ?? 30) - 10));
    size = { cols, rows };
    pausedFrameSent = false;
    const cells = encode(draw(game, cols, rows, !(running || speaking)));

    return (
      <Box flexDirection="column">
        <Raster key="game" columns={cols} rows={rows} cells={cells} />
        <Text dimColor>{status}</Text>
        <Text bold color="yellow" wrap="wrap">
          {line || (isActive ? "…" : "Narration plays while Claude works.")}
        </Text>
      </Box>
    );
  });
};
