import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "monthly",
      priority: 1,
      url: siteConfig.url,
    },
  ];
}
