import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { speechRequest, toSentences } from "../hooks/narrate";

describe("toSentences", () => {
  it("reads prose and skips code and markdown noise", () => {
    const lines = toSentences(
      "## Done\n\nI fixed the **bug** in `auth.ts`. See [the PR](https://x.y/1).\n\n```ts\nconst a = 1\n```\n- one more thing!",
    );
    assert.deepEqual(lines, [
      "Done",
      "I fixed the bug in auth.ts.",
      "See the PR.",
      "(code omitted.)",
      "one more thing!",
    ]);
  });

  it("keeps non-Latin text and splits CJK sentences", () => {
    assert.deepEqual(toSentences("修好了。测试通过！\nГотово."), [
      "修好了。",
      "测试通过！",
      "Готово.",
    ]);
  });

  it("drops table rules and lines with nothing to say", () => {
    assert.deepEqual(toSentences("| a | b |\n|---|---|\n| 1 | 2 |\n\n---\n"), ["a, b", "1, 2"]);
  });
});

describe("speechRequest", () => {
  it("asks for mp3 with the narrator style on gpt models only", () => {
    const styled = JSON.parse(speechRequest("hi", "ash", "gpt-4o-mini-tts"));
    assert.equal(styled.response_format, "mp3");
    assert.equal(styled.voice, "ash");
    assert.ok(styled.instructions);
    assert.equal(JSON.parse(speechRequest("hi", "ash", "tts-1")).instructions, undefined);
  });
});
