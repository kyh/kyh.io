/**
 * The heading scramble, after rauno.me/projects: the text types itself out one
 * glyph a tick, every glyph not yet settled rerolls each tick, and the real
 * letters settle left to right LAG ticks behind, so a band of noise rides
 * ahead of the settled text until the last letter lands. Spaces stay put.
 * A heading with a reading types that out first, holds it HOLD ticks, then
 * types itself out over it, left to right.
 */
export const TICK_MS = 50;
export const LAG = 10;
export const HOLD = 6;

const lettersOf = (text: string) => [...text].filter((char) => char !== " ").length;

/** How many ticks `text` takes to settle completely. */
export const scrambleTicks = (text: string) => lettersOf(text) + LAG;

/** `text` as it shows `tick` ticks in, drawing unsettled glyphs from `glyphs`. */
export const scrambleFrame = (
  text: string,
  tick: number,
  glyphs: readonly string[],
  random: () => number,
) => {
  let typed = 0;
  let frame = "";
  for (const char of text) {
    if (typed >= tick) {
      break;
    }
    if (char === " ") {
      frame += char;
    } else {
      frame += typed < tick - LAG ? char : (glyphs[Math.floor(random() * glyphs.length)] ?? char);
      typed += 1;
    }
  }
  return frame;
};

const readingTicks = (reading: string) => (reading ? scrambleTicks(reading) + HOLD : 0);

/** How many ticks `text` takes to settle after its `reading`. */
export const translateTicks = (text: string, reading: string) =>
  readingTicks(reading) + scrambleTicks(text);

/** `reading` typing out and holding, then `text` typing out over what's left of it. */
export const translateFrame = (
  text: string,
  reading: string,
  tick: number,
  glyphs: readonly string[],
  random: () => number,
) => {
  const read = readingTicks(reading);
  if (tick < read) {
    return scrambleFrame(reading, tick, glyphs, random);
  }
  const head = scrambleFrame(text, tick - read, glyphs, random);
  return head + [...reading].slice([...head].length).join("");
};
