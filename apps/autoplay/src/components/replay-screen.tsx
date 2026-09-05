"use client";

import { useEffect, useRef, useState } from "react";

import type { RecordedSession, RecordingChunk } from "@/lib/api-contract";
import { replayPayloadSchema } from "@/lib/api-contract";

// The replay: the channel's recorded sessions, newest first, each appended
// back into a single stream through MediaSource — the chunks are slices of
// one recording, so what plays is exactly the stream that was on air, with no
// seam between them. One session ends, the next begins; a fresh look at the
// list now and then picks up sessions that landed meanwhile.

const MIME_TYPE = 'video/webm;codecs="vp8,opus"';
/** How much stream to keep appended ahead of the playhead. */
const AHEAD_SECONDS = 30;
/** How often the list is re-read while a replay runs. */
const REFRESH_MS = 120_000;

export type ReplayState =
  | { status: "loading" }
  | { status: "playing" }
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

/**
 * Plays one session into a video element: chunks are fetched in order and
 * appended as the playhead approaches the end of what is buffered. Each
 * chunk's place on the timeline is where the buffer ended before it, which
 * is what the ticker reads the program on air from.
 */
const playSession = (
  video: HTMLVideoElement,
  session: RecordedSession,
  onChunk: (chunk: RecordingChunk) => void,
  onDone: () => void,
): (() => void) => {
  const source = new MediaSource();
  const url = URL.createObjectURL(source);
  const starts: { at: number; chunk: RecordingChunk }[] = [];
  let next = 0;
  let appending = false;
  let stopped = false;
  let buffer: SourceBuffer | undefined;

  const bufferedEnd = (): number => {
    const ranges = video.buffered;
    return ranges.length === 0 ? 0 : ranges.end(ranges.length - 1);
  };

  const appendNext = async () => {
    if (stopped || appending || buffer === undefined || buffer.updating) return;
    const chunk = session.chunks[next];
    if (chunk === undefined) {
      if (source.readyState === "open") source.endOfStream();
      return;
    }
    if (bufferedEnd() - video.currentTime > AHEAD_SECONDS) return;
    appending = true;
    try {
      const response = await fetch(chunk.url);
      const bytes = await response.arrayBuffer();
      if (stopped || buffer === undefined) return;
      starts.push({ at: bufferedEnd(), chunk });
      buffer.appendBuffer(bytes);
      next += 1;
    } catch {
      // A missing chunk ends the session early rather than stalling it.
      if (!stopped && source.readyState === "open") source.endOfStream();
    } finally {
      appending = false;
    }
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
    buffer.addEventListener("updateend", () => void appendNext());
    void appendNext();
  });
  video.addEventListener("timeupdate", onTime);
  video.addEventListener("ended", onDone);
  video.src = url;
  void video.play().catch(() => undefined);

  return () => {
    stopped = true;
    video.removeEventListener("timeupdate", onTime);
    video.removeEventListener("ended", onDone);
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  };
};

export const ReplayScreen = (props: ReplayScreenProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sessions, setSessions] = useState<RecordedSession[] | undefined>(undefined);
  const [cursor, setCursor] = useState(0);
  const onProgramRef = useRef(props.onProgram);
  const onStateRef = useRef(props.onState);

  useEffect(() => {
    onProgramRef.current = props.onProgram;
    onStateRef.current = props.onState;
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await fetchSessions(props.sourceId);
      if (cancelled) return;
      setSessions(list ?? []);
    };
    void load();
    const refresh = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
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
    onStateRef.current({ status: "playing" });
  }, [sessions]);

  useEffect(() => {
    const video = videoRef.current;
    const session = sessions?.[cursor % (sessions.length || 1)];
    if (video === null || session === undefined || !canReplay()) return;
    return playSession(
      video,
      session,
      (chunk) => onProgramRef.current(chunk),
      () => setCursor((value) => value + 1),
    );
  }, [sessions, cursor]);

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
