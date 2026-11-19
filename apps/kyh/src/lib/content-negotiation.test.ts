import assert from "node:assert/strict";
import test from "node:test";

import { acceptsHtml, acceptsMarkdown, prefersHtml } from "./content-negotiation";

test("recognises an explicit markdown request", () => {
  assert.equal(acceptsMarkdown("text/markdown"), true);
  assert.equal(acceptsMarkdown("text/markdown, text/plain;q=0.9"), true);
  assert.equal(acceptsMarkdown("TEXT/MARKDOWN"), true);
  assert.equal(acceptsMarkdown("text/html,*/*"), false);
  assert.equal(acceptsMarkdown(null), false);
});

test("recognises a browser asking for a document", () => {
  assert.equal(
    acceptsHtml("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
    true,
  );
  assert.equal(acceptsHtml("application/xhtml+xml"), true);
  assert.equal(acceptsHtml("*/*"), false);
  assert.equal(acceptsHtml(null), false);
});

test("HTML is served only when it was asked for by name", () => {
  assert.equal(prefersHtml("text/html,application/xhtml+xml,*/*;q=0.8"), true);
  assert.equal(prefersHtml("*/*"), false);
  assert.equal(prefersHtml(""), false);
  assert.equal(prefersHtml(null), false);
  assert.equal(prefersHtml("text/markdown"), false);
  assert.equal(prefersHtml("text/html,text/markdown"), false);
});
