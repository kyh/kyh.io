"use client";

import { useEffect, useRef, useState } from "react";
import { wma } from "@fal-ai/client/realtime/wma";
import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";
import { errorPayloadSchema, livePayloadSchema } from "@/lib/api-contract";
import { fal } from "@/lib/fal-client";
import { canRecord, createRecorder } from "@/lib/recorder";
import type { Recorder } from "@/lib/recorder";
import {
  openTestPatternSession,
  testPatternProgram,
  testPatternRequested,
} from "@/lib/test-pattern";
import type { ClientMessage } from "@/lib/test-pattern";

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

const DIRECTOR_MODEL = "minimax/h3-max/director";
/**
 * How long a subject holds once its picture is on screen before the next
 * prompt goes out. The model applies a prompt at its next chunk boundary
 * (chunks are its default ten seconds; asking for longer ones starved the
 * buffer), so a subject is on screen for this plus up to a chunk.
 */
const HOLD_SECONDS = 10;
/** How long a hidden or paused tab keeps its session before it is closed. */
const IDLE_CLOSE_MS = 30_000;

const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("configured"), prompt_version: z.number() }),
  z.object({ type: z.literal("prompt_applied"), prompt_version: z.number() }),
  z.object({ type: z.literal("prompt_rejected"), prompt_version: z.number() }),
  z.object({
    type: z.literal("chunk"),
    prompt_version: z.number(),
    buffer_depth_seconds: z.number(),
  }),
  z.object({ type: z.literal("error"), code: z.string(), error: z.string() }),
  z.object({ type: z.literal("stream_exhausted"), reason: z.string() }),
]);

/**
 * "live" means a frame has reached the screen — not that the session is up.
 * The session reports itself live seconds before the first chunk arrives,
 * and a black screen with a LIVE badge reads as broken.
 */
export type LiveState =
  | { status: "connecting" }
  | { status: "live" }
  | { status: "off-air"; reason: string };

type LiveScreenProps = {
  sourceId: string;
  /** Record each program for the replay; only the public channel does. */
  record: boolean;
  muted: boolean;
  paused: boolean;
  /** The program now on air, for the ticker; undefined between sessions. */
  onProgram: (program: LiveProgram | undefined) => void;
  onState: (state: LiveState) => void;
};

/** What this screen needs of a session: the director's, or the test pattern's. */
type Session = {
  send(message: ClientMessage): void;
  close(): void | Promise<void>;
};

type ProgramResult =
  | { program: LiveProgram; world?: string; formatLabel?: string }
  | { reason: string };

const requestProgram = async (sourceId: string, opening: boolean): Promise<ProgramResult> => {
  try {
    const response = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, opening }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorPayloadSchema.safeParse(body);
      return { reason: parsed.success ? parsed.data.error : "Signal lost — try again" };
    }
    const payload = livePayloadSchema.parse(body);
    if (payload.kind === "off-air") return { reason: payload.reason };
    const result: ProgramResult = { program: payload.program };
    if (payload.world !== undefined) result.world = payload.world;
    if (payload.formatLabel !== undefined) result.formatLabel = payload.formatLabel;
    return result;
  } catch {
    return { reason: "Signal lost — try again" };
  }
};

export const LiveScreen = (props: LiveScreenProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<Session | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | undefined>(undefined);
  const versionRef = useRef(0);
  const programsRef = useRef(new Map<number, LiveProgram>());
  /** The latest version whose picture has been scheduled onto the screen. */
  const shownVersionRef = useRef(0);
  const tickerTimerRef = useRef<number | undefined>(undefined);
  const nextTimerRef = useRef<number | undefined>(undefined);
  const recorderRef = useRef<Recorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const formatLabelRef = useRef("live");
  const testPatternRef = useRef(false);
  const testProgramsRef = useRef(0);
  const idleRef = useRef<number | undefined>(undefined);
  const pausedRef = useRef(props.paused);
  const settleRef = useRef<() => void>(() => undefined);
  const onProgramRef = useRef(props.onProgram);
  const onStateRef = useRef(props.onState);

  useEffect(() => {
    onProgramRef.current = props.onProgram;
    onStateRef.current = props.onState;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || stream === undefined) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    // The first presented frame is what makes it live; `playing` alone fires
    // on a MediaStream before any picture has come down the wire.
    let cancelled = false;
    video.requestVideoFrameCallback(() => {
      if (!cancelled) onStateRef.current({ status: "live" });
    });
    return () => {
      cancelled = true;
    };
  }, [stream]);

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
      if (session === undefined) return;
      session.send({ type: "stop" });
      void session.close();
      onProgramRef.current(undefined);
    };

    /** Off the air, and why — in the console too, since the screen may show the replay instead. */
    const offAir = (reason: string) => {
      console.warn("[live] off air:", reason);
      onStateRef.current({ status: "off-air", reason });
    };

    /** Line up the next program behind the one on air, or open on it. */
    const direct = async (opening: boolean) => {
      const session = sessionRef.current;
      if (session === undefined || closed) return;
      // The test pattern reads no source: nothing is spent on X either.
      const result: ProgramResult = testPatternRef.current
        ? {
            program: testPatternProgram((testProgramsRef.current += 1)),
            world: "Test pattern.",
            formatLabel: "test pattern",
          }
        : await requestProgram(props.sourceId, opening);
      if (closed || sessionRef.current !== session) return;
      if ("reason" in result) {
        offAir(result.reason);
        closeSession();
        return;
      }
      versionRef.current += 1;
      const version = versionRef.current;
      programsRef.current.set(version, result.program);
      if (result.formatLabel !== undefined) formatLabelRef.current = result.formatLabel;
      if (opening) {
        session.send({
          type: "configure",
          protocol_version: 1,
          prompt_version: version,
          prompt:
            result.world === undefined
              ? result.program.prompt
              : `${result.world}\n\n${result.program.prompt}`,
          resolution: "768p",
          aspect_ratio: "16:9",
        });
      } else {
        session.send({ type: "prompt", prompt_version: version, prompt: result.program.prompt });
      }
    };

    /**
     * A subject's picture has been generated and will reach the screen in
     * `inSeconds`. Then: the ticker changes, the recording is told what is
     * on air, and the hold starts — the next prompt goes out when it ends.
     */
    const onScreenIn = (program: LiveProgram, inSeconds: number) => {
      if (tickerTimerRef.current !== undefined) window.clearTimeout(tickerTimerRef.current);
      if (nextTimerRef.current !== undefined) window.clearTimeout(nextTimerRef.current);
      const delay = Math.max(0, inSeconds) * 1000;
      tickerTimerRef.current = window.setTimeout(() => {
        tickerTimerRef.current = undefined;
        if (closed) return;
        onProgramRef.current(program);
        const onAir = { program, formatLabel: formatLabelRef.current };
        const stream = streamRef.current;
        if (recorderRef.current !== undefined) {
          recorderRef.current.setOnAir(onAir);
        } else if (props.record && stream !== undefined && canRecord()) {
          // The recording starts with the first picture, not the black
          // frames before it.
          recorderRef.current = createRecorder(stream, props.sourceId, onAir);
        }
      }, delay);
      nextTimerRef.current = window.setTimeout(
        () => {
          nextTimerRef.current = undefined;
          if (!closed) void direct(false);
        },
        delay + HOLD_SECONDS * 1000,
      );
    };

    const openSession = () => {
      if (sessionRef.current !== undefined || closed) return;
      onStateRef.current({ status: "connecting" });
      testPatternRef.current = testPatternRequested();
      const onMedia = (media: MediaStream) => {
        setStream(media);
        streamRef.current = media;
      };
      const handlers = {
        onMedia,
        onData: (raw: string) => {
          if (sessionRef.current !== session) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }
          const message = serverMessageSchema.safeParse(parsed);
          if (!message.success) return;
          switch (message.data.type) {
            case "configured":
              return;
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
            case "prompt_applied":
              return;
            case "prompt_rejected":
              void direct(false);
              return;
            case "error":
              offAir(`${message.data.code}: ${message.data.error}`);
              closeSession();
              return;
            case "stream_exhausted":
              offAir(
                message.data.reason === "session_limit"
                  ? "This session hit fal's length limit — tune away and back for a new one."
                  : "The session ended.",
              );
              closeSession();
              return;
            default:
              return;
          }
        },
      };
      const session: Session = testPatternRef.current
        ? openTestPatternSession(handlers)
        : fal.realtime.open(wma(DIRECTOR_MODEL), {
            receive: ["video", "audio"],
            ...handlers,
            onState: (state) => {
              if (sessionRef.current !== session) return;
              if (state === "closed") onProgramRef.current(undefined);
            },
            onError: (error) => {
              if (sessionRef.current !== session) return;
              sessionRef.current = undefined;
              onProgramRef.current(undefined);
              offAir(error instanceof Error ? error.message : "The live signal dropped");
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
      if (idleRef.current !== undefined) window.clearTimeout(idleRef.current);
      if (tickerTimerRef.current !== undefined) window.clearTimeout(tickerTimerRef.current);
      if (nextTimerRef.current !== undefined) window.clearTimeout(nextTimerRef.current);
      closeSession();
    };
  }, [props.sourceId, props.record]);

  useEffect(() => {
    pausedRef.current = props.paused;
    settleRef.current();
  }, [props.paused]);

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
