/**
 * What each scrambled heading says in Chinese (traditional, as in Taiwan),
 * spelled in zhuyin with its tones. A heading scrambles out its reading
 * (tones dropped) before itself, churning through the letters of its own
 * spelling. A heading missing here churns through all of zhuyin.
 */
export const ZHUYIN = new Map([
  // 關於徐開宇
  ["About Kaiyu Hsu", "ㄍㄨㄢ ㄩˊ ㄒㄩˊ ㄎㄞ ㄩˇ"],
  // 代理資源
  ["Agent resources for kyh.io", "ㄉㄞˋ ㄌㄧˇ ㄗ ㄩㄢˊ"],
  // 管道
  ["Channels", "ㄍㄨㄢˇ ㄉㄠˋ"],
  // 聯絡
  ["Connect", "ㄌㄧㄢˊ ㄌㄨㄛˋ"],
  // 聯絡徐開宇
  ["Contact Kaiyu Hsu", "ㄌㄧㄢˊ ㄌㄨㄛˋ ㄒㄩˊ ㄎㄞ ㄩˇ"],
  // 其他地方
  ["Elsewhere", "ㄑㄧˊ ㄊㄚ ㄉㄧˋ ㄈㄤ"],
  // 端點
  ["Endpoints", "ㄉㄨㄢ ㄉㄧㄢˇ"],
  // 精選
  ["Highlights", "ㄐㄧㄥ ㄒㄩㄢˇ"],
  // 徐開宇
  ["Kaiyu Hsu", "ㄒㄩˊ ㄎㄞ ㄩˇ"],
  // 其他活動
  ["Other Activities", "ㄑㄧˊ ㄊㄚ ㄏㄨㄛˊ ㄉㄨㄥˋ"],
  // 工作之外
  ["Outside work", "ㄍㄨㄥ ㄗㄨㄛˋ ㄓ ㄨㄞˋ"],
  // 隱私
  ["Privacy", "ㄧㄣˇ ㄙ"],
  // 支線任務
  ["Side Quests", "ㄓ ㄒㄧㄢˋ ㄖㄣˋ ㄨˋ"],
  // 寄什麼
  ["What to send", "ㄐㄧˋ ㄕㄣˊ ˙ㄇㄜ"],
  // 收集什麼
  ["What's collected", "ㄕㄡ ㄐㄧˊ ㄕㄣˊ ˙ㄇㄜ"],
  // 誰處理
  ["Who processes it", "ㄕㄟˊ ㄔㄨˇ ㄌㄧˇ"],
  // 工作
  ["Work", "ㄍㄨㄥ ㄗㄨㄛˋ"],
  // 工作生活
  ["Work Life", "ㄍㄨㄥ ㄗㄨㄛˋ ㄕㄥ ㄏㄨㄛˊ"],
]);

/** Every zhuyin symbol: what an untranslated heading scrambles through. */
export const GLYPHS = [
  ..."ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ",
];

/** `text` read out in zhuyin without its tones, or "" when it has no translation. */
export const readingOf = (text: string) => (ZHUYIN.get(text) ?? "").replaceAll(/[ˊˇˋ˙]/gu, "");

/** What `text` scrambles through: the letters of its own spelling, or all of zhuyin without one. */
export const scrambleChars = (text: string) => {
  const spelling = [...readingOf(text)].filter((symbol) => symbol !== " ");
  return spelling.length > 0 ? [...new Set(spelling)] : GLYPHS;
};
