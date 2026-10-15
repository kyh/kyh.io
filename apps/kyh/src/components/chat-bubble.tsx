import type { Line } from "@/lib/chat";
import { gradientOf } from "@/lib/color";

/** A chat bubble's look, shared by the site's cursors and the town's pointers. */
export const CHAT_BUBBLE_CLASS =
  "chat-bubble block w-max max-w-60 rounded-xl rounded-tl-sm px-2.5 py-1 text-xs leading-snug font-medium break-words text-[#111] shadow-sm";

interface ChatBubbleProps {
  line: Line;
  color: string;
  hue: string;
}

export const ChatBubble = ({ line, color, hue }: ChatBubbleProps) => (
  <span
    className={CHAT_BUBBLE_CLASS}
    data-typing={line.typing}
    style={{ background: gradientOf({ color, hue }) }}
  >
    {line.text}
  </span>
);
