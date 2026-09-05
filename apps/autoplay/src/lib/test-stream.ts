"use client";

import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";

// A stand-in for the director session, for working on everything downstream
// of it — the recording, the upload, the live tail, the replay — without
// paying fal for a minute of video per try. It plays a stored recording of a
// real session on a loop and hands its picture and sound over as the stream,
// answers `configure` and `prompt` the way the model does (a chunk under
// that version, a second later), and is only ever reachable from a
// development build with ?teststream in the URL.

/** One real session, recorded as it aired, stitched into a single file. */
const TEST_STREAM_URL = "https://euxclvii9nvaixnr.public.blob.vercel-storage.com/test/stream.webm";
/** How long after a prompt its "chunk" is reported, standing in for generation. */
const CHUNK_DELAY_MS = 1_000;

declare global {
  // Every browser that plays WebM has it; the DOM typings do not.
  interface HTMLMediaElement {
    captureStream(): MediaStream;
  }
}

type Handlers = {
  onMedia: (stream: MediaStream) => void;
  onData: (raw: string) => void;
};

/** The client messages the director takes; the stand-in answers the first two. */
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

/** The server messages the stand-in sends, a subset of the director's. */
type ServerMessage =
  | { type: "configured"; prompt_version: number }
  | { type: "prompt_applied"; prompt_version: number }
  | { type: "chunk"; prompt_version: number; buffer_depth_seconds: number };

export type TestStreamSession = {
  send(message: ClientMessage): void;
  close(): void;
};

export const testStreamRequested = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("teststream");

/** A program for the stand-in: no source is read, nothing is spent. */
export const testStreamProgram = (n: number): LiveProgram => ({
  itemId: `test:${n}`,
  kind: "x",
  text: `Test stream ${n} — ${new Date().toLocaleTimeString()}`,
  authorName: "Test stream",
  authorUsername: "teststream",
  prompt: `Test stream ${n}`,
});

export const openTestStreamSession = (handlers: Handlers): TestStreamSession => {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = TEST_STREAM_URL;
  let closed = false;
  const timers: number[] = [];

  // The stream is the element's output, so it has to be playing. A browser
  // without a gesture refuses sound, and muting the element only silences
  // the speakers: the captured audio still carries the recording's own.
  const start = async () => {
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play().catch(() => undefined);
    }
    if (!closed) handlers.onMedia(video.captureStream());
  };
  void start();

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
      const version = sent.prompt_version;
      if (sent.type === "configure") emit({ type: "configured", prompt_version: version });
      emit({ type: "prompt_applied", prompt_version: version });
      timers.push(
        window.setTimeout(
          () => emit({ type: "chunk", prompt_version: version, buffer_depth_seconds: 1 }),
          CHUNK_DELAY_MS,
        ),
      );
    },
    close: () => {
      closed = true;
      for (const timer of timers) window.clearTimeout(timer);
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
};
