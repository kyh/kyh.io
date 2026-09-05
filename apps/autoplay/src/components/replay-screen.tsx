"use client";

import { useEffect, useRef, useState } from "react";

import type { RecordedSession, RecordingChunk } from "@/lib/api-contract";
import { replayPayloadSchema } from "@/lib/api-contract";

// The replay, and the live tail. The channel's recorded sessions, newest
// first, each appended back into a single stream through MediaSource — the
// chunks are slices of one recording, so what plays is exactly the stream
// that was on air, with no seam between them. A session that is still
// receiving chunks is on air right now: the player joins it near its end and
// keeps appending as chunks land, so everyone watches the one stream the
// owner is paying for, twenty seconds or so behind. When a session ends the
// next one begins.

const MIME_TYPE = 'video/webm;codecs="vp8,opus"';
/** How much stream to keep appended ahead of the playhead. */
const AHEAD_SECONDS = 30;
/** A session whose newest chunk is younger than this is still on air. */
const ON_AIR_MS = 45_000;
/**
 * How far behind the live edge to join. A chunk reaches the store some
 * seconds after it was recorded, so this has to cover that lag plus a few
 * chunks, or a viewer catches the edge and waits.
 */
const TAIL_SECONDS = 40;
/** How often to look for new chunks while following a session on air. */
const TAIL_POLL_MS = 5_000;
/** How often the list is re-read otherwise. */
const REFRESH_MS = 120_000;

export type ReplayState =
  | { status: "loading" }
  | { status: "playing"; onAir: boolean }
  | { status: "empty"; reason: string };

type ReplayScreenProps = {
  sourceId: string;
  muted: boolean;
  paused: boolean;
  onProgram: (chunk: RecordingChunk | undefined) => void;
  onState: (state: ReplayState) => void;
};

const fetchSessions = async (sourceId: string): Promise<RecordedSession[] | undefined> => {
  try {
    const response = await fetch(`/api/replay?sourceId=${encodeURIComponent(sourceId)}`);
    if (!response.ok) return undefined;
    return replayPayloadSchema.parse(await response.json()).sessions;
  } catch {
    return undefined;
  }
};

export const canReplay = (): boolean =>
  "MediaSource" in globalThis && MediaSource.isTypeSupported(MIME_TYPE);

const isOnAir = (session: RecordedSession): boolean => Date.now() - session.updatedAt < ON_AIR_MS;

/**
 * Plays one session into a video element. Chunks are fetched in order and
 * appended as the playhead approaches the end of what is buffered; chunk 0
 * always goes first, since it carries the container header. Joining a
 * session on air skips ahead: the header, then the chunks covering the last
 * TAIL_SECONDS, and a seek to where they start. Each chunk's place on the
 * timeline is read back from the buffer once it is in, which is what the
 * ticker reads the program on air from.
 */
type Player = {
  /** New chunks may have arrived; append if the buffer wants them. */
  poke(): void;
  stop(): void;
};

const playSession = (
  video: HTMLVideoElement,
  first: RecordedSession,
  latest: () => RecordedSession,
  onChunk: (chunk: RecordingChunk) => void,
  onDone: () => void,
): Player => {
  const source = new MediaSource();
  const url = URL.createObjectURL(source);
  const starts: { at: number; chunk: RecordingChunk }[] = [];
  let next = 0;
  let pending: RecordingChunk | undefined;
  let appending = false;
  let stopped = false;
  let buffer: SourceBuffer | undefined;
  let seekTo: number | undefined;

  const bufferedEnd = (): number => {
    const ranges = video.buffered;
    return ranges.length === 0 ? 0 : ranges.end(ranges.length - 1);
  };

  const finish = () => {
    if (!stopped && source.readyState === "open" && !buffer?.updating) source.endOfStream();
  };

  const appendNext = async () => {
    if (stopped || appending || buffer === undefined || buffer.updating) return;
    const session = latest();
    const chunk = session.chunks[next];
    if (chunk === undefined) {
      // Nothing more yet: a session on air will have more shortly, a
      // finished one is over.
      if (!isOnAir(session)) finish();
      return;
    }
    if (bufferedEnd() - video.currentTime > AHEAD_SECONDS) return;
    appending = true;
    try {
      const response = await fetch(chunk.url);
      const bytes = await response.arrayBuffer();
      if (stopped || buffer === undefined) return;
      pending = chunk;
      buffer.appendBuffer(bytes);
      next += 1;
    } catch {
      // A missing chunk ends the session early rather than stalling it.
      finish();
    } finally {
      appending = false;
    }
  };

  const onAppended = () => {
    if (pending !== undefined) {
      const end = bufferedEnd();
      starts.push({ at: Math.max(0, end - pending.seconds), chunk: pending });
      pending = undefined;
      if (seekTo !== undefined && end >= seekTo) {
        video.currentTime = seekTo;
        seekTo = undefined;
      }
    }
    void appendNext();
  };

  const onTime = () => {
    let onAir: RecordingChunk | undefined;
    for (const entry of starts) {
      if (entry.at <= video.currentTime + 0.25) onAir = entry.chunk;
    }
    if (onAir !== undefined) onChunk(onAir);
    void appendNext();
  };

  source.addEventListener("sourceopen", () => {
    if (stopped) return;
    buffer = source.addSourceBuffer(MIME_TYPE);
    buffer.addEventListener("updateend", onAppended);
    if (isOnAir(first) && first.chunks.length > 1) {
      // Join near the live edge: play the header chunk's picture only long
      // enough for the tail to land, then seek onto it.
      let seconds = 0;
      let index = first.chunks.length;
      while (index > 1 && seconds < TAIL_SECONDS) {
        index -= 1;
        seconds += first.chunks[index]?.seconds ?? 0;
      }
      const before = first.chunks.slice(0, index).reduce((sum, chunk) => sum + chunk.seconds, 0);
      seekTo = before;
      next = index;
      // The header chunk is appended out of order, at its own timestamps.
      void (async () => {
        const header = first.chunks[0];
        if (header === undefined || buffer === undefined) return;
        const response = await fetch(header.url);
        const bytes = await response.arrayBuffer();
        if (stopped || buffer === undefined) return;
        pending = header;
        buffer.appendBuffer(bytes);
      })();
      return;
    }
    void appendNext();
  });
  // A video that has run out of buffer stops firing timeupdate, so the
  // stall itself has to ask for more.
  const onWaiting = () => void appendNext();
  video.addEventListener("timeupdate", onTime);
  video.addEventListener("waiting", onWaiting);
  video.addEventListener("ended", onDone);
  video.src = url;
  void video.play().catch(() => undefined);

  return {
    poke: () => void appendNext(),
    stop: () => {
      stopped = true;
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("ended", onDone);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    },
  };
};

export const ReplayScreen = (props: ReplayScreenProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sessions, setSessions] = useState<RecordedSession[] | undefined>(undefined);
  const sessionsRef = useRef<RecordedSession[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playingId, setPlayingId] = useState<string | undefined>(undefined);
  const playerRef = useRef<Player | undefined>(undefined);
  const onProgramRef = useRef(props.onProgram);
  const onStateRef = useRef(props.onState);

  useEffect(() => {
    onProgramRef.current = props.onProgram;
    onStateRef.current = props.onState;
  });

  // The list is re-read often while the session being played is on air —
  // that is how its new chunks arrive — and rarely otherwise.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      const list = await fetchSessions(props.sourceId);
      if (cancelled) return;
      if (list !== undefined) {
        sessionsRef.current = list;
        setSessions(list);
        playerRef.current?.poke();
      } else if (sessionsRef.current.length === 0) {
        setSessions([]);
      }
      const newest = list?.[0];
      timer = window.setTimeout(
        () => void load(),
        newest !== undefined && isOnAir(newest) ? TAIL_POLL_MS : REFRESH_MS,
      );
    };
    void load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [props.sourceId]);

  useEffect(() => {
    if (sessions === undefined) {
      onStateRef.current({ status: "loading" });
      return;
    }
    if (!canReplay()) {
      onStateRef.current({
        status: "empty",
        reason: "The replay needs a browser that can play WebM streams — Chrome, Edge or Firefox.",
      });
      return;
    }
    if (sessions.length === 0) {
      onStateRef.current({
        status: "empty",
        reason: "Nothing recorded yet — this channel records while its owner is watching.",
      });
      onProgramRef.current(undefined);
      return;
    }
    const playing = sessions.find((session) => session.sessionId === playingId);
    onStateRef.current({ status: "playing", onAir: playing !== undefined && isOnAir(playing) });
  }, [sessions, playingId]);

  // A session starts playing when the cursor lands on it and keeps playing
  // through list refreshes; only the cursor moving restarts the player.
  const loaded = sessions !== undefined;
  useEffect(() => {
    if (!loaded) return;
    const video = videoRef.current;
    const list = sessionsRef.current;
    const session = list[cursor % (list.length || 1)];
    if (video === null || session === undefined || !canReplay()) return;
    setPlayingId(session.sessionId);
    const latest = () =>
      sessionsRef.current.find((entry) => entry.sessionId === session.sessionId) ?? session;
    const player = playSession(
      video,
      session,
      latest,
      (chunk) => onProgramRef.current(chunk),
      () => setCursor((value) => value + 1),
    );
    playerRef.current = player;
    return () => {
      playerRef.current = undefined;
      player.stop();
    };
  }, [cursor, loaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.muted = props.muted;
    if (props.paused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [props.muted, props.paused]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={props.muted}
      className="absolute inset-0 h-full w-full object-contain"
    />
  );
};
