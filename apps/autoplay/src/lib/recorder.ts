"use client";

import { upload } from "@vercel/blob/client";

import type { LiveProgram, RecordingRequest } from "@/lib/api-contract";
import { jsonRequest } from "@/lib/api-contract";
import { EBML_CLUSTER, EBML_SEGMENT, EBML_TIMECODE, readUint, readVint } from "@/lib/webm";

// Records the live stream as one continuous recording per session, handed to
// the store a chunk at a time. One MediaRecorder run for the whole session:
// its output is a single WebM stream, which is what lets a replay append the
// chunks back into one unbroken video. The stream is cut into chunks at
// cluster boundaries, not on the clock — the recorder's own slices land at
// arbitrary bytes, and a slice that starts mid-cluster cannot be played on
// its own, which the live tail has to do. Chrome starts a cluster on every
// keyframe, a few seconds apart, so a chunk is the first ten seconds or so of
// whole clusters; the first also carries the container header. Each chunk
// goes straight from the browser to the store with a token the station
// mints, then the station is told what it was and which program was on air
// when it began.

/** Well under the store's per-chunk ceiling; fine for 768p of this kind of picture. */
const VIDEO_BITS_PER_SECOND = 1_500_000;
const MIME_TYPE = "video/webm;codecs=vp8,opus";
/** How often the recorder hands bytes over: how far behind the store runs. */
const SLICE_MS = 2000;
/** A chunk is cut at the first cluster this far past its start. */
const CHUNK_MS = 10_000;
/** Bytes held back without a cluster to cut at before the chunk is cut anyway. */
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

export const canRecord = (): boolean =>
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
): Promise<void> => {
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

export const createRecorder = (stream: MediaStream, sourceId: string, onAir: OnAir): Recorder => {
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
  // Bytes not yet handed over, walked as far as their element headers allow.
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
        // Its Timecode comes first; a cluster is only a cut point once it is in.
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
    // A failed upload loses one chunk of replay, nothing more; the stream on
    // screen is unaffected.
    const chunk = pending.slice(0, at);
    const chunkIndex = index;
    const settled = (async () => {
      try {
        await publish(sourceId, sessionId, chunkIndex, chunk, seconds, chunkOnAir);
      } catch {
        // Nothing to do: the loss is this one chunk.
      } finally {
        uploads.delete(chunkIndex);
      }
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
        // The walker found nothing to cut at: hand it over as it is, the way
        // a plain slice would be, rather than hold the stream back.
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
    // The last whole clusters; the partial one after them cannot be played.
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
      try {
        await step();
      } catch {
        // A step that fails must not stall the ones after it.
      }
    })();
  };
  recorder.ondataavailable = (event) => {
    enqueue(() => ingest(event.data));
  };
  // With the last chunk in, the session is asked for as one file, for the
  // browsers that cannot append a stream; a viewer asking first gets it built then.
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
  };
};
