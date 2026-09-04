"use client";

import { useEffect, useRef, useState } from "react";

import type { Recording } from "@/lib/api-contract";
import { replayPayloadSchema } from "@/lib/api-contract";

// The replay: what the channel recorded while it was live, newest first, on
// a loop. Two stacked players so a handover is a crossfade and not a load,
// and a fresh look at the list now and then so a viewer who stays sees new
// segments as they land.

/** How often the list is re-read while a replay runs. */
const REFRESH_MS = 120_000;

type Slot = 0 | 1;

const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0);

export type ReplayState =
  | { status: "loading" }
  | { status: "playing" }
  | { status: "empty"; reason: string };

type ReplayScreenProps = {
  sourceId: string;
  muted: boolean;
  paused: boolean;
  onProgram: (recording: Recording | undefined) => void;
  onState: (state: ReplayState) => void;
};

const fetchRecordings = async (sourceId: string): Promise<Recording[] | undefined> => {
  try {
    const response = await fetch(`/api/replay?sourceId=${encodeURIComponent(sourceId)}`);
    if (!response.ok) return undefined;
    return replayPayloadSchema.parse(await response.json()).recordings;
  } catch {
    return undefined;
  }
};

export const ReplayScreen = (props: ReplayScreenProps) => {
  const [recordings, setRecordings] = useState<Recording[] | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [activeSlot, setActiveSlot] = useState<Slot>(0);
  const videoRefs = useRef<Record<Slot, HTMLVideoElement | null>>({ 0: null, 1: null });
  const onProgramRef = useRef(props.onProgram);
  const onStateRef = useRef(props.onState);

  useEffect(() => {
    onProgramRef.current = props.onProgram;
    onStateRef.current = props.onState;
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const list = await fetchRecordings(props.sourceId);
      if (cancelled) return;
      setRecordings(list ?? []);
    };
    void load();
    const refresh = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [props.sourceId]);

  useEffect(() => {
    if (recordings === undefined) {
      onStateRef.current({ status: "loading" });
      return;
    }
    if (recordings.length === 0) {
      onStateRef.current({
        status: "empty",
        reason: "Nothing recorded yet — this channel records while its owner is watching.",
      });
      onProgramRef.current(undefined);
      return;
    }
    onStateRef.current({ status: "playing" });
    onProgramRef.current(recordings[index % recordings.length]);
  }, [recordings, index]);

  useEffect(() => {
    const video = videoRefs.current[activeSlot];
    if (video === null) return;
    video.muted = props.muted;
    if (props.paused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [props.muted, props.paused, activeSlot]);

  if (recordings === undefined || recordings.length === 0) return null;

  const current = recordings[index % recordings.length];
  const next = recordings[(index + 1) % recordings.length];

  const advance = () => {
    const incoming = other(activeSlot);
    const video = videoRefs.current[incoming];
    if (video !== null) {
      video.currentTime = 0;
      if (!props.paused) void video.play().catch(() => undefined);
    }
    setActiveSlot(incoming);
    setIndex((value) => value + 1);
  };

  return (
    <>
      {([0, 1] as const).map((slot) => {
        const recording = slot === activeSlot ? current : next;
        if (recording === undefined) return null;
        return (
          <video
            key={slot}
            ref={(el) => {
              videoRefs.current[slot] = el;
              if (el !== null) el.muted = props.muted;
            }}
            src={recording.url}
            autoPlay={slot === activeSlot}
            playsInline
            preload="auto"
            muted={props.muted}
            onEnded={slot === activeSlot ? advance : undefined}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
              slot === activeSlot ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}
    </>
  );
};
