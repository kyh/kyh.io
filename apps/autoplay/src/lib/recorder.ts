"use client";

import { upload } from "@vercel/blob/client";

import type { LiveProgram } from "@/lib/api-contract";

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
const SLICE_MS = 2_000;
/** A chunk is cut at the first cluster this far past its start. */
const CHUNK_MS = 10_000;
/** Bytes held back without a cluster to cut at before the chunk is cut anyway. */
const MAX_PENDING_BYTES = 8 * 1024 * 1024;

const EBML_SEGMENT = 0x18538067;
const EBML_CLUSTER = 0x1f43b675;
const EBML_TIMECODE = 0xe7;

export type OnAir = {
  program: LiveProgram;
  formatLabel: string;
};

export type Recorder = {
  /** What is on air now; stamped on the chunks recorded from here. */
  setOnAir(onAir: OnAir): void;
  /** Finish the recording; the last whole clusters are handed over. */
  stop(): void;
};

export const canRecord = (): boolean =>
  "MediaRecorder" in globalThis && MediaRecorder.isTypeSupported(MIME_TYPE);

type Vint = { value: number; length: number; unknown: boolean };

/** An EBML variable-length integer; ids keep their length-marker bit, sizes drop it. */
const readVint = (bytes: Uint8Array, at: number, id: boolean): Vint | undefined => {
  const first = bytes[at];
  if (first === undefined || first === 0) return undefined;
  let length = 1;
  while ((first & (0x80 >> (length - 1))) === 0) length += 1;
  if (at + length > bytes.length) return undefined;
  const mask = 0xff >> length;
  let value = id ? first : first & mask;
  let unknown = (first & mask) === mask;
  for (let k = 1; k < length; k++) {
    const byte = bytes[at + k] ?? 0;
    value = value * 256 + byte;
    if (byte !== 0xff) unknown = false;
  }
  return { value, length, unknown: !id && unknown };
};

const readUint = (bytes: Uint8Array, at: number, length: number): number => {
  let value = 0;
  for (let k = 0; k < length; k++) value = value * 256 + (bytes[at + k] ?? 0);
  return value;
};

type Cluster = { at: number; timecode: number };

const publish = async (
  sourceId: string,
  sessionId: string,
  index: number,
  bytes: Uint8Array<ArrayBuffer>,
  seconds: number,
  onAir: OnAir,
): Promise<void> => {
  if (bytes.length === 0) return;
  const file = new Blob([bytes], { type: "video/webm" });
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
      bytes: bytes.length,
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
  let chunkOnAir = onAir;
  let index = 0;
  let chunkStartedAt = Date.now();
  let chunkTimecode: number | undefined;
  // Bytes not yet handed over, walked as far as their element headers allow.
  let pending: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let cursor = 0;
  let clusters: Cluster[] = [];
  let queue = Promise.resolve();

  const walk = () => {
    for (;;) {
      const id = readVint(pending, cursor, true);
      if (id === undefined) return;
      const size = readVint(pending, cursor + id.length, false);
      if (size === undefined) return;
      const body = cursor + id.length + size.length;
      if (id.value === EBML_CLUSTER) {
        // Its Timecode comes first; a cluster is only a cut point once it is in.
        const timecodeId = readVint(pending, body, true);
        if (timecodeId === undefined) return;
        const timecodeSize = readVint(pending, body + timecodeId.length, false);
        if (timecodeSize === undefined) return;
        const timecodeAt = body + timecodeId.length + timecodeSize.length;
        if (timecodeAt + timecodeSize.value > pending.length) return;
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

  const cut = (at: number, seconds: number, timecode: number | undefined) => {
    // A failed upload loses one chunk of replay, nothing more; the stream on
    // screen is unaffected.
    void publish(sourceId, sessionId, index, pending.slice(0, at), seconds, chunkOnAir).catch(
      () => undefined,
    );
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
        cut(
          pending.length,
          Math.min(60, Math.max(1, (Date.now() - chunkStartedAt) / 1000)),
          undefined,
        );
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
    if (last === undefined || start === undefined || last.at === 0) return;
    cut(last.at, Math.max(0.1, (last.timecode - start) / 1000), last.timecode);
  };

  recorder.ondataavailable = (event) => {
    queue = queue.then(() => ingest(event.data)).catch(() => undefined);
  };
  recorder.onstop = () => {
    queue = queue.then(flush).catch(() => undefined);
  };
  recorder.start(SLICE_MS);
  return {
    setOnAir: (next) => {
      current = next;
    },
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
};
