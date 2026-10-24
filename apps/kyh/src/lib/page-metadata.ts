import type { Metadata } from "next";

import { siteConfig } from "@/lib/config";
import { cardImage } from "@/lib/og-card";

/** The site's card: the image every page shares unless it has a better one. */
export const ogImage = {
  alt: `${siteConfig.name}: Hello World.`,
  height: 1080,
  url: `${siteConfig.url}/og.jpg`,
  width: 1920,
};

/**
 * The showcase town as a short scene: a drawing of it, not the live page
 * (`scripts/og-video/kyh.html`, recorded by `pnpm og:video kyh`). Lots pop in,
 * buildings rise a storey at a time, project pins drop onto the roofs, one
 * lights up with its card, then the name. `uploadDate` and `duration` feed the
 * `VideoObject` in `structured-data.ts`.
 */
export const showcaseVideo = {
  description:
    "Every project Kaiyu Hsu has built, as an isometric town: it goes up building by building, project pins drop onto the roofs, and one lights up with its card.",
  duration: "PT9S",
  height: 630,
  name: "The kyh.io showcase town",
  poster: {
    alt: "An isometric town of Kaiyu Hsu's projects, one building lit up with its project card",
    height: 630,
    url: `${siteConfig.url}/og/showcase.jpg`,
    width: 1200,
  },
  type: "video/mp4",
  uploadDate: "2026-10-24",
  url: `${siteConfig.url}/og/showcase.mp4`,
  width: 1200,
};

const ogVideo = {
  height: showcaseVideo.height,
  secureUrl: showcaseVideo.url,
  type: showcaseVideo.type,
  url: showcaseVideo.url,
  width: showcaseVideo.width,
};

export interface PageMetadataInput {
  path: string;
  title: string;
  description: string;
}

interface PageMetadataOptions {
  /** Attach the showcase clip as `og:video`, with its poster as a second image. */
  video?: boolean;
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
  { video = false, posterFirst = false }: PageMetadataOptions = {},
): Metadata => {
  const isHome = content.path === "/";
  const title = isHome ? siteConfig.name : `${content.title} | ${siteConfig.name}`;
  // The route's own share card (src/lib/og-card.ts), else the site's og.jpg.
  const own = cardImage(content.path) ?? ogImage;
  let images = [own];
  if (video) {
    images = posterFirst ? [showcaseVideo.poster, own] : [own, showcaseVideo.poster];
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
      videos: video ? [ogVideo] : undefined,
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
