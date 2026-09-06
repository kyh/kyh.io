"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// The screen's video element, shared by the live and replay players, kept in
// step with the TV's mute and pause controls.

export const useVideoPlayback = (
  muted: boolean,
  paused: boolean,
): RefObject<HTMLVideoElement | null> => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;
    video.muted = muted;
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => undefined);
    }
  }, [muted, paused]);
  return videoRef;
};

type TvVideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  muted: boolean;
};

export const TvVideo = ({ videoRef, muted }: TvVideoProps) => (
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted={muted}
    className="absolute inset-0 h-full w-full object-contain"
  />
);
