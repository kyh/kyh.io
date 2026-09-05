"use client";

import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";

// A stand-in for the director session, for working on everything downstream
// of it — the recording, the upload, the live tail, the replay — without
// paying fal for a minute of video per try. It draws a test card with a
// clock and the prompt on air, answers `configure` and `prompt` the way the
// model does (a chunk under that version, a second later), and is only ever
// reachable from a development build with ?testpattern in the URL.

const WIDTH = 1344;
const HEIGHT = 768;
const FPS = 24;
/** How long after a prompt its "chunk" is reported, standing in for generation. */
const CHUNK_DELAY_MS = 1_000;

type Handlers = {
  onMedia: (stream: MediaStream) => void;
  onData: (raw: string) => void;
};

/** The client messages the director takes; the test card answers the first two. */
const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("configure"),
    protocol_version: z.literal(1),
    prompt: z.string(),
    prompt_version: z.number(),
    resolution: z.string().optional(),
    aspect_ratio: z.string().optional(),
  }),
  z.object({ type: z.literal("prompt"), prompt: z.string(), prompt_version: z.number() }),
  z.object({ type: z.literal("stop") }),
  z.object({ type: z.literal("ping"), ts: z.number() }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

/** The server messages the test card sends, a subset of the director's. */
type ServerMessage =
  | { type: "configured"; prompt_version: number }
  | { type: "prompt_applied"; prompt_version: number }
  | { type: "chunk"; prompt_version: number; buffer_depth_seconds: number };

export type TestPatternSession = {
  send(message: ClientMessage): void;
  close(): void;
};

export const testPatternRequested = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("testpattern");

/** A program for the test card: no source is read, nothing is spent. */
export const testPatternProgram = (n: number): LiveProgram => ({
  itemId: `test:${n}`,
  kind: "x",
  text: `Test pattern ${n} — ${new Date().toLocaleTimeString()}`,
  authorName: "Test pattern",
  authorUsername: "testpattern",
  prompt: `Test pattern ${n}`,
});

export const openTestPatternSession = (handlers: Handlers): TestPatternSession => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  let prompt = "";
  let version = 0;
  let frame = 0;
  let closed = false;
  const timers: number[] = [];

  const draw = () => {
    if (closed || context === null) return;
    frame += 1;
    const bars = ["#c0c0c0", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];
    bars.forEach((color, i) => {
      context.fillStyle = color;
      context.fillRect((WIDTH / bars.length) * i, 0, WIDTH / bars.length + 1, HEIGHT * 0.6);
    });
    context.fillStyle = "#101010";
    context.fillRect(0, HEIGHT * 0.6, WIDTH, HEIGHT * 0.4);
    context.fillStyle = "#ffffff";
    context.font = "bold 64px monospace";
    context.fillText(new Date().toISOString().slice(11, 19), 40, HEIGHT * 0.6 + 90);
    context.font = "32px monospace";
    context.fillText(`v${version}  ${prompt.slice(0, 60)}`, 40, HEIGHT * 0.6 + 160);
    // A moving block, so a still frame and a stalled stream look different.
    context.fillStyle = "#ff3ec8";
    context.fillRect((frame * 8) % WIDTH, HEIGHT * 0.6 + 200, 60, 60);
  };
  const ticker = window.setInterval(draw, 1000 / FPS);
  timers.push(ticker);

  const stream = canvas.captureStream(FPS);
  // A tone, if the browser lets an AudioContext run without a gesture. When
  // it stays suspended the track carries no samples and a WebM recorder
  // waits for them forever, so a suspended context means no audio track.
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  gain.gain.value = 0.02;
  oscillator.frequency.value = 440;
  const destination = audio.createMediaStreamDestination();
  oscillator.connect(gain).connect(destination);
  oscillator.start();
  void audio.resume().catch(() => undefined);

  timers.push(
    window.setTimeout(() => {
      if (closed) return;
      if (audio.state === "running") {
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      }
      handlers.onMedia(stream);
    }, 500),
  );

  const emit = (message: ServerMessage) => {
    if (!closed) handlers.onData(JSON.stringify(message));
  };

  return {
    send: (message) => {
      if (closed) return;
      const parsed = clientMessageSchema.safeParse(message);
      if (!parsed.success) return;
      const sent = parsed.data;
      if (sent.type === "stop" || sent.type === "ping") return;
      version = sent.prompt_version;
      prompt = sent.prompt;
      if (sent.type === "configure") emit({ type: "configured", prompt_version: version });
      emit({ type: "prompt_applied", prompt_version: version });
      const chunkVersion = version;
      timers.push(
        window.setTimeout(
          () => emit({ type: "chunk", prompt_version: chunkVersion, buffer_depth_seconds: 1 }),
          CHUNK_DELAY_MS,
        ),
      );
    },
    close: () => {
      closed = true;
      for (const timer of timers) window.clearTimeout(timer);
      oscillator.stop();
      void audio.close();
      for (const track of stream.getTracks()) track.stop();
    },
  };
};
