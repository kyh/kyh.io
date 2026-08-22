import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, agentRoutes, siteConfig, siteRoutes } from "./config";
import { buildHomeMarkdown, buildNotFoundMarkdown, renderPageMarkdown } from "./markdown";
import { prosePages } from "./page-content";

test("the homepage markdown leads with a single h1 and covers every section", () => {
  const markdown = buildHomeMarkdown();

  assert.match(markdown, /^# Kaiyu Hsu\n/);
  assert.equal(markdown.match(/^# /gm)?.length, 1);
  for (const heading of ["Highlights", "Work", "Projects", "Connect", "Pages", "For agents"]) {
    assert.match(markdown, new RegExp(`^## ${heading}$`, "m"));
  }
});

test("the homepage markdown links every page and machine-readable endpoint", () => {
  const markdown = buildHomeMarkdown();

  for (const route of [...siteRoutes, ...agentRoutes]) {
    assert.ok(markdown.includes(absoluteUrl(route.path)), `${route.path} is not linked`);
  }
});

test("the 404 body names the path and points somewhere useful", () => {
  const markdown = buildNotFoundMarkdown("/does-not-exist");

  assert.match(markdown, /^# 404 — Not found\n/);
  assert.ok(markdown.includes("`/does-not-exist`"));
  assert.ok(markdown.includes(absoluteUrl("/llms.txt")));
  assert.ok(markdown.includes(absoluteUrl("/sitemap.xml")));
  assert.ok(markdown.includes(absoluteUrl("/")));
  // Short enough that a lost agent can read it and move on.
  assert.ok(markdown.length < 2_000, `404 body is ${markdown.length} chars`);
});

test("prose pages render to markdown with a real heading outline", () => {
  for (const page of prosePages) {
    const markdown = renderPageMarkdown(page);

    assert.equal(markdown.match(/^# /gm)?.length, 1, `${page.path} has the wrong number of h1s`);
    assert.ok((markdown.match(/^## /gm)?.length ?? 0) >= 2, `${page.path} needs more h2s`);
    assert.ok(markdown.includes(`Canonical URL: ${absoluteUrl(page.path)}`));
  }
});

test("markdown link targets are absolute so the document stands alone", () => {
  const markdown = prosePages.map(renderPageMarkdown).join("\n");
  const targets = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map(([, href]) => href);

  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.ok(
      target?.startsWith("https://") || target?.startsWith("mailto:"),
      `${target} is not absolute`,
    );
  }
});

test("no markdown view leaks a localhost URL", () => {
  const documents = [
    buildHomeMarkdown(),
    buildNotFoundMarkdown("/x"),
    ...prosePages.map(renderPageMarkdown),
  ];

  assert.equal(siteConfig.url, "https://www.kyh.io");
  for (const document of documents) assert.ok(!document.includes("localhost"));
});
