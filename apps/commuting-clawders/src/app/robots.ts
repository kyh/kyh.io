import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // /runs is the plugin's write endpoint, not a page.
  return {
    rules: [{ allow: "/", disallow: "/runs", userAgent: "*" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
