import assert from "node:assert/strict";
import test from "node:test";

import { prosePages } from "./page-content";
import { ZHUYIN, zhuyinGlyph } from "./zhuyin";

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
