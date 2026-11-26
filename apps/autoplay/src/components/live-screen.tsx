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

const HOLD_SECONDS = 10;
const IDLE_CLOSE_MS = 30_000;

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

interface Session {
  send: (message: ClientMessage) => void;
  close: () => void | Promise<void>;
}

type ProgramResult = { program: LiveProgram; formatLabel?: string } | { reason: string };

const requestProgram: (sourceId: string, opening: boolean) => Promise<ProgramResult> = async (
  sourceId,
  opening,
) => {
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
  const sessionRef = useRef<Session | undefined>(undefined);
  const [stream, setStream] = useState<MediaStream | undefined>();
  const versionRef = useRef(0);
  const programsRef = useRef(new Map<number, LiveProgram>());
  const shownVersionRef = useRef(0);
  const tickerTimerRef = useRef<number | undefined>(undefined);
  const nextTimerRef = useRef<number | undefined>(undefined);
  const recorderRef = useRef<Recorder | undefined>(undefined);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const formatLabelRef = useRef("live");
  const testStreamRef = useRef(false);
  const testProgramsRef = useRef(0);
  const idleRef = useRef<number | undefined>(undefined);
  const pausedRef = useRef(props.paused);

  // oxlint-disable-next-line no-empty-function -- nothing to settle before a session opens
  const settleRef = useRef<() => void>(() => {});

  const emitProgram = useEffectEvent(props.onProgram);
  const emitState = useEffectEvent(props.onState);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const video = videoRef.current;

    if (video !== null && stream !== undefined) {
      video.srcObject = stream;

      void playQuietly(video);

      let cancelled = false;

      video.requestVideoFrameCallback(() => {
        if (!cancelled) {
          emitState({ status: "live" });
        }
      });

      cleanup = () => {
        cancelled = true;
      };
    }

    return cleanup;
  }, [stream, videoRef]);

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

    const offAir = (reason: string) => {
      console.warn("[live] off air:", reason);
      emitState({ reason, status: "off-air" });
    };

    const direct = async (opening: boolean) => {
      const session = sessionRef.current;

      if (session === undefined || closed) {
        return;
      }

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

    const onMedia = (media: MediaStream) => {
      setStream(media);
      streamRef.current = media;
    };

    const openSession = () => {
      if (sessionRef.current !== undefined || closed) {
        return;
      }

      emitState({ status: "connecting" });
      testStreamRef.current = testStreamRequested();

      const handlers = {
        onData: (raw: string) => {
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

            default: {
              message.data satisfies never;
            }
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
