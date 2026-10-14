import { useId } from "react";

import type { Chat } from "@/lib/chat";
import { lineOf } from "@/lib/chat";
import { ChatBubble } from "@/components/chat-bubble";

interface CursorProps {
  x?: number;
  y?: number;
  color?: string;
  hue?: string;
  chat: Chat;
  windowDimensions: {
    width: number;
    height: number;
  };
}

const offset = 10;

/** The pointer arrow, shared by the site's cursors and the town's pointers. */
export const CURSOR_ARROW =
  "M2.717 2.22918L15.9831 15.8743C16.5994 16.5083 16.1503 17.5714 15.2661 17.5714H9.35976C8.59988 17.5714 7.86831 17.8598 7.3128 18.3783L2.68232 22.7C2.0431 23.2966 1 22.8434 1 21.969V2.92626C1 2.02855 2.09122 1.58553 2.717 2.22918Z";

export const Cursor = ({ x, y, color, hue, chat, windowDimensions }: CursorProps) => {
  // useId's punctuation isn't safe inside url(#…).
  const gradient = `cursor-${useId().replaceAll(/[^\w-]/gu, "")}`;
  if (!x || !y) {
    return null;
  }

  const cursorWidth = 18;
  const maxLeft = windowDimensions.width - cursorWidth;
  const left = Math.min(x * windowDimensions.width - offset, maxLeft);
  const top = y * windowDimensions.height - offset;
  const line = lineOf(chat);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-[1] transition-transform duration-150 ease-out"
      style={{ transform: `translateX(${left}px) translateY(${top}px)` }}
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
