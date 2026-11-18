import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function sitemap() {
  return [
    {
      changeFrequency: "monthly",
      priority: 1,
      url: siteConfig.url,
    },
  ] satisfies MetadataRoute.Sitemap;
}
