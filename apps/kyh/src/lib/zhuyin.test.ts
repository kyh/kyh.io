import assert from "node:assert/strict";
import test from "node:test";

import { prosePages } from "./page-content";
import { FRAMES, GLYPHS, ZHUYIN, scrambleGlyphs, zhuyinGlyph } from "./zhuyin";

test("a heading's letters spell its zhuyin in order, skipping spaces, repeating", () => {
  const glyphs = [..."Kaiyu Hsu"].map((_, index) => zhuyinGlyph("Kaiyu Hsu", index));
  assert.deepEqual(glyphs, ["ㄒ", "ㄩ", "ˊ", "ㄎ", "ㄞ", "ㄩ", "ˇ", "ㄒ", "ㄩ"]);
});

test("a heading without a translation has no glyphs", () => {
  assert.equal(zhuyinGlyph("Untranslated", 0), undefined);
});

test("every translation is zhuyin syllables: symbols, then a tone", () => {
  for (const zhuyin of ZHUYIN.values()) {
    for (const syllable of zhuyin.split(" ")) {
      assert.match(syllable, /^˙?[ㄅ-ㄩ]{1,3}[ˊˇˋ]?$/u, syllable);
    }
  }
});

test("every prose page's headings are spelled", () => {
  for (const page of prosePages) {
    for (const heading of [page.heading, ...page.sections.map((section) => section.heading)]) {
      assert.ok(ZHUYIN.has(heading), heading);
    }
  }
});

const rolls =
  (...values: number[]) =>
  (frame: number) =>
    values[frame % values.length] ?? 0;

test("a translated letter churns through its heading's spelling and lands on its symbol", () => {
  const spelling = new Set(ZHUYIN.get("Kaiyu Hsu"));
  for (const roll of [rolls(0), rolls(0.99), rolls(0.1, 0.5, 0.9), Math.random]) {
    for (const index of [0, 3, 8]) {
      const glyphs = scrambleGlyphs("Kaiyu Hsu", index, roll);
      assert.equal(glyphs.length, FRAMES);
      assert.equal(glyphs.at(-1), zhuyinGlyph("Kaiyu Hsu", index));
      for (const glyph of glyphs) {
        assert.ok(spelling.has(glyph), glyph);
      }
    }
  }
});

test("a letter never shows the same glyph twice in a row", () => {
  for (const text of [...ZHUYIN.keys(), "Untranslated"]) {
    for (const roll of [rolls(0), rolls(0.5), rolls(0.99)]) {
      for (const [index] of [...text].entries()) {
        const glyphs = scrambleGlyphs(text, index, roll);
        for (let frame = 1; frame < glyphs.length; frame += 1) {
          assert.notEqual(glyphs[frame], glyphs[frame - 1], `${text} ${index}`);
        }
      }
    }
  }
});

test("an untranslated letter churns through all of zhuyin", () => {
  for (const glyph of scrambleGlyphs("Untranslated", 2, Math.random)) {
    assert.ok(GLYPHS.includes(glyph), glyph);
  }
});
