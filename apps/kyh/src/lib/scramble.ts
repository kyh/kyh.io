/**
 * The heading scramble, after rauno.me/projects: the text types itself out one
 * glyph a tick behind a `_`, every glyph not yet settled rerolls each tick, and
 * the real letters settle left to right LAG ticks behind, so a band of noise
 * rides ahead of the settled text until the last letter lands. Spaces stay put.
 */
export const TICK_MS = 50;
export const LAG = 10;
export const CURSOR = "_";

/** One place in a frame: a real letter (or space), or noise still rerolling. */
export interface Cell {
  glyph: string;
  settled: boolean;
}

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
  const cells: Cell[] = [];
  let typed = 0;
  for (const char of text) {
    if (char === " ") {
      cells.push({ glyph: char, settled: true });
    } else if (typed < tick) {
      if (typed < tick - LAG) {
        cells.push({ glyph: char, settled: true });
      } else if (typed === tick - 1) {
        cells.push({ glyph: CURSOR, settled: false });
      } else {
        cells.push({
          glyph: glyphs[Math.floor(random() * glyphs.length)] ?? char,
          settled: false,
        });
      }
      typed += 1;
    }
  }
  return cells;
};
