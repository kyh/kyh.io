import assert from "node:assert/strict";
import test from "node:test";

import { absoluteUrl, agentRoutes, siteConfig, siteRoutes } from "./config";

test("absoluteUrl collapses the root path to the bare origin", () => {
  assert.equal(absoluteUrl("/"), siteConfig.url);
  assert.equal(absoluteUrl("/about"), `${siteConfig.url}/about`);
});

test("every advertised route is site-relative and unique", () => {
  const paths = [...siteRoutes, ...agentRoutes].map((route) => route.path);

  for (const path of paths) assert.ok(path.startsWith("/"), `${path} is not site-relative`);
  assert.equal(new Set(paths).size, paths.length, "duplicate route paths");
});

test("the trust anchor pages agents look for are published", () => {
  const paths = new Set(siteRoutes.map((route) => route.path));

  for (const anchor of ["/", "/about", "/contact", "/privacy"]) {
    assert.ok(paths.has(anchor), `${anchor} is missing from siteRoutes`);
  }
});

test("every route carries a description agents can index", () => {
  for (const route of [...siteRoutes, ...agentRoutes]) {
    assert.ok(route.title.length > 0, `${route.path} has no title`);
    assert.ok(route.description.length >= 20, `${route.path} has a thin description`);
  }
});
