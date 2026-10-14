interface ChatBubbleProps {
  text: string;
  /** Still being typed: drawn in the lighter hue, with a caret. */
  typing: boolean;
  color: string;
  hue: string;
}

export const ChatBubble = ({ text, typing, color, hue }: ChatBubbleProps) => (
  <span
    className="chat-bubble block w-max max-w-60 rounded-xl rounded-tl-sm px-2.5 py-1 font-mono text-xs leading-snug font-medium break-words shadow-sm"
    data-typing={typing}
    style={
      typing ? { backgroundColor: hue, color: "#111" } : { backgroundColor: color, color: "#fff" }
    }
  >
    {text}
  </span>
);
