"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "failed";

// three.js stays out of the page bundle; the copy and form hydrate first.
const loadScene = () => import("@/lib/honeypot/scene");

const Honeypot = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let teardown: (() => void) | undefined;
    let cancelled = false;
    const mount = async () => {
      try {
        const { mountHoneypot } = await loadScene();
        if (cancelled) {
          return;
        }
        teardown = mountHoneypot(canvas, {
          onLost: () => setStatus("failed"),
          onReady: () => setStatus("ready"),
        });
      } catch {
        setStatus("failed");
      }
    };
    void mount();
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <div className="size-full">
      {status === "failed" ? (
        <Image
          alt="A glass jar of honey with a wooden dipper resting on the rim"
          className="object-contain"
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          src="/honeypot.png"
        />
      ) : (
        <canvas
          aria-label="A glass jar of honey with a wooden dipper. Drag the dipper to drizzle honey; arrow keys turn the jar, Enter drizzles."
          className={`block size-full cursor-grab touch-[pan-y_pinch-zoom] outline-none transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[#0071e3]/40 active:cursor-grabbing motion-reduce:transition-opacity ${
            status === "ready" ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
          }`}
          ref={canvasRef}
          tabIndex={0}
        />
      )}
    </div>
  );
};

export { Honeypot };
