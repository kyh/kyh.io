import type { Metadata } from "next";

import { siteConfig } from "@/lib/config";
import type { PageContent } from "@/lib/page-content";

const ogImage = {
  url: `${siteConfig.url}/og.jpg`,
  width: 1920,
  height: 1080,
};

/**
 * Next shallow-merges `metadata`, so a page that sets `openGraph` replaces the
 * layout's entirely — including the image. Build the whole object here so every
 * page keeps `og:image`, `og:type` and a canonical URL.
 */
export const buildPageMetadata = (content: PageContent): Metadata => ({
  title: content.title,
  description: content.description,
  alternates: { canonical: content.path },
  openGraph: {
    locale: "en-US",
    type: "website",
    url: content.path,
    title: `${content.title} | ${siteConfig.name}`,
    description: content.description,
    siteName: siteConfig.name,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${content.title} | ${siteConfig.name}`,
    description: content.description,
    images: [ogImage],
    creator: siteConfig.creator,
  },
});
