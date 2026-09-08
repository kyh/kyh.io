"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// The screen's video element, shared by the live and replay players, kept in
// step with the TV's mute and pause controls.

export const playQuietly = async (video: HTMLVideoElement): Promise<void> => {
  try {
    await video.play();
  } catch {
    // Autoplay policy refused; the viewer's next control press retries.
  }
};

export const useVideoPlayback = (
  muted: boolean,
  paused: boolean,
): RefObject<HTMLVideoElement | null> => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }
    video.muted = muted;
    if (paused) {
      video.pause();
    } else {
      void playQuietly(video);
    }
  }, [muted, paused]);
  return videoRef;
};

interface TvVideoProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  muted: boolean;
}

export const TvVideo = ({ videoRef, muted }: TvVideoProps) => (
  // oxlint-disable-next-line jsx-a11y/media-has-caption -- generated live video; no caption source exists
  <video
    ref={videoRef}
    autoPlay
    playsInline
    muted={muted}
    className="absolute inset-0 h-full w-full object-contain"
  />
);
