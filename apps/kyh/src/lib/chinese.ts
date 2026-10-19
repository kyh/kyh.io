/**
 * What each scrambled heading says in Chinese (traditional, as in Taiwan). While
 * a heading scrambles, its letters flash these characters in order, repeating,
 * so the wave sweeping across reads the heading in Chinese. A heading missing
 * here scrambles through random zhuyin instead.
 */
export const CHINESE = new Map([
  ["About Kaiyu Hsu", "關於我"],
  ["Agent resources for kyh.io", "代理資源"],
  ["Channels", "管道"],
  ["Connect", "聯絡"],
  ["Contact Kaiyu Hsu", "聯絡我"],
  ["Elsewhere", "其他地方"],
  ["Endpoints", "端點"],
  ["Highlights", "精選"],
  ["Other Activities", "其他活動"],
  ["Outside work", "工作之外"],
  ["Privacy", "隱私"],
  ["Side Quests", "支線任務"],
  ["What to send", "寄什麼"],
  ["What's collected", "收集什麼"],
  ["Who processes it", "誰處理"],
  ["Work", "工作"],
  ["Work Life", "工作生活"],
]);

/** The character letter `index` of `text` flashes, or undefined without a translation. */
export const chineseGlyph = (text: string, index: number) => {
  const chinese = [...(CHINESE.get(text) ?? "")];
  return chinese.length > 0 ? chinese[index % chinese.length] : undefined;
};
