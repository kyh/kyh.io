/**
 * The heading scramble, after rauno.me/projects: the text types itself out one
 * glyph a tick and the real letters settle left to right LAG ticks behind. The
 * band ahead of the settled text spells the heading's reading, glyph for
 * glyph; past the end of the reading it rerolls noise each tick. Spaces stay
 * put.
 */
export const TICK_MS = 50;
export const LAG = 10;

const widthOf = (text: string, reading: string) => Math.max([...text].length, [...reading].length);

/** How many ticks `text` takes to settle completely over `reading`. */
export const scrambleTicks = (text: string, reading = "") => widthOf(text, reading) + LAG;

/** `text` as it shows `tick` ticks in: settled letters, then its reading, then noise from `glyphs`. */
export const scrambleFrame = (
  text: string,
  reading: string,
  tick: number,
  glyphs: readonly string[],
  random: () => number,
) => {
  const letters = [...text];
  const spelled = [...reading];
  const end = Math.min(tick, widthOf(text, reading));
  let frame = "";
  for (let index = 0; index < end; index += 1) {
    const letter = letters[index] ?? "";
    if (index < tick - LAG) {
      frame += letter;
    } else if (index < spelled.length) {
      frame += spelled[index];
    } else {
      frame += letter === " " ? letter : (glyphs[Math.floor(random() * glyphs.length)] ?? letter);
    }
  }
  return frame;
};
