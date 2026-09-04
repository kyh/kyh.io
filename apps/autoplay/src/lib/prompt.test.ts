import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FORMATS, buildOpeningPrompt, buildSegmentPrompt, formatById, pickFormat } from "./prompt";

describe("buildSegmentPrompt", () => {
  it("strips links and handles, which render as garbled text on screen", () => {
    const prompt = buildSegmentPrompt("look at this https://t.co/abc123 cc @someone", "Kai");
    assert.doesNotMatch(prompt, /https?:\/\//);
    assert.doesNotMatch(prompt, /@someone/);
    assert.match(prompt, /look at this/);
  });

  it("keeps a hashtag's word, since it is usually the subject", () => {
    const prompt = buildSegmentPrompt("full send at #WWDC today", "Kai");
    assert.match(prompt, /WWDC/);
    assert.doesNotMatch(prompt, /#WWDC/);
  });

  it("carries the scene on to the subject rather than cutting to it", () => {
    const prompt = buildSegmentPrompt("a dog on a skateboard", "Kai");
    assert.match(prompt, /^Continue without a cut/);
    assert.match(prompt, /never begin a new video/i);
    assert.match(prompt, /a dog on a skateboard/);
    assert.match(prompt, /No on-screen text/);
  });

  it("falls back to an interlude when nothing survives stripping", () => {
    const prompt = buildSegmentPrompt("https://t.co/abc @someone @another", "Kai");
    assert.match(prompt, /same place .* inspired by Kai/);
  });

  it("truncates a long post rather than blurring the subject", () => {
    const prompt = buildSegmentPrompt(`${"word ".repeat(200)}tail`, "Kai");
    assert.ok(prompt.length < 800);
    assert.doesNotMatch(prompt, /tail/);
  });
});

describe("formats", () => {
  it("opens on the world and then the first segment", () => {
    const format = formatById("satire-news");
    assert.ok(format !== undefined);
    if (format === undefined) return;
    const prompt = buildOpeningPrompt(format, buildSegmentPrompt("rain tomorrow", "Kai"));
    assert.match(prompt, /^A continuous satirical news network/);
    assert.match(prompt, /one unbroken stream/);
    assert.match(prompt, /Continue without a cut.*rain tomorrow/);
  });

  it("only ever picks one of the known formats", () => {
    for (let i = 0; i < 50; i += 1) assert.ok(FORMATS.includes(pickFormat()));
  });
});
