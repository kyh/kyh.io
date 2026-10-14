import type { Line } from "@/lib/chat";

/** A chat bubble's look, shared by the site's cursors and the town's pointers. */
export const CHAT_BUBBLE_CLASS =
  "chat-bubble block w-max max-w-60 rounded-xl rounded-tl-sm px-2.5 py-1 font-mono text-xs leading-snug font-medium break-words text-[#111] shadow-sm";

/** The avatar's gradient, light hue down to full color, behind dark text. */
export const chatBackground = (color: string, hue: string) => `linear-gradient(${hue}, ${color})`;

interface ChatBubbleProps {
  line: Line;
  color: string;
  hue: string;
}

export const ChatBubble = ({ line, color, hue }: ChatBubbleProps) => (
  <span
    className={CHAT_BUBBLE_CLASS}
    data-typing={line.typing}
    style={{ background: chatBackground(color, hue) }}
  >
    {line.text}
  </span>
);
