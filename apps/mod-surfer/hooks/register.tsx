import { atom, read, update } from "claude-code";
import type {
  EngineInterface,
  HookStream,
  ProcessSpawnChunk,
  ProcessSpawnResult,
  Register,
} from "claude-code";

import type { Caption, Tally, View } from "../types";

import { SPEECH_SCRIPT, readMs, speechRequest, toSentences } from "./narrate";
import {
  drawsImages,
  effectsBetween,
  frameUrl,
  lastWords,
  parseFrame,
  placementOf,
  countsOf,
} from "./screen";
import type { Counts, Frame, Mode } from "./screen";
import { synthesizeEffects } from "./sfx";
import type { Effect } from "./sfx";

const PANE = "subway";
const SCREEN = "game";
const TITLE = "Subway Clauders";
const FRAME_MS = 33;
const TALLY_MS = 1000;
const MAX_QUEUE = 30;
const SFX_GAIN = 0.45;
const LOG_MAX = 4000;

const caption = atom({ key: "caption", plugin: "mod-surfer" } as const, "");
const isRunning = atom({ key: "isRunning", plugin: "mod-surfer" } as const, false);
const starting: View = { kind: "starting" };
const view = atom({ key: "view", plugin: "mod-surfer" } as const, starting);
const noTally: Tally = { coins: 0, score: 0 };
const tally = atom({ key: "tally", plugin: "mod-surfer" } as const, noTally);

// One line of narration and, once asked for, its mp3 as base64 (empty when
// synthesis failed).
interface Line {
  text: Caption;
  audio?: Promise<string>;
}

// The streamer: headless Chrome drawing the world, one per open pane.
type Streamer =
  | { kind: "off" | "launching" }
  | {
      kind: "starting" | "live";
      child: HookStream<ProcessSpawnChunk, ProcessSpawnResult>;
      socketPath: string;
      imagePath: string;
    };

interface Size {
  columns: number;
  rows: number;
}

interface Screen {
  isPulling: boolean;
  latest: Frame | null;
  mode: Mode;
  // What the last drawing mounted; blits go only to that.
  mounted: (Size & { mode: Mode }) | null;
  size: Size | null;
  streamer: Streamer;
  talliedAt: number;
  // The run's counts as of the last frame shown, to hear what just happened.
  heard: Counts | null;
  chimedAt: number;
}

// Frame-rate values live in the module: a reload starts a fresh run.
const queue: Line[] = [];
const openai = { key: "", model: "gpt-4o-mini-tts", voice: "ash" };
const screen: Screen = {
  chimedAt: 0,
  heard: null,
  isPulling: false,
  latest: null,
  mode: "cells",
  mounted: null,
  size: null,
  streamer: { kind: "off" },
  talliedAt: 0,
};
interface Sfx {
  canPlay: boolean;
  isOn: boolean;
  // Synthesized on first use, then kept.
  sounds: Record<Effect, string> | null;
}
const sfx: Sfx = { canPlay: false, isOn: true, sounds: null };
let running = false;
let muted = false;
let speaking = false;
let canSpeak = true;

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

const stopStreamer = async (streamer: Streamer) => {
  if (!("child" in streamer)) {
    return;
  }
  try {
    await streamer.child.return({ code: null, signal: null });
  } catch {
    // It had ended already.
  }
};

// Reads the streamer's output until it ends: `ready` makes it live; an end
// nobody asked for leaves its last words in the pane.
const watch = async ($: EngineInterface, streamer: Streamer & { kind: "starting" }) => {
  let output = "";
  let ending: ProcessSpawnResult | null = null;
  try {
    for (;;) {
      const piece = await streamer.child.next();
      if (piece.done) {
        ending = piece.value;
        break;
      }
      output = (output + piece.value.text).slice(-LOG_MAX);
      if (
        screen.streamer === streamer &&
        piece.value.stream === "stdout" &&
        output.includes("ready")
      ) {
        screen.streamer = { ...streamer, kind: "live" };
      }
    }
  } catch (error) {
    output += `\n${String(error)}`;
  }
  $.ui.log(
    `mod-surfer streamer ended (${ending?.signal ?? ending?.code ?? "no start"}):\n${output}`,
    { to: "debug" },
  );
  if (!("child" in screen.streamer) || screen.streamer.child !== streamer.child) {
    return;
  }
  screen.streamer = { kind: "off" };
  screen.mounted = null;
  const reason = lastWords(output) || "the streamer stopped";
  await update($, view, (): View => ({ kind: "failed", reason }));
};

const startStreamer = async ($: EngineInterface) => {
  screen.streamer = { kind: "launching" };
  // oxlint-disable-next-line prefer-destructuring -- the engine reads $ from source and refuses any spelling but $.plugin.root
  const root = $.plugin.root;
  const [tmpDir, term, termProgram] = await Promise.all([
    $.env.get("TMPDIR"),
    $.env.get("TERM"),
    $.env.get("TERM_PROGRAM"),
  ]);
  screen.mode = drawsImages(term, termProgram) ? "image" : "cells";
  const { imagePath, socketPath } = placementOf(
    tmpDir,
    Math.floor(Math.random() * 1e9).toString(36),
  );
  const child = $.process.spawn({
    argv: [
      `${root}/node_modules/.bin/tsx`,
      `${root}/stream/stream.ts`,
      "--socket",
      socketPath,
      "--image",
      imagePath,
    ],
    cwd: root,
  });
  const streamer = { child, imagePath, kind: "starting", socketPath } as const;
  screen.streamer = streamer;
  void watch($, streamer);
};

// The pane is gone: let Chrome go until it is drawn again.
const closeScreen = async ($: EngineInterface) => {
  const { streamer } = screen;
  screen.streamer = { kind: "off" };
  screen.mounted = null;
  screen.latest = null;
  screen.heard = null;
  await stopStreamer(streamer);
  await update($, view, () => starting);
};

const sameSize = (a: Size, b: Size) => a.columns === b.columns && a.rows === b.rows;

const blit = ($: EngineInterface, frame: Frame, imagePath: string) =>
  frame.cells === undefined
    ? $.ui.blit({
        key: SCREEN,
        requestId: PANE,
        source: {
          file: imagePath,
          format: "rgba",
          generation: frame.frame,
          height: frame.height,
          width: frame.width,
        },
      })
    : $.ui.blit({
        cells: frame.cells,
        columns: frame.columns,
        key: SCREEN,
        requestId: PANE,
        rows: frame.rows,
      });

const playEffect = async ($: EngineInterface, effect: Effect) => {
  sfx.sounds ??= synthesizeEffects();
  try {
    await $.audio.play({ base64: sfx.sounds[effect], mime: "audio/wav" }, { gain: SFX_GAIN });
  } catch {
    // A missed effect is not worth a toast.
  }
};

// Sounds what happened between the last frame shown and this one.
const hear = ($: EngineInterface, frame: Frame) => {
  const { chimedAt, effects } = effectsBetween(screen.heard, frame, screen.chimedAt);
  screen.heard = countsOf(frame);
  screen.chimedAt = chimedAt;
  if (sfx.isOn && sfx.canPlay) {
    for (const effect of effects) {
      void playEffect($, effect);
    }
  }
};

// Puts a frame on screen: blitted onto what is mounted, or, when the pane
// still shows something else, a redraw that mounts it.
const show = async ($: EngineInterface, frame: Frame, imagePath: string) => {
  const { mounted, size } = screen;
  const isCells = frame.cells !== undefined;
  if (!size || !sameSize(frame, size) || isCells !== (screen.mode === "cells")) {
    return;
  }
  screen.latest = frame;
  if (!mounted || mounted.mode !== screen.mode || !sameSize(mounted, frame)) {
    await update($, view, (): View => ({
      columns: frame.columns,
      kind: "live",
      mode: screen.mode,
      rows: frame.rows,
    }));
    return;
  }
  let deny: string | undefined = "the pane is closed";
  try {
    ({ deny } = await blit($, frame, imagePath));
  } catch {
    // Thrown, like denied: nothing is mounted any more.
  }
  if (deny && screen.mode === "image") {
    // The terminal draws the Image's alt: no pictures here after all.
    screen.mode = "cells";
    return;
  }
  if (deny) {
    await closeScreen($);
    return;
  }
  hear($, frame);
  if (frame.frame - screen.talliedAt >= TALLY_MS / FRAME_MS) {
    screen.talliedAt = frame.frame;
    await update($, tally, () => ({ coins: frame.coins, score: frame.score }));
  }
};

const pull = async ($: EngineInterface) => {
  const { size, streamer } = screen;
  if (screen.isPulling || streamer.kind !== "live" || !size) {
    return;
  }
  screen.isPulling = true;
  try {
    const since = screen.latest?.frame ?? -1;
    const url = frameUrl(since, screen.mode, size.columns, size.rows, running || speaking);
    const response = await $.http.fetch(url, { socketPath: streamer.socketPath });
    const frame = response.status === 200 ? parseFrame(response.headers, response.text) : null;
    if (frame) {
      await show($, frame, streamer.imagePath);
    }
  } catch {
    // The streamer is going; its watcher says why.
  } finally {
    screen.isPulling = false;
  }
};

const statusOf = (isActive: boolean, isQuiet: boolean, { coins, score }: Tally) => {
  const parts = [
    isActive ? "● LIVE" : "○ idle",
    `${String(Math.floor(score)).padStart(6, "0")} · ● ${coins}`,
  ];
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
  sfx.isOn = options.sfx !== false;

  on("session.start", async ($, e, next) => {
    const key = String(options.openaiApiKey ?? "") || ((await $.env.get("OPENAI_API_KEY")) ?? "");
    sfx.canPlay = await canPlayClips($);
    openai.key = key && sfx.canPlay ? key : "";
    if (key && !openai.key) {
      $.ui.toast("mod-surfer: OpenAI voice plays on macOS only, using the system voice");
    }
    void $.ui.open({ id: PANE, title: TITLE });
    // oxlint-disable-next-line unicorn/no-array-method-this-argument -- $.clock.every is a timer, not Array#every
    $.clock.every(FRAME_MS, () => {
      void pull($);
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
    const status = statusOf(isActive, muted, await read($, tally));

    if (e.surface !== "terminal") {
      const { Box, Text } = $.ui.resolve(e);
      return (
        <Box flexDirection="column">
          <Text dimColor>{status}</Text>
          <Text bold>{line || "…"}</Text>
        </Box>
      );
    }

    const { Box, Image, Raster, Text } = $.ui.resolve(e);
    const size = {
      columns: Math.max(20, Math.min(255, e.props.bodyColumns)),
      rows: Math.max(8, Math.min(255, (e.viewport?.rows ?? 30) - 10)),
    };
    screen.size = size;
    const before = await read($, view);
    if (screen.streamer.kind === "off" && before.kind !== "failed") {
      await startStreamer($);
    }

    const shown = await read($, view);
    const { latest, streamer } = screen;
    const isMountable =
      shown.kind === "live" &&
      latest !== null &&
      sameSize(latest, size) &&
      streamer.kind === "live";
    let game = (
      <Text dimColor>{shown.kind === "failed" ? `✗ ${shown.reason}` : "Starting the subway…"}</Text>
    );
    screen.mounted = null;
    if (isMountable && screen.mode === "image" && latest.cells === undefined) {
      screen.mounted = { ...size, mode: "image" };
      game = (
        <Image
          alt="Subway Clauders"
          columns={size.columns}
          key={SCREEN}
          rows={size.rows}
          source={{
            file: streamer.imagePath,
            format: "rgba",
            generation: latest.frame,
            height: latest.height,
            width: latest.width,
          }}
        />
      );
    } else if (isMountable && latest.cells !== undefined) {
      screen.mounted = { ...size, mode: "cells" };
      game = <Raster cells={latest.cells} columns={size.columns} key={SCREEN} rows={size.rows} />;
    }

    return (
      <Box flexDirection="column">
        {game}
        <Text dimColor>{status}</Text>
        <Text bold color="yellow" wrap="wrap">
          {line || (isActive ? "…" : "Narration plays while Claude works.")}
        </Text>
      </Box>
    );
  });
};
