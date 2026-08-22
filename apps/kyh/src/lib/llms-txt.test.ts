import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, agentRoutes, siteRoutes } from "./config";
import { buildLlmsTxt } from "./llms-txt";
import { projects } from "./data";

test("follows the llms.txt shape: one h1, then a blockquote summary", () => {
  const lines = buildLlmsTxt().split("\n");

  assert.match(lines[0] ?? "", /^# kyh\.io — Kaiyu Hsu$/);
  assert.equal(lines[1], "");
  assert.match(lines[2] ?? "", /^> /);
  assert.equal(buildLlmsTxt().match(/^# /gm)?.length, 1);
});

test("tells an agent when to use the site, and when not to", () => {
  const llms = buildLlmsTxt();

  assert.match(llms, /^## When to use this$/m);
  // Named, specific jobs rather than marketing copy.
  assert.ok(llms.includes("Who Kaiyu Hsu is"));
  assert.ok(llms.includes("How to reach him"));
  // An explicit negative boundary, and how to call it.
  assert.ok(llms.includes("Do not use this site as a source for anything else."));
  assert.ok(llms.includes("How to call it:"));
});

test("indexes every page, endpoint and project", () => {
  const llms = buildLlmsTxt();

  for (const route of [...siteRoutes, ...agentRoutes]) {
    assert.ok(llms.includes(absoluteUrl(route.path)), `${route.path} is not indexed`);
  }
  for (const project of projects) {
    assert.ok(llms.includes(project.url), `${project.title} is not indexed`);
  }
});

test("names the developer resources an agent would search for", () => {
  const llms = buildLlmsTxt();

  assert.ok(llms.includes("https://www.npmjs.com/package/kyh"));
  assert.ok(llms.includes("https://www.npmjs.com/package/@kyh/skills"));
  assert.ok(llms.includes("https://github.com/kyh/kyh.io"));
});
