import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, agentRoutes, siteRoutes } from "./config";
import { buildNotFoundHtml } from "./not-found-html";

test("is a complete, self-contained document", () => {
  const html = buildNotFoundHtml("/missing");

  assert.match(html, /^<!doctype html>/);
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes("<title>404 — Not found | Kaiyu Hsu</title>"));
  assert.ok(html.includes(`<link rel="canonical" href="${absoluteUrl("/")}">`));
  assert.ok(html.includes('<meta name="robots" content="noindex, follow">'));
  // No external requests: the page has to render for someone with a dead link.
  assert.ok(!html.includes("<script"));
});

test("links every page and machine-readable endpoint", () => {
  const html = buildNotFoundHtml("/missing");

  for (const route of [...siteRoutes, ...agentRoutes]) {
    assert.ok(html.includes(`href="${route.path}"`), `${route.path} is not linked`);
  }
});

test("escapes the requested path instead of reflecting it", () => {
  const html = buildNotFoundHtml('/<img src=x onerror="alert(1)">');

  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

test("renders code spans in descriptions instead of raw backticks", () => {
  const html = buildNotFoundHtml("/missing");

  assert.ok(html.includes("<code>npx kyh</code>"));
  assert.ok(!html.includes("`npx kyh`"));
});

test("stays small enough to be cheap for an agent that took a wrong turn", () => {
  assert.ok(buildNotFoundHtml("/missing").length < 6_000);
});
