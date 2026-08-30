import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Everything behind the login is personal; nothing here is worth indexing.
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
