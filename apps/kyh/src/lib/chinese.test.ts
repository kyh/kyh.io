import assert from "node:assert/strict";
import test from "node:test";

import { CHINESE, chineseGlyph } from "./chinese";

test("a heading's letters spell its Chinese in order, repeating", () => {
  const glyphs = [..."Work Life"].map((_, index) => chineseGlyph("Work Life", index));
  assert.deepEqual(glyphs, ["工", "作", "生", "活", "工", "作", "生", "活", "工"]);
});

test("a heading without a translation has no glyphs", () => {
  assert.equal(chineseGlyph("Kaiyu Hsu", 0), undefined);
});

test("every translation is plain Chinese characters", () => {
  for (const chinese of CHINESE.values()) {
    assert.match(chinese, /^\p{Script=Han}+$/u);
  }
});
