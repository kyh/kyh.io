import type { MetadataRoute } from "next";

import { absoluteUrl, siteRoutes } from "@/lib/config";

const sitemap = (): MetadataRoute.Sitemap =>
  siteRoutes.map((route) => ({
    lastModified: new Date().toISOString(),
    url: absoluteUrl(route.path),
  }));

export default sitemap;
