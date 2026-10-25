import { cacheLife } from "next/cache";

import { showcaseVideoFor } from "@/lib/page-metadata";
import { themeOn } from "@/themes";

/**
 * The showcase clip for the theme the calendar picks today, so a link shared
 * during Halloween unfurls the Halloween town. The pages are prerendered, so
 * this is cached and revalidated hourly: the clip changes within the hour
 * after the server's midnight (UTC on Vercel), which can be up to a day off a
 * visitor's own calendar at a holiday's edges.
 */
// oxlint-disable-next-line require-await -- "use cache" only takes an async function
export const todaysShowcaseVideo = async () => {
  "use cache";
  cacheLife("hours");
  return showcaseVideoFor(themeOn(new Date()));
};
