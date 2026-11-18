"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export const playQuietly = async (video: HTMLVideoElement) => {
  try {
    await video.play();
  } catch {}
};

export const useVideoPlayback = (muted: boolean, paused: boolean) => {
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
