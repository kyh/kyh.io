"use client";

import { useEffect, useState } from "react";

/**
 * Requests landscape orientation via the Screen Orientation API on mobile.
 * Falls back to showing a "rotate your device" prompt when the API isn't
 * available and the user is in portrait.
 */
export function LandscapeLock() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (!mq.matches) return;

    // Try the standard Screen Orientation API.
    // lock() isn't in all TS lib types yet, so we cast through unknown.
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (type: string) => Promise<void>;
    };
    if (orientation?.lock) {
      orientation.lock("landscape").catch(() => {
        // lock() rejected — browser doesn't support it or we're not fullscreen.
        // Fall back to the portrait prompt.
        checkOrientation();
      });
    } else {
      checkOrientation();
    }

    function checkOrientation() {
      const isPortrait = window.matchMedia(
        "(orientation: portrait)",
      ).matches;
      setShowPrompt(isPortrait);
    }

    // Update prompt when orientation changes (e.g. user rotates phone)
    const orientationMq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent) => setShowPrompt(e.matches);
    orientationMq.addEventListener("change", handler);

    return () => {
      orientationMq.removeEventListener("change", handler);
      if (orientation?.unlock) {
        try {
          orientation.unlock();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90">
      <div className="text-center text-white">
        <div className="mb-4 text-5xl">📱</div>
        <p className="text-lg font-bold">Rotate your device</p>
        <p className="mt-1 text-sm text-white/60">
          This game is best played in landscape
        </p>
      </div>
    </div>
  );
}
