"use client";

import { useEffect, useRef, useState } from "react";
import type { ManagedRealtimeSession, WmaRealtimeSession } from "@fal-ai/client/realtime";
import { wma } from "@fal-ai/client/realtime/wma";
import { z } from "zod";

import type { LiveProgram } from "@/lib/api-contract";
import { errorPayloadSchema, livePayloadSchema } from "@/lib/api-contract";
import { fal } from "@/lib/fal-client";

// The screen: one director session in this browser. The model streams
// continuous video over WebRTC and takes a new prompt whenever the programming
// says so; this keeps exactly one prompt queued behind the one on air, and
// queues the next only once the queued one is actually playing — the model
// accepts prompts into a deck faster than it plays them, and every program
// handed out is a paid source read.
//
// The session is the meter. It runs only while the tab is visible and the
// viewer isn't paused, and one idle long enough to be billed anyway is closed
// rather than left running.

const DIRECTOR_MODEL = "minimax/h3-max/director";
/** How long a hidden or paused tab keeps its session before it is closed. */
const IDLE_CLOSE_MS = 30_000;

const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("configured"), prompt_version: z.number() }),
  z.object({ type: z.literal("prompt_applied"), prompt_version: z.number() }),
  z.object({ type: z.literal("prompt_rejected"), prompt_version: z.number() }),
  z.object({ type: z.literal("chunk"), prompt_version: z.number() }),
  z.object({ type: z.literal("error"), code: z.string(), error: z.string() }),
  z.object({ type: z.literal("stream_exhausted"), reason: z.string() }),
]);

export type LiveState =
  | { status: "connecting" }
  | { status: "live" }
  | { status: "off-air"; reason: string };

type LiveScreenProps = {
  sourceId: string;
  muted: boolean;
  paused: boolean;
  /** The program now on air, for the ticker; undefined between sessions. */
  onProgram: (program: LiveProgram | undefined) => void;
  onState: (state: LiveState) => void;
};

type Session = ManagedRealtimeSession<WmaRealtimeSession>;

type ProgramResult = { program: LiveProgram } | { reason: string };

const requestProgram = async (sourceId: string): Promise<ProgramResult> => {
  try {
    const response = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorPayloadSchema.safeParse(body);
      return { reason: parsed.success ? parsed.data.error : "Signal lost — try again" };
    }
    const payload = livePayloadSchema.parse(body);
    return payload.kind === "off-air" ? { reason: payload.reason } : { program: payload.program };
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
      const result = await requestProgram(props.sourceId);
      if (closed || sessionRef.current !== session) return;
      if ("reason" in result) {
        onStateRef.current({ status: "off-air", reason: result.reason });
        closeSession();
        return;
      }
      versionRef.current += 1;
      const version = versionRef.current;
      programsRef.current.set(version, result.program);
      if (opening) {
        session.send({
          type: "configure",
          protocol_version: 1,
          prompt_version: version,
          prompt: result.program.prompt,
          resolution: "768p",
          aspect_ratio: "16:9",
        });
      } else {
        session.send({ type: "prompt", prompt_version: version, prompt: result.program.prompt });
      }
    };

    const openSession = () => {
      if (sessionRef.current !== undefined || closed) return;
      onStateRef.current({ status: "connecting" });
      const session = fal.realtime.open(wma(DIRECTOR_MODEL), {
        receive: ["video", "audio"],
        onMedia: (media) => setStream(media),
        onState: (state) => {
          if (sessionRef.current !== session) return;
          if (state === "live") onStateRef.current({ status: "live" });
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
          switch (message.data.type) {
            case "configured":
              // One program queued behind the opener from the start.
              void direct(false);
              return;
            case "chunk": {
              const program = programsRef.current.get(message.data.prompt_version);
              if (program !== undefined) onProgramRef.current(program);
              // The queued program has reached the screen: line up the next.
              if (message.data.prompt_version === versionRef.current) void direct(false);
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
      closeSession();
    };
  }, [props.sourceId]);

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
