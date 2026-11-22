"use client";

import { upload } from "@vercel/blob/client";

import type { LiveProgram, RecordingRequest } from "@/lib/api-contract";
import { jsonRequest } from "@/lib/api-contract";
import { EBML_CLUSTER, EBML_SEGMENT, EBML_TIMECODE, readUint, readVint } from "@/lib/webm";

const VIDEO_BITS_PER_SECOND = 1_500_000;
const MIME_TYPE = "video/webm;codecs=vp8,opus";
const SLICE_MS = 2000;
const CHUNK_MS = 10_000;
const MAX_PENDING_BYTES = 8 * 1024 * 1024;

export interface OnAir {
  program: LiveProgram;
  formatLabel: string;
}

export interface Recorder {
  /** What is on air now; stamped on the chunks recorded from here. */
  setOnAir: (onAir: OnAir) => void;
  /** Finish the recording; the last whole clusters are handed over. */
  stop: () => void;
}

export const canRecord = () =>
  "MediaRecorder" in globalThis && MediaRecorder.isTypeSupported(MIME_TYPE);

interface Cluster {
  at: number;
  timecode: number;
}

const publish = async (
  sourceId: string,
  sessionId: string,
  index: number,
  bytes: Uint8Array<ArrayBuffer>,
  seconds: number,
  onAir: OnAir,
) => {
  if (bytes.length === 0) {
    return;
  }

  const file = new Blob([bytes], { type: "video/webm" });

  const put = await upload(`recordings/${sourceId}/${sessionId}/${index}.webm`, file, {
    access: "public",
    contentType: "video/webm",
    handleUploadUrl: "/api/recordings/upload",
  });

  const { prompt: _prompt, ...program } = onAir.program;

  const body: RecordingRequest = {
    ...program,
    bytes: bytes.length,
    formatLabel: onAir.formatLabel,
    index,
    seconds,
    sessionId,
    sourceId,
    url: put.url,
  };

  await fetch("/api/recordings", jsonRequest("POST", body));
};

export const createRecorder = (stream: MediaStream, sourceId: string, onAir: OnAir) => {
  const sessionId = crypto.randomUUID();

  const recorder = new MediaRecorder(stream, {
    mimeType: MIME_TYPE,
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
  });

  let current = onAir;
  let chunkOnAir = onAir;
  let index = 0;
  let chunkStartedAt = Date.now();
  let chunkTimecode: number | undefined;
  let pending: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let cursor = 0;
  let clusters: Cluster[] = [];
  let queue = Promise.resolve();
  const uploads = new Map<number, Promise<void>>();

  const walk = () => {
    for (;;) {
      const id = readVint(pending, cursor, true);

      if (id === undefined) {
        return;
      }

      const size = readVint(pending, cursor + id.length, false);

      if (size === undefined) {
        return;
      }

      const body = cursor + id.length + size.length;

      if (id.value === EBML_CLUSTER) {
        const timecodeId = readVint(pending, body, true);

        if (timecodeId === undefined) {
          return;
        }

        const timecodeSize = readVint(pending, body + timecodeId.length, false);

        if (timecodeSize === undefined) {
          return;
        }

        const timecodeAt = body + timecodeId.length + timecodeSize.length;

        if (timecodeAt + timecodeSize.value > pending.length) {
          return;
        }

        if (timecodeId.value === EBML_TIMECODE) {
          const timecode = readUint(pending, timecodeAt, timecodeSize.value);
          clusters.push({ at: cursor, timecode });
          chunkTimecode ??= timecode;
        }

        cursor = body;
      } else if (id.value === EBML_SEGMENT) {
        cursor = body;
      } else if (size.unknown) {
        return;
      } else {
        cursor = body + size.value;
      }
    }
  };

  const cut = (at: number, seconds: number, timecode?: number) => {
    const chunk = pending.slice(0, at);
    const chunkIndex = index;

    const settled = (async () => {
      await publish(sourceId, sessionId, chunkIndex, chunk, seconds, chunkOnAir).catch(() => null);
      uploads.delete(chunkIndex);
    })();

    uploads.set(chunkIndex, settled);
    index += 1;
    pending = pending.slice(at);
    cursor -= at;
    clusters = clusters
      .filter((cluster) => cluster.at >= at)
      .map((cluster) => ({
        at: cluster.at - at,
        timecode: cluster.timecode,
      }));
    chunkTimecode = timecode;
    chunkStartedAt = Date.now();
    chunkOnAir = current;
  };

  const cutWhereDue = () => {
    for (;;) {
      const start = chunkTimecode;

      const due =
        start === undefined
          ? undefined
          : clusters.find((cluster) => cluster.at > 0 && cluster.timecode >= start + CHUNK_MS);

      if (due !== undefined && start !== undefined) {
        cut(due.at, (due.timecode - start) / 1000, due.timecode);
        continue;
      }

      if (pending.length > MAX_PENDING_BYTES) {
        cut(pending.length, Math.min(60, Math.max(1, (Date.now() - chunkStartedAt) / 1000)));
      }

      return;
    }
  };

  const ingest = async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const next = new Uint8Array(pending.length + bytes.length);
    next.set(pending);
    next.set(bytes, pending.length);
    pending = next;
    walk();
    cutWhereDue();
  };

  const flush = () => {
    const last = clusters.at(-1);
    const start = chunkTimecode;

    if (last === undefined || start === undefined || last.at === 0) {
      return;
    }

    cut(last.at, Math.max(0.1, (last.timecode - start) / 1000), last.timecode);
  };

  const enqueue = (step: () => Promise<void>) => {
    const previous = queue;
    queue = (async () => {
      await previous;

      await step().catch(() => null);
    })();
  };

  recorder.ondataavailable = (event) => {
    enqueue(() => ingest(event.data));
  };

  const requestFile = async () => {
    await Promise.all(uploads.values());
    await fetch("/api/replay/file", jsonRequest("POST", { sessionId, sourceId }));
  };

  recorder.onstop = () => {
    enqueue(async () => {
      flush();
      await requestFile();
    });
  };

  recorder.start(SLICE_MS);

  return {
    setOnAir: (next) => {
      current = next;
    },
    stop: () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    },
  } satisfies Recorder;
};
