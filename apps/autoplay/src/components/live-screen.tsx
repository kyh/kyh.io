"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagedRealtimeSession, WmaRealtimeSession } from "@fal-ai/client/realtime";
import { wma } from "@fal-ai/client/realtime/wma";
import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";
import { errorPayloadSchema, livePayloadSchema } from "@/lib/api-contract";
import { fal } from "@/lib/fal-client";
import { canRecord, createRecorder } from "@/lib/recorder";
import type { Recorder } from "@/lib/recorder";

// The screen: one director session in this browser. The model streams
// continuous video over WebRTC in chunks and takes a new prompt whenever the
// programming says so. A program is a whole number of chunks: the next
// prompt is queued when the current program's last chunk is generated, so it
// takes over at the following chunk boundary. Queuing any earlier would not
// shorten anything — the model accepts prompts into a deck faster than it
// plays them, and every program handed out is a paid source read.
//
// The session is the meter. It runs only while the tab is visible and the
// viewer isn't paused, and one idle long enough to be billed anyway is closed
// rather than left running.

const DIRECTOR_MODEL = "minimax/h3-max/director";
/**
 * Seconds of stream per subject. Long enough for a scene to develop around
 * it; a subject every chunk made the stream read as cuts.
 */
const PROGRAM_SECONDS = 30;
/** Chunk length asked of the model, the longest it serves (5–15s). */
const CHUNK_SECONDS = 15;
/** How long a hidden or paused tab keeps its session before it is closed. */
const IDLE_CLOSE_MS = 30_000;

const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("configured"),
    prompt_version: z.number(),
    chunk_duration: z.number().nullable().optional(),
  }),
  z.object({ type: z.literal("prompt_applied"), prompt_version: z.number() }),
  z.object({ type: z.literal("prompt_rejected"), prompt_version: z.number() }),
  z.object({
    type: z.literal("chunk"),
    prompt_version: z.number(),
    chunk_index: z.number(),
    buffer_depth_seconds: z.number(),
    requested_duration_seconds: z.number(),
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

type Session = ManagedRealtimeSession<WmaRealtimeSession>;

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
  /** Chunks the model serves; what a program's length is counted in. */
  const chunkSecondsRef = useRef(CHUNK_SECONDS);
  /** Chunks generated so far for the program on the latest prompt. */
  const chunksIntoProgramRef = useRef(0);
  const tickerTimerRef = useRef<number | undefined>(undefined);
  const recorderRef = useRef<Recorder | undefined>(undefined);
  const formatLabelRef = useRef("live");
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
      const session = sessionRef.current;
      sessionRef.current = undefined;
      if (session === undefined) return;
      session.send({ type: "stop" });
      void session.close();
      onProgramRef.current(undefined);
    };

    /** Queue the next program behind the one on air, or open on it. */
    const direct = async (opening: boolean) => {
      const session = sessionRef.current;
      if (session === undefined || closed) return;
      const result = await requestProgram(props.sourceId, opening);
      if (closed || sessionRef.current !== session) return;
      if ("reason" in result) {
        onStateRef.current({ status: "off-air", reason: result.reason });
        closeSession();
        return;
      }
      versionRef.current += 1;
      const version = versionRef.current;
      programsRef.current.set(version, result.program);
      chunksIntoProgramRef.current = 0;
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
          chunk_duration: CHUNK_SECONDS,
          resolution: "768p",
          aspect_ratio: "16:9",
        });
      } else {
        session.send({ type: "prompt", prompt_version: version, prompt: result.program.prompt });
      }
    };

    /**
     * Put a program in the ticker when its picture reaches the screen, not
     * its buffer — and cut the recording there too, so a segment is one
     * program and not the tail of the last.
     */
    const showWhenPlaying = (program: LiveProgram, inSeconds: number) => {
      if (tickerTimerRef.current !== undefined) window.clearTimeout(tickerTimerRef.current);
      tickerTimerRef.current = window.setTimeout(
        () => {
          tickerTimerRef.current = undefined;
          if (closed) return;
          onProgramRef.current(program);
          recorderRef.current?.rotate({
            program,
            formatLabel: formatLabelRef.current,
            startedAt: Date.now(),
          });
        },
        Math.max(0, inSeconds) * 1000,
      );
    };

    const openSession = () => {
      if (sessionRef.current !== undefined || closed) return;
      onStateRef.current({ status: "connecting" });
      const session = fal.realtime.open(wma(DIRECTOR_MODEL), {
        receive: ["video", "audio"],
        onMedia: (media) => {
          setStream(media);
          if (props.record && canRecord()) {
            recorderRef.current = createRecorder(media, props.sourceId);
          }
        },
        onState: (state) => {
          if (sessionRef.current !== session) return;
          if (state === "closed") onProgramRef.current(undefined);
        },
        onError: (error) => {
          if (sessionRef.current !== session) return;
          sessionRef.current = undefined;
          onProgramRef.current(undefined);
          onStateRef.current({
            status: "off-air",
            reason: error instanceof Error ? error.message : "The live signal dropped",
          });
        },
        onData: (raw) => {
          if (sessionRef.current !== session) return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }
          const message = serverMessageSchema.safeParse(parsed);
          if (!message.success) return;
          console.debug("[live]", message.data);
          switch (message.data.type) {
            case "configured":
              chunkSecondsRef.current = message.data.chunk_duration ?? chunkSecondsRef.current;
              return;
            case "chunk": {
              // What the model actually serves, whatever was asked for.
              chunkSecondsRef.current = message.data.requested_duration_seconds;
              const program = programsRef.current.get(message.data.prompt_version);
              if (program !== undefined && message.data.prompt_version === versionRef.current) {
                if (chunksIntoProgramRef.current === 0) {
                  showWhenPlaying(program, message.data.buffer_depth_seconds);
                }
                chunksIntoProgramRef.current += 1;
                // This program has all the chunks it gets; the next one takes
                // over at the following boundary.
                const chunksPerProgram = Math.max(
                  1,
                  Math.round(PROGRAM_SECONDS / chunkSecondsRef.current),
                );
                if (chunksIntoProgramRef.current >= chunksPerProgram) void direct(false);
              }
              return;
            }
            case "prompt_applied":
              return;
            case "prompt_rejected":
              void direct(false);
              return;
            case "error":
              onStateRef.current({ status: "off-air", reason: message.data.error });
              closeSession();
              return;
            case "stream_exhausted":
              onStateRef.current({
                status: "off-air",
                reason:
                  message.data.reason === "session_limit"
                    ? "This session hit fal's length limit — tune away and back for a new one."
                    : "The session ended.",
              });
              closeSession();
              return;
            default:
              return;
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
      if (idleRef.current !== undefined) window.clearTimeout(idleRef.current);
      if (tickerTimerRef.current !== undefined) window.clearTimeout(tickerTimerRef.current);
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
