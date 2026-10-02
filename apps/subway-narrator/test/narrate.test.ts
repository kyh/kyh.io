import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { SPEECH_SCRIPT, readMs, speechRequest, toSentences } from "../hooks/narrate";

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

  it("keeps the punctuation after a URL so sentences still split", () => {
    assert.deepEqual(toSentences("See https://example.com/a. Next one (https://x.y/1)."), [
      "See a link.",
      "Next one (a link).",
    ]);
  });

  it("omits an unclosed code fence and keeps literal hashes", () => {
    assert.deepEqual(toSentences("I used C# and #include.\n```ts\nconst a = 1"), [
      "I used C# and #include.",
      "(code omitted.)",
    ]);
  });

  it("does not split after abbreviations or inside decimals", () => {
    assert.deepEqual(toSentences("This is e.g. a test. Pi is 3.14. Done."), [
      "This is e.g. a test.",
      "Pi is 3.14.",
      "Done.",
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

describe("readMs", () => {
  it("holds a caption with no spaces for its characters", () => {
    assert.ok(readMs("这是一个没有空格但是很长的句子需要更多时间阅读。") > readMs("short one"));
  });
});

describe("SPEECH_SCRIPT", () => {
  it("prints nothing and exits non-zero when the download fails", () => {
    const run = spawnSync(
      "sh",
      ["-c", SPEECH_SCRIPT.replace("https://api.openai.com", "http://127.0.0.1:9")],
      {
        encoding: "utf-8",
        input: "{}",
      },
    );
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
  });
});
