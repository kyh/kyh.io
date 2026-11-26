import { graphemesOf } from "@/lib/graphemes";

/**
 * What each scrambled heading says in Chinese (traditional, as in Taiwan),
 * spelled in zhuyin with its tones. A heading's scramble churns through the
 * letters of that spelling and lands on its reading (tones dropped) just
 * ahead of the settling letters. A heading missing here churns through all
 * of zhuyin.
 */
export const ZHUYIN = new Map([
  ["About Kaiyu Hsu", "ㄍㄨㄢ ㄩˊ ㄒㄩˊ ㄎㄞ ㄩˇ"],
  ["Agent resources for kyh.io", "ㄉㄞˋ ㄌㄧˇ ㄗ ㄩㄢˊ"],
  ["Channels", "ㄍㄨㄢˇ ㄉㄠˋ"],
  ["Connect", "ㄌㄧㄢˊ ㄌㄨㄛˋ"],
  ["Contact Kaiyu Hsu", "ㄌㄧㄢˊ ㄌㄨㄛˋ ㄒㄩˊ ㄎㄞ ㄩˇ"],
  ["Elsewhere", "ㄑㄧˊ ㄊㄚ ㄉㄧˋ ㄈㄤ"],
  ["Endpoints", "ㄉㄨㄢ ㄉㄧㄢˇ"],
  ["Highlights", "ㄐㄧㄥ ㄒㄩㄢˇ"],
  ["Kaiyu Hsu", "ㄒㄩˊ ㄎㄞ ㄩˇ"],
  ["Other Activities", "ㄑㄧˊ ㄊㄚ ㄏㄨㄛˊ ㄉㄨㄥˋ"],
  ["Outside work", "ㄍㄨㄥ ㄗㄨㄛˋ ㄓ ㄨㄞˋ"],
  ["Privacy", "ㄧㄣˇ ㄙ"],
  ["Side Quests", "ㄓ ㄒㄧㄢˋ ㄖㄣˋ ㄨˋ"],
  ["What to send", "ㄐㄧˋ ㄕㄣˊ ˙ㄇㄜ"],
  ["What's collected", "ㄕㄡ ㄐㄧˊ ㄕㄣˊ ˙ㄇㄜ"],
  ["Who processes it", "ㄕㄟˊ ㄔㄨˇ ㄌㄧˇ"],
  ["Work", "ㄍㄨㄥ ㄗㄨㄛˋ"],
  ["Work Life", "ㄍㄨㄥ ㄗㄨㄛˋ ㄕㄥ ㄏㄨㄛˊ"],
]);

/** Every zhuyin symbol: what an untranslated heading scrambles through. */
export const GLYPHS = graphemesOf("ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ");

/** `text` read out in zhuyin without its tones, or "" when it has no translation. */
export const readingOf = (text: string) => (ZHUYIN.get(text) ?? "").replaceAll(/[ˊˇˋ˙]/gu, "");

/** What `text` scrambles through: the letters of its own spelling, or all of zhuyin without one. */
export const scrambleChars = (text: string) => {
  const spelling = graphemesOf(readingOf(text)).filter((symbol) => symbol !== " ");

  return spelling.length > 0 ? [...new Set(spelling)] : GLYPHS;
};
