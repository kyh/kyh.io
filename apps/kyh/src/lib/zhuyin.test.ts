import assert from "node:assert/strict";
import test from "node:test";

import { prosePages } from "./page-content";
import { GLYPHS, ZHUYIN, scrambleChars } from "./zhuyin";

test("a translated heading scrambles through its own spelling, each symbol once", () => {
  assert.deepEqual(scrambleChars("Kaiyu Hsu"), ["ㄒ", "ㄩ", "ㄎ", "ㄞ"]);
});

test("an untranslated heading scrambles through all of zhuyin", () => {
  assert.equal(scrambleChars("Untranslated"), GLYPHS);
});

test("every translation is zhuyin syllables: symbols, then a tone", () => {
  for (const zhuyin of ZHUYIN.values()) {
    for (const syllable of zhuyin.split(" ")) {
      assert.match(syllable, /^˙?[\u3105-\u3129]{1,3}[ˊˇˋ]?$/u, syllable);
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
