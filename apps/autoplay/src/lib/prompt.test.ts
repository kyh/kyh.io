import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildVideoPrompt } from "./prompt";

describe("buildVideoPrompt", () => {
  it("strips links and handles, which render as garbled text on screen", () => {
    const prompt = buildVideoPrompt("look at this https://t.co/abc123 cc @someone", "Kai");
    assert.doesNotMatch(prompt, /https?:\/\//);
    assert.doesNotMatch(prompt, /@someone/);
    assert.match(prompt, /look at this/);
  });

  it("keeps a hashtag's word, since it is usually the subject", () => {
    const prompt = buildVideoPrompt("full send at #WWDC today", "Kai");
    assert.match(prompt, /WWDC/);
    assert.doesNotMatch(prompt, /#WWDC/);
  });

  it("asks for one continuous shot and no on-screen text", () => {
    const prompt = buildVideoPrompt("a dog on a skateboard", "Kai");
    assert.match(prompt, /single continuous cinematic shot/);
    assert.match(prompt, /No on-screen text/);
  });

  it("falls back to an interlude when nothing survives stripping", () => {
    const prompt = buildVideoPrompt("https://t.co/abc @someone @another", "Kai");
    assert.match(prompt, /interlude inspired by Kai/);
  });

  it("truncates a long post rather than blurring the subject", () => {
    const prompt = buildVideoPrompt(`${"word ".repeat(200)}tail`, "Kai");
    assert.ok(prompt.length < 800);
    assert.doesNotMatch(prompt, /tail/);
  });
});
