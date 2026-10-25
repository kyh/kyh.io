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
 * The showcase town as it really runs: `/showcase` recorded in headless
 * Chromium by `pnpm og:video kyh <theme>` (scripts/og-video.mjs), the camera
 * drifting once round downtown while the town's traffic goes about, with the
 * site's logo and the showcase's line over the middle. One clip per theme,
 * picked in the dock's themes menu: `showcase.mp4` for the default (by day),
 * `showcase-<theme folder>.mp4` for each holiday's. `uploadDate` and `duration` feed
 * the `VideoObject` in `structured-data.ts`.
 */
export const showcaseVideoFor = (id: ThemeId) => {
  // The theme's folder name: `lunarNewYear` is `showcase-lunar-new-year`.
  const file =
    id === DEFAULT_THEME
      ? "showcase"
      : `showcase-${id.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;
  const dressed = id === DEFAULT_THEME ? "" : ` dressed for ${themeOf(id).name}`;
  return {
    description: `Every project Kaiyu Hsu has built, as an isometric town${dressed}: the camera drifts over downtown while cars and people go about, under the kyh logo.`,
    duration: "PT8S",
    height: 630,
    name: `The kyh.io showcase town${dressed}`,
    poster: {
      alt: `An isometric town of Kaiyu Hsu's projects${dressed}, the kyh logo in the middle`,
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

export type ShowcaseVideo = ReturnType<typeof showcaseVideoFor>;

const ogVideoOf = (video: ShowcaseVideo) => ({
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
  /** Attach a showcase clip as `og:video`, with its poster as a second image. */
  video?: ShowcaseVideo;
  /** Lead with the poster rather than the site card (the showcase itself). */
  posterFirst?: boolean;
}

/**
 * Next shallow-merges `metadata`, so a page that sets `openGraph` replaces the
 * layout's entirely — including the image. Build the whole object here so every
 * page keeps `og:image`, `og:type` and a canonical URL. The homepage's title is
 * the site's name alone, not "Home | …". Every other route leads with its own
 * share card.
 */
export const buildPageMetadata = (
  content: PageMetadataInput,
  { video, posterFirst = false }: PageMetadataOptions = {},
): Metadata => {
  const isHome = content.path === "/";
  const title = isHome ? siteConfig.name : `${content.title} | ${siteConfig.name}`;
  // The route's own share card (src/lib/og-card.ts), else the site's og.jpg.
  const own = cardImage(content.path) ?? ogImage;
  let images = [own];
  if (video) {
    images = posterFirst ? [video.poster, own] : [own, video.poster];
  }
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
      videos: video ? [ogVideoOf(video)] : undefined,
    },
    title: isHome ? { absolute: siteConfig.name } : content.title,
    twitter: {
      card: "summary_large_image",
      creator: siteConfig.creator,
      description: content.description,
      images: [images[0] ?? ogImage],
      title,
    },
  };
};
