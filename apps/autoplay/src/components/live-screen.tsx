"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { wma } from "@fal-ai/client/realtime/wma";
import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";
import { DIRECTOR_MODEL, jsonRequest, livePayloadSchema, requestJson } from "@/lib/api-contract";
import { fal } from "@/lib/fal-client";
import { canRecord, createRecorder } from "@/lib/recorder";
import type { Recorder } from "@/lib/recorder";
import type { LiveState } from "@/lib/screen-state";
import { openTestStreamSession, testStreamProgram, testStreamRequested } from "@/lib/test-stream";
import type { ClientMessage } from "@/lib/test-stream";
import { TvVideo, playQuietly, useVideoPlayback } from "@/components/tv-video";

// The screen: one director session in this browser. The model streams
// continuous video over WebRTC and takes a new prompt whenever the
// programming says so. Prompts are paced off the picture, not the clock:
// every chunk the model reports carries the prompt version it was made
// under and how far ahead of the screen it is, so the moment a subject
// reaches the screen is known — the subject holds from there, and the next
// prompt goes out after that. Sending any earlier would not shorten anything;
// the model accepts prompts into a deck faster than it plays them, and every
// program handed out is a paid source read.
//
// The session is the meter. It runs only while the tab is visible and the
// viewer isn't paused, and one idle long enough to be billed anyway is closed
// rather than left running.

/**
 * How long a subject holds once its picture is on screen before the next
 * prompt goes out. The model applies a prompt at its next chunk boundary
 * (chunks are its default ten seconds; asking for longer ones starved the
 * buffer), so a subject is on screen for this plus up to a chunk.
 */
const HOLD_SECONDS = 10;
/** How long a hidden or paused tab keeps its session before it is closed. */
const IDLE_CLOSE_MS = 30_000;

/** What the director reports that the screen acts on; anything else it says passes unread. */
const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ prompt_version: z.number(), type: z.literal("prompt_rejected") }),
  z.object({
    buffer_depth_seconds: z.number(),
    prompt_version: z.number(),
    type: z.literal("chunk"),
  }),
  z.object({ code: z.string(), error: z.string(), type: z.literal("error") }),
  z.object({ reason: z.string(), type: z.literal("stream_exhausted") }),
]);

interface LiveScreenProps {
  sourceId: string;
  /** Record each program for the replay; only the public channel does. */
  record: boolean;
  muted: boolean;
  paused: boolean;
  /** The program now on air, for the ticker; undefined between sessions. */
  onProgram: (program?: LiveProgram) => void;
  onState: (state: LiveState) => void;
}

/** What this screen needs of a session: the director's, or the test stream's. */
interface Session {
  send: (message: ClientMessage) => void;
  close: () => void | Promise<void>;
}

type ProgramResult = { program: LiveProgram; formatLabel?: string } | { reason: string };

const requestProgram = async (sourceId: string, opening: boolean): Promise<ProgramResult> => {
  const answer = await requestJson(
    "/api/live",
    livePayloadSchema,
    "Signal lost — try again",
    jsonRequest("POST", { opening, sourceId }),
  );
  if ("error" in answer) {
    return { reason: answer.error };
  }
  return answer.data.kind === "off-air"
    ? { reason: answer.data.reason }
    : { formatLabel: answer.data.formatLabel, program: answer.data.program };
};

export const LiveScreen = (props: LiveScreenProps) => {
  const videoRef = useVideoPlayback(props.muted, props.paused);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const sessionRef = useRef<Session | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | undefined>();
  const versionRef = useRef(0);
  const programsRef = useRef(new Map<number, LiveProgram>());
  /** The latest version whose picture has been scheduled onto the screen. */
  const shownVersionRef = useRef(0);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const tickerTimerRef = useRef<number | undefined>(undefined);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const nextTimerRef = useRef<number | undefined>(undefined);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const recorderRef = useRef<Recorder | undefined>(undefined);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const formatLabelRef = useRef("live");
  const testStreamRef = useRef(false);
  const testProgramsRef = useRef(0);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- React 19's useRef requires the initial value
  const idleRef = useRef<number | undefined>(undefined);
  const pausedRef = useRef(props.paused);
  const settleRef = useRef<() => void>(() => {
    // Replaced once a session is open; nothing to settle before then.
  });
  const emitProgram = useEffectEvent(props.onProgram);
  const emitState = useEffectEvent(props.onState);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || stream === undefined) {
      return;
    }
    video.srcObject = stream;
    void playQuietly(video);
    // The first presented frame is what makes it live; `playing` alone fires
    // on a MediaStream before any picture has come down the wire.
    let cancelled = false;
    video.requestVideoFrameCallback(() => {
      if (!cancelled) {
        emitState({ status: "live" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [stream, videoRef]);

  // The session is bound to the source it was opened for; a channel change
  // remounts this component, so nothing here needs resetting.
  useEffect(() => {
    let closed = false;

    const closeSession = () => {
      recorderRef.current?.stop();
      recorderRef.current = undefined;
      streamRef.current = undefined;
      const session = sessionRef.current;
      sessionRef.current = undefined;
      if (session === undefined) {
        return;
      }
      session.send({ type: "stop" });
      void session.close();
      emitProgram();
    };

    /** Off the air, and why — in the console too, since the screen may show the replay instead. */
    const offAir = (reason: string) => {
      console.warn("[live] off air:", reason);
      emitState({ reason, status: "off-air" });
    };

    /** Line up the next program behind the one on air, or open on it. */
    const direct = async (opening: boolean) => {
      const session = sessionRef.current;
      if (session === undefined || closed) {
        return;
      }
      // The test stream reads no source: nothing is spent on X either.
      const result: ProgramResult = testStreamRef.current
        ? { formatLabel: "test stream", program: testStreamProgram((testProgramsRef.current += 1)) }
        : await requestProgram(props.sourceId, opening);
      if (closed || sessionRef.current !== session) {
        return;
      }
      if ("reason" in result) {
        offAir(result.reason);
        closeSession();
        return;
      }
      versionRef.current += 1;
      const version = versionRef.current;
      programsRef.current.set(version, result.program);
      if (result.formatLabel !== undefined) {
        formatLabelRef.current = result.formatLabel;
      }
      if (opening) {
        session.send({
          aspect_ratio: "16:9",
          prompt: result.program.prompt,
          prompt_version: version,
          protocol_version: 1,
          resolution: "768p",
          type: "configure",
        });
      } else {
        session.send({ prompt: result.program.prompt, prompt_version: version, type: "prompt" });
      }
    };

    /**
     * A subject's picture has been generated and will reach the screen in
     * `inSeconds`. Then: the ticker changes, the recording is told what is
     * on air, and the hold starts — the next prompt goes out when it ends.
     */
    const onScreenIn = (program: LiveProgram, inSeconds: number) => {
      if (tickerTimerRef.current !== undefined) {
        window.clearTimeout(tickerTimerRef.current);
      }
      if (nextTimerRef.current !== undefined) {
        window.clearTimeout(nextTimerRef.current);
      }
      const delay = Math.max(0, inSeconds) * 1000;
      tickerTimerRef.current = window.setTimeout(() => {
        tickerTimerRef.current = undefined;
        if (closed) {
          return;
        }
        emitProgram(program);
        const onAir = { formatLabel: formatLabelRef.current, program };
        const media = streamRef.current;
        if (recorderRef.current !== undefined) {
          recorderRef.current.setOnAir(onAir);
        } else if (props.record && media !== undefined && canRecord()) {
          // The recording starts with the first picture, not the black
          // frames before it.
          recorderRef.current = createRecorder(media, props.sourceId, onAir);
        }
      }, delay);
      nextTimerRef.current = window.setTimeout(
        () => {
          nextTimerRef.current = undefined;
          if (!closed) {
            void direct(false);
          }
        },
        delay + HOLD_SECONDS * 1000,
      );
    };

    const openSession = () => {
      if (sessionRef.current !== undefined || closed) {
        return;
      }
      emitState({ status: "connecting" });
      testStreamRef.current = testStreamRequested();
      const onMedia = (media: MediaStream) => {
        setStream(media);
        streamRef.current = media;
      };
      const handlers = {
        onData: (raw: string) => {
          // oxlint-disable-next-line no-use-before-define -- the handler closes over the session it is registered on
          if (sessionRef.current !== session) {
            return;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }
          const message = serverMessageSchema.safeParse(parsed);
          if (!message.success) {
            return;
          }
          switch (message.data.type) {
            case "chunk": {
              // The first chunk under a version is that subject's picture on
              // its way to the screen.
              const version = message.data.prompt_version;
              const program = programsRef.current.get(version);
              if (program !== undefined && version > shownVersionRef.current) {
                shownVersionRef.current = version;
                onScreenIn(program, message.data.buffer_depth_seconds);
              }
              return;
            }
            case "prompt_rejected": {
              void direct(false);
              return;
            }
            case "error": {
              offAir(`${message.data.code}: ${message.data.error}`);
              closeSession();
              return;
            }
            case "stream_exhausted": {
              offAir(
                message.data.reason === "session_limit"
                  ? "This session hit fal's length limit — tune away and back for a new one."
                  : "The session ended.",
              );
              closeSession();
              break;
            }
            // no default
          }
        },
        onMedia,
      };
      const session: Session = testStreamRef.current
        ? openTestStreamSession(handlers)
        : fal.realtime.open(wma(DIRECTOR_MODEL), {
            receive: ["video", "audio"],
            ...handlers,
            onError: (error) => {
              if (sessionRef.current !== session) {
                return;
              }
              sessionRef.current = undefined;
              emitProgram();
              offAir(error instanceof Error ? error.message : "The live signal dropped");
            },
            onState: (state) => {
              if (sessionRef.current !== session) {
                return;
              }
              if (state === "closed") {
                emitProgram();
              }
            },
          });
      sessionRef.current = session;
      void direct(true);
    };

    const settle = () => {
      const active = !document.hidden && !pausedRef.current;
      if (active) {
        if (idleRef.current !== undefined) {
          window.clearTimeout(idleRef.current);
          idleRef.current = undefined;
        }
        openSession();
      } else if (idleRef.current === undefined && sessionRef.current !== undefined) {
        idleRef.current = window.setTimeout(() => {
          idleRef.current = undefined;
          closeSession();
        }, IDLE_CLOSE_MS);
      }
    };
    settleRef.current = settle;

    settle();
    document.addEventListener("visibilitychange", settle);
    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", settle);
      if (idleRef.current !== undefined) {
        window.clearTimeout(idleRef.current);
      }
      if (tickerTimerRef.current !== undefined) {
        window.clearTimeout(tickerTimerRef.current);
      }
      if (nextTimerRef.current !== undefined) {
        window.clearTimeout(nextTimerRef.current);
      }
      closeSession();
    };
  }, [props.sourceId, props.record]);

  useEffect(() => {
    pausedRef.current = props.paused;
    settleRef.current();
  }, [props.paused]);

  return <TvVideo videoRef={videoRef} muted={props.muted} />;
};
