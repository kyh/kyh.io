"use client";

import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";

/** One real session, recorded as it aired, stitched into a single file by scripts/stitch-test-stream.ts. */
export const TEST_STREAM_PATH = "test/stream.webm";
const TEST_STREAM_URL = `https://euxclvii9nvaixnr.public.blob.vercel-storage.com/${TEST_STREAM_PATH}`;
const CHUNK_DELAY_MS = 1000;

declare global {
  interface HTMLMediaElement {
    captureStream: () => MediaStream;
  }
}

interface Handlers {
  onMedia: (stream: MediaStream) => void;
  onData: (raw: string) => void;
}

const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    aspect_ratio: z.string().optional(),
    prompt: z.string(),
    prompt_version: z.number(),
    protocol_version: z.literal(1),
    resolution: z.string().optional(),
    type: z.literal("configure"),
  }),
  z.object({ prompt: z.string(), prompt_version: z.number(), type: z.literal("prompt") }),
  z.object({ type: z.literal("stop") }),
  z.object({ ts: z.number(), type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;

interface ServerMessage {
  type: "chunk";
  prompt_version: number;
  buffer_depth_seconds: number;
}

interface TestStreamSession {
  send: (message: ClientMessage) => void;
  close: () => void;
}

export const testStreamRequested = () =>
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("teststream");

/** A program for the stand-in: no source is read, nothing is spent. */
export const testStreamProgram = (n: number) => ({
  authorName: "Test stream",
  authorUsername: "teststream",
  itemId: `test:${n}`,
  kind: "x",
  link: `https://example.com/test-stream/${n}`,
  prompt: `Test stream ${n}`,
  text: `Test stream ${n} — ${new Date().toLocaleTimeString()}`,
});

export const openTestStreamSession = (handlers: Handlers) => {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = TEST_STREAM_URL;
  let closed = false;
  const timers: number[] = [];

  const start = async () => {
    try {
      await video.play();
    } catch {
      video.muted = true;
      await video.play().catch(() => {});
    }

    if (!closed) {
      handlers.onMedia(video.captureStream());
    }
  };

  void start();

  const emit = (message: ServerMessage) => {
    if (!closed) {
      handlers.onData(JSON.stringify(message));
    }
  };

  return {
    close: () => {
      closed = true;

      for (const timer of timers) {
        window.clearTimeout(timer);
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
    },
    send: (message) => {
      if (closed) {
        return;
      }

      const parsed = clientMessageSchema.safeParse(message);

      if (!parsed.success) {
        return;
      }

      const sent = parsed.data;

      if (sent.type === "stop" || sent.type === "ping") {
        return;
      }

      const version = sent.prompt_version;
      timers.push(
        window.setTimeout(
          () => emit({ buffer_depth_seconds: 1, prompt_version: version, type: "chunk" }),
          CHUNK_DELAY_MS,
        ),
      );
    },
  };
};
