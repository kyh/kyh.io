import type { Metadata } from "next";

import { siteConfig } from "@/lib/config";
import type { PageContent } from "@/lib/page-content";

const ogImage = {
  height: 1080,
  url: `${siteConfig.url}/og.jpg`,
  width: 1920,
};

/**
 * Next shallow-merges `metadata`, so a page that sets `openGraph` replaces the
 * layout's entirely — including the image. Build the whole object here so every
 * page keeps `og:image`, `og:type` and a canonical URL.
 */
export const buildPageMetadata = (content: PageContent): Metadata => ({
  alternates: { canonical: content.path },
  description: content.description,
  openGraph: {
    description: content.description,
    images: [ogImage],
    locale: "en-US",
    siteName: siteConfig.name,
    title: `${content.title} | ${siteConfig.name}`,
    type: "website",
    url: content.path,
  },
  title: content.title,
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.creator,
    description: content.description,
    images: [ogImage],
    title: `${content.title} | ${siteConfig.name}`,
  },
});
