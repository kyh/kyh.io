const segmenter = new Intl.Segmenter();

/** `text` split into what a reader sees as single characters, emoji and accents kept whole. */
export const graphemesOf = (text: string) =>
  Array.from(segmenter.segment(text), ({ segment }) => segment);
