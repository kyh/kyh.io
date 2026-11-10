"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Status = "loading" | "ready" | "failed";

// three.js stays out of the page bundle; the copy and form hydrate first.
const loadScene = () => import("@/lib/honeypot/scene");

const Honeypot = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [touched, setTouched] = useState(false);

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
          onInteract: () => setTouched(true),
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
    <div className="relative size-full">
      <div className="size-full mask-b-from-90%">
        {status === "failed" ? (
          <Image
            alt="A glass jar of honey with a wooden dipper resting on the rim"
            className="object-contain"
            fill
            priority
            sizes="100vw"
            src="/honeypot.png"
          />
        ) : (
          <canvas
            aria-label="A glass jar of honey with a wooden dipper. Arrow keys turn it, Enter drips honey."
            className={`block size-full cursor-grab touch-[pan-y_pinch-zoom] outline-none transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-[#0071e3]/40 active:cursor-grabbing motion-reduce:transition-opacity ${
              status === "ready" ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
            }`}
            ref={canvasRef}
            tabIndex={0}
          />
        )}
      </div>
      <p
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-secondary transition-opacity duration-500 ${
          status === "ready" && !touched ? "opacity-100" : "opacity-0"
        }`}
      >
        Drag to turn. Hold to pour.
      </p>
    </div>
  );
};

export { Honeypot };
