"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState } from "react";

type Status = "loading" | "ready" | "failed";

// three.js stays out of the page bundle; the copy and form hydrate first.
const loadScene = () => import("@/lib/honeypot/scene");

interface HoneypotProps {
  /** Someone picked the dipper up, or put it down. */
  onCarry: (held: boolean) => void;
}

const Honeypot = ({ onCarry }: HoneypotProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const carry = useEffectEvent(onCarry);

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
          onCarry: carry,
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
      {status === "failed" ? (
        <Image
          alt="A halftone photo of a glass jar of honey with a wooden dipper"
          className="object-contain"
          fill
          priority
          src="/honeypot.png"
          unoptimized
        />
      ) : (
        <canvas
          aria-label="A glass jar of honey with a wooden dipper. Drag the dipper to drizzle honey; arrow keys turn the jar, Enter drizzles."
          className={`block size-full cursor-grab touch-[pan-y_pinch-zoom] mix-blend-multiply transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-red active:cursor-grabbing motion-reduce:transition-opacity ${
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
