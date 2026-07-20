"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { ScrambleText } from "@/components/animate-text";
import type { CenteredTile, MediaTile } from "./gallery";
import { Gallery } from "./gallery";

export type Work = {
  title: string;
  description: string;
  url: string;
  favicon: string;
};

type VortexProps = {
  works: Work[];
  tiles: MediaTile[];
};

export const Vortex = ({ works, tiles }: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState<CenteredTile | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    camera.position.z = 5;
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const setSize = () => {
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    setSize();

    // World-space viewport height at the camera plane, used to normalise scroll input.
    const getViewportHeight = () => {
      const fov = camera.fov * (Math.PI / 180);
      return camera.position.z * Math.tan(fov / 2) * 2;
    };
    let viewportHeight = getViewportHeight();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gallery = new Gallery({
      scene,
      tiles,
      reducedMotion: motionQuery.matches,
      maxAnisotropy,
      onCenterChange: (centered) => setActive(centered),
    });
    const onMotionChange = (event: MediaQueryListEvent) => gallery.setReducedMotion(event.matches);
    motionQuery.addEventListener("change", onMotionChange);

    let frame = 0;
    const tick = (now: number) => {
      gallery.render(now / 1000);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    let lastDirection = 1;
    const drive = (delta: number) => {
      const sign = Math.sign(delta);
      if (sign !== 0) lastDirection = sign;
      gallery.updateScroll((delta * viewportHeight) / window.innerHeight, lastDirection);
    };

    const onWheel = (event: WheelEvent) => drive(event.deltaY);

    let lastTouchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      drive(lastTouchY - y);
      lastTouchY = y;
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      viewportHeight = getViewportHeight();
      setSize();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onMotionChange);
      gallery.dispose();
      renderer.dispose();
    };
  }, [tiles]);

  const work = active ? works[active.workIndex] : null;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Rendered after mount only — ScrambleText's random glyphs would otherwise
          cause a hydration mismatch. */}
      {mounted && active && work && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-5 pb-20 text-center">
          {active.media.type === "video" ? (
            <video
              key={active.media.src}
              className="max-h-[42vh] w-auto max-w-[88vw] rounded-xl object-contain shadow-2xl"
              src={active.media.src}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={active.media.src}
              className="max-h-[42vh] w-auto max-w-[88vw] rounded-xl object-contain shadow-2xl"
              src={active.media.src}
              alt={work.title}
            />
          )}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={work.favicon} className="size-6 rounded" src={work.favicon} alt="" />
              <ScrambleText
                key={work.title}
                as="h1"
                className="text-2xl font-normal text-foreground-highlighted"
              >
                {work.title}
              </ScrambleText>
            </div>
            <a
              className="link pointer-events-auto mt-1 text-sm"
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
