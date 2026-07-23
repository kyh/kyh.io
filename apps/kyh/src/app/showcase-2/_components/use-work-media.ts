"use client";

import { useEffect, useState } from "react";

import type { WorkMedia, WorkSeed } from "./works";

/* The wall packs any aspect, but extremes render as slivers or banners. */
const clampAspect = (aspect: number) => Math.min(2, Math.max(0.6, aspect || 16 / 9));

/* Poster frames only ever render in ~100px cells and the featured card. */
const POSTER_MAX_HEIGHT = 360;

const toWorkMedia = (seed: WorkSeed, aspect: number, thumbUrl: string): WorkMedia => ({
  slug: seed.slug,
  title: seed.title,
  category: seed.category,
  description: seed.description,
  url: seed.url,
  aspect: clampAspect(aspect),
  thumbUrl,
  ...(seed.media.type === "video" ? { videoUrl: seed.media.src } : {}),
});

const loadImage = (seed: WorkSeed): Promise<WorkMedia | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () =>
      resolve(toWorkMedia(seed, img.naturalWidth / img.naturalHeight, seed.media.src)),
    );
    img.addEventListener("error", () => resolve(null));
    img.src = seed.media.src;
  });

/* Wall cells are plain <img>, so a video asset contributes a captured frame —
   the same seek-and-draw the old vortex used to fill its texture atlas. A data
   URL (not an object URL) so the deck needs no revocation lifecycle. Requires
   CORS-clean pixels; a tainted canvas throws and the asset is dropped. */
const loadVideoPoster = (seed: WorkSeed): Promise<WorkMedia | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let settled = false;
    const finish = (value: WorkMedia | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    video.addEventListener("loadeddata", () => {
      // Seek slightly past the start to skip a black or empty first frame.
      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      video.currentTime = Math.min(0.5, duration * 0.1);
    });
    video.addEventListener("seeked", () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return finish(null);
      const scale = Math.min(1, POSTER_MAX_HEIGHT / h);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish(null);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(toWorkMedia(seed, w / h, canvas.toDataURL("image/jpeg", 0.7)));
      } catch {
        finish(null);
      }
    });
    video.addEventListener("error", () => finish(null));

    video.src = seed.media.src;
  });

/* A video that neither errors nor produces data would otherwise hold the
   whole deck hostage — Promise.all gates the wall on every asset. */
const withTimeout = (loader: Promise<WorkMedia | null>): Promise<WorkMedia | null> =>
  Promise.race([loader, new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000))]);

/** Resolves seeds into the wall deck: measures every image, captures a poster
 *  frame from every video, drops whatever fails to load. `null` until ready. */
export function useWorkMedia(seeds: WorkSeed[]): readonly [WorkMedia, ...WorkMedia[]] | null {
  const [media, setMedia] = useState<readonly [WorkMedia, ...WorkMedia[]] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      const loaded = await Promise.all(
        seeds.map((seed) =>
          seed.media.type === "video" ? withTimeout(loadVideoPoster(seed)) : loadImage(seed),
        ),
      );
      if (cancelled) return;
      const [first, ...rest] = loaded.filter((m): m is WorkMedia => m !== null);
      if (first) setMedia([first, ...rest]);
    };
    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [seeds]);

  return media;
}
