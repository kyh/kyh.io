"use client";

import { upload } from "@vercel/blob/client";

import type { LiveProgram } from "@/lib/api-contract";

// Records the live stream one program at a time. Each program is its own
// MediaRecorder run, because a recorder stopped and restarted yields a
// complete, independently playable file — a single recorder sliced by
// timeslice does not, only its first slice carries the container header.
// The file goes straight from the browser to the store with a token the
// station mints, then the station is told what it was.

/** Well under the store's per-segment ceiling; fine for 768p of this kind of picture. */
const VIDEO_BITS_PER_SECOND = 1_500_000;
const MIME_TYPE = "video/webm;codecs=vp8,opus";

export type Segment = {
  program: LiveProgram;
  formatLabel: string;
  startedAt: number;
};

export type Recorder = {
  /** Finish the segment in progress, if any, and start one for `segment`. */
  rotate(segment: Segment): void;
  /** Finish the segment in progress and stop recording. */
  stop(): void;
};

export const canRecord = (): boolean =>
  "MediaRecorder" in globalThis && MediaRecorder.isTypeSupported(MIME_TYPE);

const publish = async (sourceId: string, segment: Segment, file: Blob): Promise<void> => {
  const seconds = Math.round((Date.now() - segment.startedAt) / 1000);
  if (seconds < 3 || file.size === 0) return;
  const put = await upload(`recordings/${sourceId}/${segment.program.itemId}.webm`, file, {
    access: "public",
    contentType: "video/webm",
    handleUploadUrl: "/api/recordings/upload",
  });
  await fetch("/api/recordings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId,
      itemId: segment.program.itemId,
      url: put.url,
      formatLabel: segment.formatLabel,
      text: segment.program.text,
      authorName: segment.program.authorName,
      authorUsername: segment.program.authorUsername,
      seconds,
      bytes: file.size,
    }),
  });
};

export const createRecorder = (stream: MediaStream, sourceId: string): Recorder => {
  let current: { recorder: MediaRecorder; segment: Segment } | undefined;

  const finish = () => {
    const active = current;
    current = undefined;
    if (active === undefined || active.recorder.state === "inactive") return;
    const { recorder, segment } = active;
    recorder.ondataavailable = (event) => {
      // A failed upload loses one segment of replay, nothing more; the
      // stream on screen is unaffected.
      void publish(sourceId, segment, event.data).catch(() => undefined);
    };
    recorder.stop();
  };

  return {
    rotate: (segment) => {
      finish();
      const recorder = new MediaRecorder(stream, {
        mimeType: MIME_TYPE,
        videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      });
      recorder.start();
      current = { recorder, segment };
    },
    stop: finish,
  };
};
