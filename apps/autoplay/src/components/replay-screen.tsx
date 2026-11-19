"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { RecordedSession, RecordingChunk } from "@/lib/api-contract";
import {
  jsonRequest,
  replayFilePayloadSchema,
  replayPayloadSchema,
  requestJson,
} from "@/lib/api-contract";
import type { ReplayState } from "@/lib/screen-state";
import { TvVideo, playQuietly, useVideoPlayback } from "@/components/tv-video";

const MIME_TYPE = 'video/webm;codecs="vp8,opus"';
const VIDEO_ONLY_MIME_TYPE = 'video/webm;codecs="vp8"';
const AHEAD_SECONDS = 30;
const BEHIND_SECONDS = 60;
const ON_AIR_MS = 45_000;
const TAIL_SECONDS = 40;
const TAIL_POLL_MS = 5000;
const REFRESH_MS = 120_000;

interface ReplayScreenProps {
  sourceId: string;
  muted: boolean;
  paused: boolean;
  onProgram: (chunk?: RecordingChunk) => void;
  onState: (state: ReplayState) => void;
}

const fetchSessions = async (sourceId: string) => {
  const answer = await requestJson(
    `/api/replay?sourceId=${encodeURIComponent(sourceId)}`,
    replayPayloadSchema,
    "The replay couldn't be read",
  );

  return "error" in answer ? undefined : answer.data.sessions;
};

const canReplay = () => "MediaSource" in globalThis && MediaSource.isTypeSupported(MIME_TYPE);

const canPlayFile = () => document.createElement("video").canPlayType("video/webm") !== "";

const FILE_NOT_READY =
  "Nothing to play yet — a session's file is made when it ends. Try again in a minute.";

const fetchSessionFile = async (sourceId: string, sessionId: string) => {
  const answer = await requestJson(
    "/api/replay/file",
    replayFilePayloadSchema,
    "The file isn't ready",
    jsonRequest("POST", { sessionId, sourceId }),
  );

  return "error" in answer ? undefined : answer.data.url;
};

const isOnAir = (session: RecordedSession) => Date.now() - session.updatedAt < ON_AIR_MS;

const mimeTypeFor = (header: ArrayBuffer) =>
  new TextDecoder("latin1").decode(header.slice(0, 16_384)).includes("A_OPUS")
    ? MIME_TYPE
    : VIDEO_ONLY_MIME_TYPE;

interface Player {
  poke: () => void;
  stop: () => void;
}

const playSession = (
  video: HTMLVideoElement,
  first: RecordedSession,
  latest: () => RecordedSession,
  onChunk: (chunk: RecordingChunk) => void,
  onDone: () => void,
) => {
  const source = new MediaSource();
  const url = URL.createObjectURL(source);
  const starts: { at: number; chunk: RecordingChunk }[] = [];
  let next = 0;
  let pending: RecordingChunk | undefined;
  let appending = false;
  let stopped = false;
  let buffer: SourceBuffer | undefined;
  let seekTo: number | undefined;

  const bufferedEnd = () => {
    const ranges = video.buffered;

    return ranges.length === 0 ? 0 : ranges.end(ranges.length - 1);
  };

  const finish = () => {
    if (!stopped && source.readyState === "open" && !buffer?.updating) {
      source.endOfStream();
    }
  };

  const appendNext = async () => {
    if (stopped || appending || buffer === undefined || buffer.updating) {
      return;
    }

    const session = latest();
    const chunk = session.chunks[next];

    if (chunk === undefined) {
      if (!isOnAir(session)) {
        finish();
      }

      return;
    }

    if (bufferedEnd() - video.currentTime > AHEAD_SECONDS) {
      return;
    }

    appending = true;

    try {
      const response = await fetch(chunk.url);
      const bytes = await response.arrayBuffer();

      if (stopped || buffer === undefined) {
        return;
      }

      pending = chunk;
      buffer.appendBuffer(bytes);
      next += 1;
    } catch {
      finish();
    } finally {
      appending = false;
    }
  };

  const evict = () => {
    if (buffer === undefined || buffer.updating) {
      return false;
    }

    const ranges = video.buffered;

    if (ranges.length === 0 || video.currentTime - ranges.start(0) <= 2 * BEHIND_SECONDS) {
      return false;
    }

    buffer.remove(0, video.currentTime - BEHIND_SECONDS);

    return true;
  };

  const onAppended = () => {
    if (pending !== undefined) {
      const end = bufferedEnd();
      starts.push({ at: Math.max(0, end - pending.seconds), chunk: pending });
      pending = undefined;

      if (seekTo !== undefined && end >= seekTo) {
        const ranges = video.buffered;
        video.currentTime = Math.max(seekTo, ranges.start(ranges.length - 1));
        seekTo = undefined;
      }
    }

    if (evict()) {
      return;
    }

    void appendNext();
  };

  const onTime = () => {
    let onAir: RecordingChunk | undefined;

    for (const entry of starts) {
      if (entry.at <= video.currentTime + 0.25) {
        onAir = entry.chunk;
      }
    }

    if (onAir !== undefined) {
      onChunk(onAir);
    }

    void appendNext();
  };

  source.addEventListener("sourceopen", () => {
    void (async () => {
      const [header] = first.chunks;

      if (stopped || header === undefined) {
        return;
      }

      const response = await fetch(header.url);
      const bytes = await response.arrayBuffer();

      if (stopped) {
        return;
      }

      buffer = source.addSourceBuffer(mimeTypeFor(bytes));
      buffer.addEventListener("updateend", onAppended);
      next = 1;

      if (isOnAir(first) && first.chunks.length > 1) {
        let seconds = 0;
        let index = first.chunks.length;

        while (index > 1 && seconds < TAIL_SECONDS) {
          index -= 1;
          seconds += first.chunks[index]?.seconds ?? 0;
        }

        seekTo = 0;

        for (const chunk of first.chunks.slice(0, index)) {
          seekTo += chunk.seconds;
        }

        next = index;
      }

      pending = header;
      buffer.appendBuffer(bytes);
    })();
  });

  const onWaiting = () => {
    void appendNext();
  };

  video.addEventListener("timeupdate", onTime);
  video.addEventListener("waiting", onWaiting);
  video.addEventListener("ended", onDone);
  video.src = url;
  void playQuietly(video);

  return {
    poke: () => {
      void appendNext();
    },
    stop: () => {
      stopped = true;
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("ended", onDone);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    },
  } satisfies Player;
};

const playSessionFile = (
  video: HTMLVideoElement,
  sourceId: string,
  session: RecordedSession,
  onChunk: (chunk: RecordingChunk) => void,
  onDone: () => void,
  onFail: () => void,
) => {
  let stopped = false;
  const starts: { at: number; chunk: RecordingChunk }[] = [];
  let at = 0;

  for (const chunk of session.chunks) {
    starts.push({ at, chunk });
    at += chunk.seconds;
  }

  const onTime = () => {
    let onAir: RecordingChunk | undefined;

    for (const entry of starts) {
      if (entry.at <= video.currentTime + 0.25) {
        onAir = entry.chunk;
      }
    }

    if (onAir !== undefined) {
      onChunk(onAir);
    }
  };

  video.addEventListener("timeupdate", onTime);
  video.addEventListener("ended", onDone);
  video.addEventListener("error", onFail);
  void (async () => {
    const url = session.fileUrl ?? (await fetchSessionFile(sourceId, session.sessionId));

    if (stopped) {
      return;
    }

    if (url === undefined) {
      onFail();

      return;
    }

    video.src = url;
    void playQuietly(video);
  })();

  return {
    // oxlint-disable-next-line no-empty-function -- a file plays itself; there is nothing to append
    poke: () => {},
    stop: () => {
      stopped = true;
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onDone);
      video.removeEventListener("error", onFail);
      video.removeAttribute("src");
      video.load();
    },
  } satisfies Player;
};

export const ReplayScreen = (props: ReplayScreenProps) => {
  const videoRef = useVideoPlayback(props.muted, props.paused);
  const [sessions, setSessions] = useState<RecordedSession[] | undefined>();
  const sessionsRef = useRef<RecordedSession[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playingId, setPlayingId] = useState<string | undefined>();
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const playerRef = useRef<Player | undefined>(undefined);
  const emitProgram = useEffectEvent(props.onProgram);
  const emitState = useEffectEvent(props.onState);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      const list = await fetchSessions(props.sourceId);

      if (cancelled) {
        return;
      }

      if (list !== undefined) {
        sessionsRef.current = list;
        setSessions(list);
        playerRef.current?.poke();
      } else if (sessionsRef.current.length === 0) {
        setSessions([]);
      }

      const newest = list?.[0];
      timer = window.setTimeout(
        () => {
          void load();
        },
        newest !== undefined && isOnAir(newest) ? TAIL_POLL_MS : REFRESH_MS,
      );
    };

    void load();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [props.sourceId]);

  useEffect(() => {
    if (sessions === undefined) {
      emitState({ status: "loading" });

      return;
    }

    if (!canReplay() && !canPlayFile()) {
      emitState({
        reason: "The replay needs a browser that can play WebM video.",
        status: "empty",
      });

      return;
    }

    if (sessions.length === 0) {
      emitState({
        reason: "Nothing recorded yet — this channel records while its owner is watching.",
        status: "empty",
      });
      emitProgram();

      return;
    }

    if (!canReplay()) {
      const playable = sessions.some(
        (session) => !isOnAir(session) && !failed.has(session.sessionId),
      );

      if (!playable) {
        emitState({ reason: FILE_NOT_READY, status: "empty" });
        emitProgram();

        return;
      }

      emitState({ onAir: false, status: "playing" });

      return;
    }

    const playing = sessions.find((session) => session.sessionId === playingId);
    emitState({ onAir: playing !== undefined && isOnAir(playing), status: "playing" });
  }, [sessions, playingId, failed]);

  const loaded = sessions !== undefined;
  useEffect(() => {
    if (!loaded) {
      return;
    }

    const video = videoRef.current;
    const list = sessionsRef.current;

    if (video === null || list.length === 0) {
      return;
    }

    const streaming = canReplay();

    if (!streaming && !canPlayFile()) {
      return;
    }

    const start = cursor % list.length;

    const session = streaming
      ? list[start]
      : [...list.slice(start), ...list.slice(0, start)].find(
          (entry) => !isOnAir(entry) && !failed.has(entry.sessionId),
        );

    if (session === undefined) {
      return;
    }

    setPlayingId(session.sessionId);
    const onChunk = (chunk: RecordingChunk) => emitProgram(chunk);
    const onDone = () => setCursor((value) => value + 1);

    const latest = () =>
      sessionsRef.current.find((entry) => entry.sessionId === session.sessionId) ?? session;

    const player = streaming
      ? playSession(video, session, latest, onChunk, onDone)
      : playSessionFile(video, props.sourceId, session, onChunk, onDone, () => {
          setFailed((known) => new Set([...known, session.sessionId]));
          onDone();
        });

    playerRef.current = player;

    return () => {
      playerRef.current = undefined;
      player.stop();
    };
  }, [cursor, loaded, failed, props.sourceId, videoRef]);

  return <TvVideo videoRef={videoRef} muted={props.muted} />;
};
