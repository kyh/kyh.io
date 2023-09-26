"use client";

import Image from "next/image";
import { Card } from "~/components/card";
import styles from "./google.module.css";
import { useEffect, useRef } from "react";

export const GoogleCard = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    const loop = () => {
      if (!video || !video.currentTime) return;
      if (video.currentTime >= 50) {
        video.pause();
        video.currentTime = 0;
        video.play();
      }
    };

    video?.addEventListener("timeupdate", loop);

    return () => {
      video?.removeEventListener("timeupdate", loop);
    };
  }, []);

  return (
    <a href="https://grow.google/" target="_blank" rel="noopener noreferrer">
      <Card className={styles.card}>
        <video ref={videoRef} autoPlay muted data-full-size>
          <source src="/projects/google-grow.webm" type="video/webm" />
          Unsupported.
        </video>
        <Image
          className={styles.logo}
          data-light-only
          src="/projects/google-grow-logo-light.svg"
          alt="Grow with Google"
          width="200"
          height="50"
        />
        <Image
          className={styles.logo}
          data-dark-only
          src="/projects/google-grow-logo-dark.svg"
          alt="Grow with Google"
          width="200"
          height="50"
        />
      </Card>
    </a>
  );
};
