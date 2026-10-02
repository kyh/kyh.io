// Turns a markdown reply into short plain-text lines worth reading aloud.

const MAX_LINE = 400;

const NARRATOR_STYLE =
  "Fast, upbeat, slightly breathless social-video narrator reading over mobile gameplay footage. Keep it punchy and clear.";

export const toSentences = (markdown: string): string[] => {
  const plain = markdown
    .replaceAll(/```[\s\S]*?```/gu, "\n(code omitted.)\n")
    .replaceAll(/`(?<code>[^`]*)`/gu, "$<code>")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replaceAll(/\[(?<label>[^\]]+)\]\([^)]*\)/gu, "$<label>")
    .replaceAll(/https?:\/\/\S+?(?<end>[.,!?;:)]*)(?=\s|$)/gmu, "a link$<end>")
    .replaceAll(/^[ \t]*(?:\|?[ \t:|-]+\|[ \t:|-]*|[-*_]{3,}[ \t]*)$/gmu, "")
    .replaceAll(/[ \t]*\|[ \t]*/gu, ", ")
    .replaceAll(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gmu, "")
    .replaceAll(/[*_~#]+/gu, "");

  return plain
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?])\s+|(?<=[。！？])/u))
    .map((s) => s.replaceAll(/^[\s,]+|[\s,]+$/gu, "").replaceAll(/\s+/gu, " "))
    .filter((s) => /[\p{L}\p{N}]/u.test(s))
    .map((s) => (s.length > MAX_LINE ? `${s.slice(0, MAX_LINE)}…` : s));
};

// How long a caption stays up when nothing speaks it.
export const readMs = (sentence: string) =>
  Math.min(8000, Math.max(1200, sentence.split(" ").length * 330));

// The JSON body of one OpenAI /v1/audio/speech request; only the gpt speech
// models take `instructions`.
export const speechRequest = (input: string, voice: string, model: string) => {
  const body = { input, model, response_format: "mp3", voice };
  return JSON.stringify(
    model.startsWith("gpt-") ? { ...body, instructions: NARRATOR_STYLE } : body,
  );
};

// Posts the body from stdin and prints the mp3 as one line of base64: the
// hooks sandbox reads process output as text, so raw audio would not survive.
export const SPEECH_SCRIPT =
  "curl -sS --fail -m 30 https://api.openai.com/v1/audio/speech " +
  '-H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" ' +
  "--data-binary @- | base64 | tr -d '\\n'";
