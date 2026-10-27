import assert from "node:assert/strict";
import test from "node:test";

import { siteConfig, siteRoutes } from "./config";
import { cardImage, cardRouteFor, cardRoutes, cardSlug, cardUrl } from "./og-card";

test("every canonical route but the homepage has a card", () => {
  assert.equal(cardRoutes.length, siteRoutes.length - 1);
  assert.equal(cardImage("/"), null);
  for (const route of cardRoutes) {
    assert.equal(cardRouteFor(cardSlug(route.path)), route);
  }
});

test("card URLs are absolute, stable and 1200x630 with alt text", () => {
  assert.equal(cardUrl("/about"), `${siteConfig.url}/cards/about`);
  const image = cardImage("/about");
  assert.equal(image?.width, 1200);
  assert.equal(image?.height, 630);
  assert.ok((image?.alt.length ?? 0) > 10);
});

test("an unknown slug has no card", () => {
  assert.equal(cardRouteFor("nope"), null);
  assert.equal(cardRouteFor(""), null);
});
