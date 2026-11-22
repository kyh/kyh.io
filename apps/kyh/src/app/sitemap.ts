import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";

import { absoluteUrl, siteRoutes } from "@/lib/config";

// oxlint-disable-next-line require-await -- "use cache" only takes an async function
const sitemap = async () => {
  "use cache";
  cacheLife("max");
  const lastModified = new Date().toISOString();

  return siteRoutes.map((route) => ({
    lastModified,
    url: absoluteUrl(route.path),
  })) satisfies MetadataRoute.Sitemap;
};

export default sitemap;
