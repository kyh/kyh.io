/**
 * What each scrambled heading says in Chinese (traditional, as in Taiwan),
 * spelled in zhuyin with its tones. While a heading scrambles, its letters
 * flash these symbols in order, repeating, so the wave sweeping across reads
 * the heading aloud. Spaces only split syllables here; they don't flash. A
 * heading missing here scrambles through random zhuyin instead.
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

/** The symbol letter `index` of `text` flashes, or undefined without a translation. */
export const zhuyinGlyph = (text: string, index: number) => {
  const symbols = [...(ZHUYIN.get(text) ?? "")].filter((symbol) => symbol !== " ");
  return symbols.length > 0 ? symbols[index % symbols.length] : undefined;
};
