import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isNewsletter, parseFrom } from "./gmail";
import { bestOf, decodeEntities, itemKind, plainText, recencyScore } from "./types";

// The adapters' pure edges: what counts as a newsletter, who a message is
// from, and how foreign text becomes something a prompt can use.

describe("isNewsletter", () => {
  it("is decided by list headers, not by the sender", () => {
    assert.equal(isNewsletter([{ name: "List-Id", value: "<weekly.example.com>" }]), true);
    assert.equal(isNewsletter([{ name: "list-unsubscribe", value: "<mailto:x@y>" }]), true);
    assert.equal(isNewsletter([{ name: "From", value: "newsletter@example.com" }]), false);
  });
});

describe("parseFrom", () => {
  it("splits a display name from the address", () => {
    assert.deepEqual(parseFrom('"Ben Thompson" <ben@stratechery.com>'), {
      address: "ben@stratechery.com",
      name: "Ben Thompson",
    });
    assert.deepEqual(parseFrom("Morning Brew <crew@morningbrew.com>"), {
      address: "crew@morningbrew.com",
      name: "Morning Brew",
    });
  });

  it("falls back to the address when there is no name", () => {
    assert.deepEqual(parseFrom("<noreply@example.com>"), {
      address: "noreply@example.com",
      name: "noreply@example.com",
    });
    assert.deepEqual(parseFrom("noreply@example.com"), {
      address: "noreply@example.com",
      name: "noreply@example.com",
    });
  });
});

describe("plainText", () => {
  it("strips markup, decodes entities, and bounds length", () => {
    assert.equal(plainText("<p>Tom &amp; Jerry&#39;s <b>show</b></p>", 100), "Tom & Jerry's show");
    assert.equal(plainText("a".repeat(20), 5), "aaaaa…");
  });

  it("decodes hex references", () => {
    assert.equal(decodeEntities("&#x27;hi&#x27;"), "'hi'");
  });
});

const item = (id: string, score: number) => ({
  author: { name: "a", username: "a" },
  id,
  kind: "rss" as const,
  score,
  text: id,
});

describe("ranking helpers", () => {
  it("scores recency in minutes and tolerates missing dates", () => {
    assert.equal(recencyScore("1970-01-01T01:00:00.000Z"), 60);
    assert.equal(recencyScore(), 0);
    assert.equal(recencyScore("not a date"), 0);
  });

  it("picks the highest score and nothing from an empty list", () => {
    assert.equal(bestOf([item("a", 1), item("b", 3), item("c", 2)])?.id, "b");
    assert.equal(bestOf([]), undefined);
  });
});

describe("itemKind", () => {
  it("reads the kind off the id prefix", () => {
    assert.equal(itemKind("gmail:18c2"), "gmail");
    assert.equal(itemKind("rss:https://a.b/c"), "rss");
  });

  it("falls back to X for a prefix it does not know", () => {
    assert.equal(itemKind("mastodon:1"), "x");
  });
});
