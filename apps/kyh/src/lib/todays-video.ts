import type { Metadata } from "next";
import { cacheLife } from "next/cache";

import type { PageMetadataInput } from "@/lib/page-metadata";
import { buildPageMetadata, siteVideoFor } from "@/lib/page-metadata";
import { themeOn } from "@/themes";

/**
 * The site's clip for the theme the calendar picks today, every page's
 * `og:video`, so a link shared during Halloween unfurls the Halloween town.
 * The pages are prerendered, so this is cached and revalidated hourly: the
 * clip changes within the hour after the server's midnight (UTC on Vercel),
 * which can be up to a day off a visitor's own calendar at a holiday's edges.
 */
// oxlint-disable-next-line require-await -- "use cache" only takes an async function
export const todaysVideo = async () => {
  "use cache";
  cacheLife("hours");
  return siteVideoFor(themeOn(new Date()));
};

/** A page's metadata (`buildPageMetadata`) with today's clip as its `og:video`. */
export const todaysPageMetadata = async (content: PageMetadataInput): Promise<Metadata> =>
  buildPageMetadata(content, await todaysVideo());
