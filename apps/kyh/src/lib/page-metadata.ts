import type { Metadata } from "next";

import { siteConfig } from "@/lib/config";
import { cardImage } from "@/lib/og-card";
import type { ThemeId } from "@/themes";
import { DEFAULT_THEME, themeOf } from "@/themes";

/** The site's card: the image every page shares unless it has a better one. */
export const ogImage = {
  alt: `${siteConfig.name}: Hello World.`,
  height: 1080,
  url: `${siteConfig.url}/og.jpg`,
  width: 1920,
};

/**
 * The site's clip, every page's `og:video`: the showcase's opening as it
 * really runs, `/showcase` recorded in headless Chromium from its first frame
 * by `pnpm og:video kyh <theme>` (scripts/og-video.mjs). The town goes up
 * storey by storey from downtown out while the camera pulls back, its trucks
 * drive off and its traffic comes out, and the site's logo comes up over the
 * finished town with "Kaiyu's corner of the internet" under it. One clip per
 * theme, picked in the dock's themes menu: `showcase.mp4` for the default (by
 * day), `showcase-<theme folder>.mp4` for each holiday's. `uploadDate` and
 * `duration` feed the `VideoObject` in `structured-data.ts`.
 */
export const siteVideoFor = (id: ThemeId) => {
  // The theme's folder name: `lunarNewYear` is `showcase-lunar-new-year`.
  const file =
    id === DEFAULT_THEME
      ? "showcase"
      : `showcase-${id.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;
  const dressed = id === DEFAULT_THEME ? "" : ` dressed for ${themeOf(id).name}`;
  return {
    description: `An isometric town of every project Kaiyu Hsu has built goes up${dressed}, storey by storey from downtown out, while the camera pulls back over it; then the kyh logo comes up over the finished town with "Kaiyu's corner of the internet" under it.`,
    duration: "PT9S",
    height: 630,
    name: `${siteConfig.siteName}: Kaiyu's corner of the internet`,
    poster: {
      alt: `The finished isometric town of Kaiyu Hsu's projects${dressed}, the kyh logo and "Kaiyu's corner of the internet" in the middle`,
      height: 630,
      url: `${siteConfig.url}/og/${file}.jpg`,
      width: 1200,
    },
    type: "video/mp4",
    uploadDate: "2026-10-25",
    url: `${siteConfig.url}/og/${file}.mp4`,
    width: 1200,
  };
};

export type SiteVideo = ReturnType<typeof siteVideoFor>;

export const ogVideoOf = (video: SiteVideo) => ({
  height: video.height,
  secureUrl: video.url,
  type: video.type,
  url: video.url,
  width: video.width,
});

export interface PageMetadataInput {
  path: string;
  title: string;
  description: string;
}

interface PageMetadataOptions {
  /** Lead with the clip's poster rather than the route's card (the showcase, whose page is the town). */
  posterFirst?: boolean;
}

/**
 * Next shallow-merges `metadata`, so a page that sets `openGraph` replaces the
 * layout's entirely — including the image and the video. Build the whole
 * object here so every page keeps `og:image`, `og:video`, `og:type` and a
 * canonical URL. The homepage's title is the site's name alone, not "Home | …".
 *
 * Every page shares the site's clip as `og:video`. Its `og:image` is the
 * route's own share card where it has one, since the card names the page and
 * most link previews show only the image; the clip's poster follows it. The
 * homepage (which has no card) and `/showcase` (whose page is the town) lead
 * with the poster.
 */
export const buildPageMetadata = (
  content: PageMetadataInput,
  video: SiteVideo,
  { posterFirst = false }: PageMetadataOptions = {},
): Metadata => {
  const isHome = content.path === "/";
  const title = isHome ? siteConfig.name : `${content.title} | ${siteConfig.name}`;
  // The route's own share card (src/lib/og-card.ts); the homepage has none.
  const own = cardImage(content.path);
  const images = own && !posterFirst ? [own, video.poster] : [video.poster, own ?? ogImage];
  return {
    alternates: { canonical: content.path },
    description: content.description,
    openGraph: {
      description: content.description,
      images,
      locale: "en-US",
      siteName: siteConfig.name,
      title,
      type: "website",
      url: content.path,
      videos: [ogVideoOf(video)],
    },
    title: isHome ? { absolute: siteConfig.name } : content.title,
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.creator,
      description: content.description,
      images: [images[0] ?? video.poster],
      title,
    },
  };
};
