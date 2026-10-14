interface ChatBubbleProps {
  text: string;
  /** Still being typed: drawn with a caret. */
  typing: boolean;
  color: string;
  hue: string;
}

/** The avatar's gradient, light hue down to full color, behind dark text. */
export const chatBackground = (color: string, hue: string) => `linear-gradient(${hue}, ${color})`;

export const ChatBubble = ({ text, typing, color, hue }: ChatBubbleProps) => (
  <span
    className="chat-bubble block w-max max-w-60 rounded-xl rounded-tl-sm px-2.5 py-1 font-mono text-xs leading-snug font-medium break-words text-[#111] shadow-sm"
    data-typing={typing}
    style={{ background: chatBackground(color, hue) }}
  >
    {text}
  </span>
);
