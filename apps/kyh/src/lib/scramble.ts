/**
 * The heading scramble, after rauno.me/projects: the text types itself out one
 * glyph a tick, every glyph not yet settled rerolls each tick, and the real
 * letters settle left to right LAG ticks behind, so a band of noise rides
 * ahead of the settled text until the last letter lands. Spaces stay put.
 */
export const TICK_MS = 33;
export const LAG = 10;

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
    if (char === " ") {
      frame += char;
    } else if (typed < tick) {
      frame += typed < tick - LAG ? char : (glyphs[Math.floor(random() * glyphs.length)] ?? char);
      typed += 1;
    }
  }
  return frame;
};
