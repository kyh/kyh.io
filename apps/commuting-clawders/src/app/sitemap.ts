import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ changeFrequency: "daily", priority: 1, url: SITE_URL }];
}
