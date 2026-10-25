import assert from "node:assert/strict";
import test from "node:test";

import { THEMES } from "@/themes";
import { siteConfig, siteRoutes } from "./config";
import { cardImage } from "./og-card";
import { buildPageMetadata, ogImage, ogVideoOf, siteVideoFor } from "./page-metadata";

/** The showcase leads with the clip's poster, as its page is the town. */
const optionsFor = (path: string) => ({ posterFirst: path === "/showcase" });

test("every canonical route shares the theme's clip as og:video", () => {
  for (const { id } of THEMES) {
    const video = siteVideoFor(id);
    for (const route of siteRoutes) {
      const { openGraph } = buildPageMetadata(route, video, optionsFor(route.path));
      assert.deepEqual(openGraph?.videos, [ogVideoOf(video)], `${id} ${route.path}`);
    }
  }
});

test("a route with a card leads with it; the homepage and the showcase lead with the poster", () => {
  const video = siteVideoFor(THEMES[0].id);
  for (const route of siteRoutes) {
    const { openGraph, twitter } = buildPageMetadata(route, video, optionsFor(route.path));
    const card = cardImage(route.path);
    let expected = [video.poster, ogImage];
    if (card) {
      expected = route.path === "/showcase" ? [video.poster, card] : [card, video.poster];
    }
    assert.deepEqual(openGraph?.images, expected, route.path);
    assert.deepEqual(twitter?.images, [expected[0]], route.path);
  }
});

test("the clip is the showcase's opening under the site's line", () => {
  const video = siteVideoFor(THEMES[0].id);
  assert.equal(video.name, `${siteConfig.siteName}: Kaiyu's corner of the internet`);
  assert.equal(video.duration, "PT9S");
  assert.equal(video.uploadDate, "2026-10-25");
  assert.ok(video.url.startsWith(`${siteConfig.url}/og/showcase`));
});
