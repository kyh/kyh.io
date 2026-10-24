import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

// The one public page: the TV itself. Everything else is the API behind it.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ changeFrequency: "monthly", priority: 1, url: siteConfig.url }];
}
