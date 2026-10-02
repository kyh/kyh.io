// Turns a markdown reply into short plain-text lines worth reading aloud.

const MAX_LINE = 400;

// A sentence ends at .!? and whitespace, unless the period closes a common
// abbreviation, or right after a CJK full stop.
const SENTENCE_END =
  /(?<!\b(?:e\.g|i\.e|vs|etc|cf|approx|mr|mrs|ms|dr|st|no)\.)(?<=[.!?])\s+|(?<=[。！？])/iu;

// Scripts read a character, not a word, at a time.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

const NARRATOR_STYLE =
  "Fast, upbeat, slightly breathless social-video narrator reading over mobile gameplay footage. Keep it punchy and clear.";

export const toSentences = (markdown: string): string[] => {
  const plain = markdown
    .replaceAll(/```[\s\S]*?(?:```|$)/gu, "\n(code omitted.)\n")
    .replaceAll(/`(?<code>[^`]*)`/gu, "$<code>")
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replaceAll(/\[(?<label>[^\]]+)\]\([^)]*\)/gu, "$<label>")
    .replaceAll(/https?:\/\/\S+?(?<end>[.,!?;:)]*)(?=\s|$)/gmu, "a link$<end>")
    .replaceAll(/^[ \t]*(?:\|?[ \t:|-]+\|[ \t:|-]*|[-*_]{3,}[ \t]*)$/gmu, "")
    .replaceAll(/[ \t]*\|[ \t]*/gu, ", ")
    .replaceAll(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gmu, "")
    .replaceAll(/[*_~]+/gu, "");

  return plain
    .split("\n")
    .flatMap((line) => line.split(SENTENCE_END))
    .map((s) => s.replaceAll(/^[\s,]+|[\s,]+$/gu, "").replaceAll(/\s+/gu, " "))
    .filter((s) => /[\p{L}\p{N}]/u.test(s))
    .map((s) => (s.length > MAX_LINE ? `${s.slice(0, MAX_LINE)}…` : s));
};

// How long a caption stays up when nothing speaks it.
export const readMs = (sentence: string) => {
  const words = sentence.split(/\s+/u).length * 330;
  const characters = (sentence.match(CJK) ?? []).length * 160;
  return Math.min(8000, Math.max(1200, words, characters));
};

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
// The mp3 lands in a temp file first so a failed or cut-off download exits
// non-zero instead of printing partial audio.
export const SPEECH_SCRIPT = [
  'f="$(mktemp)" || exit 1',
  "trap 'rm -f \"$f\"' EXIT",
  'curl -sS --fail -m 30 -o "$f" https://api.openai.com/v1/audio/speech ' +
    '-H "Authorization: Bearer $OPENAI_API_KEY" -H "Content-Type: application/json" ' +
    "--data-binary @- || exit 1",
  "base64 < \"$f\" | tr -d '\\n'",
].join("\n");
