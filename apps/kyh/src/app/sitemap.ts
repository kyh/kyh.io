import type { MetadataRoute } from "next";

import { absoluteUrl, siteRoutes } from "@/lib/config";

const sitemap = (): MetadataRoute.Sitemap =>
  siteRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date().toISOString(),
  }));

export default sitemap;
