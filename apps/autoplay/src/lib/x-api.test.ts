import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { trendKeyword, trendQuery } from "./x-api";

describe("trendKeyword", () => {
  it("takes the subject out of a headline-style trend", () => {
    assert.equal(trendKeyword("Vercel CEO: Next Design System Is Just a Markdown File"), "Vercel");
  });

  it("keeps one word, because two AND the query down to nothing", () => {
    assert.equal(trendKeyword("Meta's Slack Choice Counters AI SaaS Doomsday Fears"), "Meta");
    assert.equal(trendKeyword("Developers Tackle AI-Generated Code Slop Challenges"), "Developers");
  });

  it("strips possessives and punctuation", () => {
    assert.equal(trendKeyword("Doug Leone's No-Novocaine Root Canal Story"), "Doug");
    assert.equal(trendKeyword("#WWDC"), "WWDC");
  });

  it("prefers a named entity over a leading lowercase word", () => {
    assert.equal(trendKeyword("the big debate over Vercel"), "Vercel");
  });

  it("still returns something when nothing is capitalised", () => {
    assert.equal(trendKeyword("the big debate"), "big");
  });
});

describe("trendQuery", () => {
  it("uses min_likes, not the web-search spelling min_faves", () => {
    const query = trendQuery("Formula 1 Season Opener", 500);
    assert.match(query, /\bmin_likes:500\b/u);
    assert.doesNotMatch(query, /min_faves|min_retweets/u);
  });

  it("excludes replies and pins a language", () => {
    const query = trendQuery("News", 100);
    assert.match(query, /-is:reply/u);
    assert.match(query, /lang:en/u);
  });

  it("emits a bare keyword, never a quoted headline", () => {
    const query = trendQuery("Vercel CEO: Next Design System Is Just a Markdown File", 500);
    assert.equal(query, "Vercel min_likes:500 -is:reply lang:en");
    assert.doesNotMatch(query, /"/u);
  });

  it("stays inside the 512-character self-serve query limit", () => {
    assert.ok(trendQuery("x".repeat(600), 500).length <= 512);
  });
});
