"use client";

import { upload } from "@vercel/blob/client";

import type { LiveProgram } from "@/lib/api-contract";

// Records the live stream as one continuous recording per session, handed to
// the store ten seconds at a time. One MediaRecorder run for the whole
// session: its chunks are slices of a single WebM stream — the first carries
// the container header, the rest follow on — which is what lets a replay
// append them back into one unbroken video. Each chunk goes straight from
// the browser to the store with a token the station mints, then the station
// is told what it was and which program was on air when it began.

/** Well under the store's per-chunk ceiling; fine for 768p of this kind of picture. */
const VIDEO_BITS_PER_SECOND = 1_500_000;
const MIME_TYPE = "video/webm;codecs=vp8,opus";
/** How much stream each upload carries: what a dead tab loses at most. */
const CHUNK_MS = 10_000;

export type OnAir = {
  program: LiveProgram;
  formatLabel: string;
};

export type Recorder = {
  /** What is on air now; stamped on the chunks recorded from here. */
  setOnAir(onAir: OnAir): void;
  /** Finish the recording; the last chunk is handed over. */
  stop(): void;
};

export const canRecord = (): boolean =>
  "MediaRecorder" in globalThis && MediaRecorder.isTypeSupported(MIME_TYPE);

const publish = async (
  sourceId: string,
  sessionId: string,
  index: number,
  file: Blob,
  seconds: number,
  onAir: OnAir,
): Promise<void> => {
  if (file.size === 0) return;
  const put = await upload(`recordings/${sourceId}/${sessionId}/${index}.webm`, file, {
    access: "public",
    contentType: "video/webm",
    handleUploadUrl: "/api/recordings/upload",
  });
  await fetch("/api/recordings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId,
      sessionId,
      index,
      url: put.url,
      formatLabel: onAir.formatLabel,
      itemId: onAir.program.itemId,
      text: onAir.program.text,
      authorName: onAir.program.authorName,
      authorUsername: onAir.program.authorUsername,
      seconds,
      bytes: file.size,
    }),
  });
};

export const createRecorder = (stream: MediaStream, sourceId: string, onAir: OnAir): Recorder => {
  const sessionId = crypto.randomUUID();
  const recorder = new MediaRecorder(stream, {
    mimeType: MIME_TYPE,
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
  });
  let current = onAir;
  let index = 0;
  let chunkStartedAt = Date.now();
  recorder.ondataavailable = (event) => {
    const seconds = Math.max(1, Math.round((Date.now() - chunkStartedAt) / 1000));
    chunkStartedAt = Date.now();
    // A failed upload loses ten seconds of replay, nothing more; the stream
    // on screen is unaffected.
    void publish(sourceId, sessionId, index, event.data, seconds, current).catch(() => undefined);
    index += 1;
  };
  recorder.start(CHUNK_MS);
  return {
    setOnAir: (next) => {
      current = next;
    },
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
};
