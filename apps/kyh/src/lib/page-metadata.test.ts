import assert from "node:assert/strict";
import test from "node:test";

import { THEMES } from "@/themes";
import { siteConfig, siteRoutes } from "./config";
import { buildPageMetadata, ogVideoOf, siteVideoFor } from "./page-metadata";

test("every canonical route shares the theme's clip as og:video", () => {
  for (const { id } of THEMES) {
    const video = siteVideoFor(id);
    for (const route of siteRoutes) {
      const { openGraph } = buildPageMetadata(route, video);
      assert.deepEqual(openGraph?.videos, [ogVideoOf(video)], `${id} ${route.path}`);
    }
  }
});

test("every canonical route shares the clip's poster as its only image", () => {
  const video = siteVideoFor(THEMES[0].id);
  for (const route of siteRoutes) {
    const { openGraph, twitter } = buildPageMetadata(route, video);
    assert.deepEqual(openGraph?.images, [video.poster], route.path);
    assert.deepEqual(twitter?.images, [video.poster], route.path);
  }
});

test("the clip is the showcase's opening under the site's line", () => {
  const video = siteVideoFor(THEMES[0].id);
  assert.equal(video.name, `${siteConfig.siteName}: Kaiyu's corner of the internet`);
  assert.equal(video.duration, "PT9S");
  assert.equal(video.uploadDate, "2026-10-25");
  assert.ok(video.url.startsWith(`${siteConfig.url}/og/showcase`));
});
