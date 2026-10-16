import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { absoluteUrl, siteRoutes } from "@/lib/config";

// Cached so the build prerenders it: `new Date()` alone makes the route dynamic.
// oxlint-disable-next-line require-await -- "use cache" only takes an async function
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  "use cache";
  cacheLife("max");
  const lastModified = new Date().toISOString();
  return siteRoutes.map((route) => ({ lastModified, url: absoluteUrl(route.path) }));
};

export default sitemap;
