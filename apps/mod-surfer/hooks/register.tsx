import { atom, read, update } from "claude-code";
import type {
  EngineInterface,
  HookStream,
  ProcessSpawnChunk,
  ProcessSpawnResult,
  Register,
} from "claude-code";

import type { View } from "../types";

import {
  GRACE_MS,
  addTokens,
  endTurn,
  idle,
  isActive,
  rankOf,
  resultOf,
  startTurn,
  statusOf,
} from "./run";
import type { Result, Run } from "./run";
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
const SFX_GAIN = 0.45;
const LOG_MAX = 4000;

const starting: View = { kind: "starting" };
const view = atom({ key: "view", plugin: "mod-surfer" } as const, starting);
const status = atom({ key: "status", plugin: "mod-surfer" } as const, statusOf(idle, 0));

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

interface Leaderboard {
  url: string;
  name: string;
}

// Frame-rate values live in the module: a reload starts a fresh run.
let run: Run = idle;
// Null when runs are not posted.
let leaderboard: Leaderboard | null = null;
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

// `$.audio.play` plays clips through afplay, so only macOS hears them.
const canPlayClips = async ($: EngineInterface) => {
  try {
    const { stdout } = await $.process.run(["uname", "-s"]);
    return stdout.trim() === "Darwin";
  } catch {
    return false;
  }
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
      "node",
      `${root}/dist/stream.mjs`,
      "--world",
      `${root}/dist/world`,
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
    await update($, status, () => statusOf(run, frame.coins));
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
    const url = frameUrl(since, screen.mode, size.columns, size.rows, {
      isActive: isActive(run),
      tokens: run.kind === "idle" ? 0 : run.tokens,
    });
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

const setRun = async ($: EngineInterface, next: Run) => {
  run = next;
  await update($, status, () => statusOf(next, screen.latest?.coins ?? 0));
};

// The name runs go up under: the configured one, else git's.
const playerName = async ($: EngineInterface, configured: string) => {
  if (configured) {
    return configured;
  }
  try {
    const { exitCode, stdout } = await $.process.run(["git", "config", "user.name"]);
    return exitCode === 0 && stdout.trim() ? stdout.trim() : "anonymous";
  } catch {
    return "anonymous";
  }
};

const post = async ($: EngineInterface, target: Leaderboard, result: Omit<Result, "rank">) => {
  try {
    const { ok, text } = await $.http.fetch(new URL("/runs", target.url).href, {
      body: JSON.stringify({ name: target.name, ...result }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return ok ? rankOf(text) : null;
  } catch {
    return null;
  }
};

// Ends the run once its grace has passed with no new prompt; the world starts
// a fresh game when the next one begins.
const finish = async ($: EngineInterface) => {
  const result = resultOf(run, await $.clock.now(), screen.latest?.coins ?? 0);
  if (!result) {
    return;
  }
  await setRun($, { kind: "idle", last: { ...result, rank: null } });
  if (!leaderboard) {
    return;
  }
  const rank = await post($, leaderboard, result);
  if (run.kind === "idle" && rank !== null) {
    await setRun($, { kind: "idle", last: { ...result, rank } });
  }
};

export const register: Register = (on, options) => {
  sfx.isOn = options.sfx !== false;
  const leaderboardUrl = String(options.leaderboardUrl ?? "");
  const isPosting = options.leaderboard !== false && leaderboardUrl.length > 0;

  on("session.start", async ($, e, next) => {
    sfx.canPlay = await canPlayClips($);
    if (isPosting) {
      leaderboard = {
        name: await playerName($, String(options.playerName ?? "")),
        url: leaderboardUrl,
      };
    }
    void $.ui.open({ id: PANE, title: TITLE });
    // oxlint-disable-next-line unicorn/no-array-method-this-argument -- $.clock.every is a timer, not Array#every
    $.clock.every(FRAME_MS, () => {
      void pull($);
    });

    return next(e);
  });

  on("turn.start", async ($, e, next) => {
    await setRun($, startTurn(run, await $.clock.now()));
    return next(e);
  });

  // Subagents' steps count: the run is everything Claude spends while it lasts.
  on("turn.step", async function* countTokens($, e, next) {
    // oxlint-disable-next-line node/callback-return -- the usage arrives in what the chain returns
    const result = yield* next(e);
    if (result.usage) {
      await setRun($, addTokens(run, result.usage.output_tokens));
    }
    return result;
  });

  // A subagent finishing is not Claude going quiet.
  on("turn.complete", async ($, e, next) => {
    if (!e.agentId) {
      await setRun($, endTurn(run, await $.clock.now()));
      $.clock.after(GRACE_MS, () => {
        void finish($);
      });
    }
    return next(e);
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const line = await read($, status);

    if (e.surface !== "terminal") {
      const { Text } = $.ui.resolve(e);
      return <Text>{line}</Text>;
    }

    const { Box, Image, Raster, Text } = $.ui.resolve(e);
    const size = {
      columns: Math.max(20, Math.min(255, e.props.bodyColumns)),
      rows: Math.max(8, Math.min(255, (e.viewport?.rows ?? 30) - 8)),
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
        <Text dimColor>{line}</Text>
      </Box>
    );
  });
};
