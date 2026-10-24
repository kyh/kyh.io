import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  // The TV page is public, and link previews (X's card crawler honours
  // robots.txt) need to read its card. Everything behind the login lives
  // under /api, which is personal and never worth indexing.
  return {
    rules: [{ allow: "/", disallow: "/api/", userAgent: "*" }],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
