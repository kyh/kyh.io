import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { trendQuery } from "./x-api";

// The search query is the one place a typo costs money rather than failing
// loudly: X answers 400 for an unknown operator, the caller swallows it, and
// the channel quietly falls back to the timeline forever. These pin the
// spellings X actually accepts.

describe("trendQuery", () => {
  it("uses min_likes, not the web-search spelling min_faves", () => {
    const query = trendQuery("Formula 1", 500);
    assert.match(query, /\bmin_likes:500\b/);
    assert.doesNotMatch(query, /min_faves|min_retweets/);
  });

  it("phrase-quotes multi-word trends so the words aren't matched separately", () => {
    assert.match(trendQuery("Taylor Swift", 500), /^"Taylor Swift" /);
  });

  it("leaves single-token trends unquoted", () => {
    assert.match(trendQuery("#WWDC", 500), /^#WWDC /);
  });

  it("drops embedded quotes that would terminate the phrase early", () => {
    const query = trendQuery('the "big" game', 500);
    assert.equal(query.startsWith('"the big game"'), true);
    assert.equal((query.match(/"/g) ?? []).length, 2);
  });

  it("excludes replies and pins a language", () => {
    const query = trendQuery("news", 100);
    assert.match(query, /-is:reply/);
    assert.match(query, /lang:en/);
  });

  it("stays inside the 512-character self-serve query limit", () => {
    assert.ok(trendQuery("x".repeat(300), 500).length <= 512);
  });
});
