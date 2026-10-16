import { useEffect, useId, useRef, useState } from "react";
import { Interpolator, lerp } from "@vibedgames/multiplayer";

import type { Chat } from "@/lib/chat";
import { lineOf } from "@/lib/chat";
import type { PagePoint } from "@/lib/page-point";
import { readViewport, toScreen } from "@/lib/page-point";
import { ChatBubble } from "@/components/chat-bubble";

interface CursorProps {
  at: PagePoint;
  /** When the sender sent this spot, on the room's clock. */
  t: number;
  color?: string;
  hue?: string;
  chat: Chat;
}

const offset = 10;

/** The pointer arrow, shared by the site's cursors and the town's pointers. */
export const CURSOR_ARROW =
  "M2.717 2.22918L15.9831 15.8743C16.5994 16.5083 16.1503 17.5714 15.2661 17.5714H9.35976C8.59988 17.5714 7.86831 17.8598 7.3128 18.3783L2.68232 22.7C2.0431 23.2966 1 22.8434 1 21.969V2.92626C1 2.02855 2.09122 1.58553 2.717 2.22918Z";

const lerpPoint = (a: PagePoint, b: PagePoint, k: number): PagePoint => ({
  fromCenter: lerp(a.fromCenter, b.fromCenter, k),
  fromTop: lerp(a.fromTop, b.fromTop, k),
});

const HIDDEN = { transform: "translate(-100px, -100px)" };

/**
 * Another visitor's pointer, played back a beat behind what they sent and
 * blended between their updates (as the town's pointers are), so it glides at
 * any send rate; each frame moves it without a React render.
 */
export const Cursor = ({ at: { fromCenter, fromTop }, t, color, hue, chat }: CursorProps) => {
  // useId's punctuation isn't safe inside url(#…).
  const gradient = `cursor-${useId().replaceAll(/[^\w-]/gu, "")}`;
  const ref = useRef<HTMLDivElement>(null);
  // oxlint-disable-next-line react/hook-use-state -- made once per cursor and never replaced
  const [smooth] = useState(
    // Extrapolating past the last spot parks a pointer that stopped (or a page that jumped) beyond where it is.
    () => new Interpolator<PagePoint>({ delayMs: 120, lerp: lerpPoint, maxExtrapolateMs: 0 }),
  );

  useEffect(() => {
    smooth.push(t, { fromCenter, fromTop });
  }, [smooth, t, fromCenter, fromTop]);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const point = smooth.sample();
      if (point && ref.current) {
        const view = readViewport();
        const { x, y } = toScreen(point, view);
        ref.current.style.transform = `translate(${x - offset}px, ${y - offset}px)`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [smooth]);

  const line = lineOf(chat);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-[1]"
      // Off screen until the first frame places it; only that loop moves it after.
      style={HIDDEN}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="24"
        viewBox="0 0 18 24"
        fill="none"
        style={{ color }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hue} />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={CURSOR_ARROW} fill={`url(#${gradient})`} stroke={hue} strokeWidth="2" />
      </svg>
      {line !== null && color && hue && (
        <div className="absolute top-5 left-4">
          <ChatBubble line={line} color={color} hue={hue} />
        </div>
      )}
    </div>
  );
};
