import { z } from "zod";

import {
  feedPostSchema,
  feedSourceSchema,
  fetchFeedPage,
  fetchPersonalizedTrends,
  searchTrendPosts,
} from "@/lib/x-api";
import type { FeedPage, FeedPost } from "@/lib/x-api";
import { bestOf } from "./types";
import type { AccessOf, Item, SourceContext } from "./types";

// X as a source. Programs come from what the account's corner of X is talking
// about: personalized trends seed a search filtered on engagement, and the
// home timeline is the fallback when trends are unavailable (no Premium) or
// turn up nothing new.
//
// Every read here is paid — X bills per post returned — so each is priced as
// it lands and written to the ledger the read budget is counted from, and
// everything read is cached where every instance of the server can see it: a
// page bought once serves the hour, whichever instance answers.

/**
 * What X bills at the self-serve rates: per post returned, per call for
 * trends. An overcount, if anything — X does not recharge a post it already
 * returned that UTC day, and this does not try to know which those were.
 */
const USD_PER_TIMELINE_POST = 0.005;
const USD_PER_OWN_POST = 0.001;
const USD_PER_SEARCH_POST = 0.005;
const USD_PER_TRENDS_CALL = 0.01;

/**
 * A timeline post must clear this engagement score to be worth a video. The
 * timeline is chronological, so this is the only quality filter on that path —
 * set high enough that a quiet feed goes quiet rather than airing filler.
 */
const MIN_SCORE = 250;
/** Likes a trend's posts must clear; filtered by X, not after the fact. */
const MIN_LIKES = 500;
/** Trends move slowly enough that re-reading them per program is waste. */
const TREND_CACHE_TTL_MS = 3_600_000;
/**
 * A trend's search results, likewise: ten posts is several programs' worth,
 * and at $0.05 a search re-running it per program would make X, not fal, the
 * bigger meter on a live channel.
 */
const SEARCH_CACHE_TTL_MS = 3_600_000;
const MAX_FEED_PAGES = 3;
/** While a channel has aired this little, air the best available post regardless. */
const BOOTSTRAP_AIRED_SIZE = 3;
/**
 * X bills per post returned — a 50-post page of the home timeline is ~$0.25 —
 * so this TTL, not the request rate, sets the standing cost of a watching
 * owner. An hour keeps that near the price of one page (three, if a quiet feed
 * makes the picker paginate) and sits inside X's 24h read deduplication.
 * Freshness costs little here: a program is seconds long, and a post popular
 * enough to air is rarely brand new.
 */
const FEED_CACHE_TTL_MS = 3_600_000;

const feedCacheSchema = z.object({
  source: feedSourceSchema,
  posts: z.array(feedPostSchema),
  nextToken: z.string().optional(),
  pages: z.number().int(),
});

type FeedCache = z.infer<typeof feedCacheSchema>;

const trendsSchema = z.array(z.string());
const searchSchema = z.array(feedPostSchema);
/** Which trend a source searches next; rotates so programs stay varied. */
const cursorSchema = z.object({ next: z.number().int() });

const feedKey = (sourceId: string): string => `x:feed:${sourceId}`;
const trendsKey = (sourceId: string): string => `x:trends:${sourceId}`;
const cursorKey = (sourceId: string): string => `x:cursor:${sourceId}`;
/** By the trend alone: two sources on the same trend want the same posts. */
const searchKey = (trend: string): string => `x:search:${trend}`;

export const xItemId = (postId: string): string => `x:${postId}`;

const toItem = (post: FeedPost): Item => ({
  ...post,
  id: xItemId(post.id),
  kind: "x",
  link: `https://x.com/${post.author.username}/status/${post.id}`,
});

const pageUsd = (page: FeedPage): number =>
  page.posts.length * (page.source === "home" ? USD_PER_TIMELINE_POST : USD_PER_OWN_POST);

/**
 * One search against the next trend in rotation. Trends are cached and cycled
 * rather than always taking the biggest, so consecutive programs aren't all
 * about the same thing and one search per request caps the cost at ~$0.06.
 *
 * Returns undefined whenever trends are unavailable — a non-Premium account
 * gets 401/403 here — leaving the caller to fall back to the timeline.
 */
const pickTrendCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
): Promise<Item | undefined> => {
  const { aired, cache, spend } = context;
  let trends = await cache.get(trendsKey(sourceId), trendsSchema);
  if (trends === undefined) {
    try {
      trends = await fetchPersonalizedTrends(access.accessToken);
      await spend.record("x", sourceId, USD_PER_TRENDS_CALL);
    } catch {
      trends = [];
    }
    await cache.set(trendsKey(sourceId), trends, TREND_CACHE_TTL_MS);
  }
  if (trends.length === 0) return undefined;

  const next = (await cache.get(cursorKey(sourceId), cursorSchema))?.next ?? 0;
  await cache.set(cursorKey(sourceId), { next: next + 1 }, TREND_CACHE_TTL_MS);
  const trend = trends[next % trends.length];
  if (trend === undefined) return undefined;

  try {
    let posts = await cache.get(searchKey(trend), searchSchema);
    if (posts === undefined) {
      posts = await searchTrendPosts(access.accessToken, trend, MIN_LIKES);
      await spend.record("x", sourceId, posts.length * USD_PER_SEARCH_POST);
      await cache.set(searchKey(trend), posts, SEARCH_CACHE_TTL_MS);
    }
    return bestOf(posts.map(toItem).filter((item) => !aired.has(item.id)));
  } catch {
    // A search failure (including a 400 if the engagement operators regress)
    // is not fatal — the timeline fallback still has something to air.
    return undefined;
  }
};

/**
 * The most popular un-aired post in the account's feed, paginating deeper
 * when the current batch has nothing worth a video.
 */
const pickTimelineCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
): Promise<Item | undefined> => {
  const { aired, cache, spend } = context;
  let feed = await cache.get(feedKey(sourceId), feedCacheSchema);
  if (feed === undefined) {
    const page = await fetchFeedPage(access.accessToken, access.xUserId);
    await spend.record("x", sourceId, pageUsd(page));
    feed = { source: page.source, posts: page.posts, nextToken: page.nextToken, pages: 1 };
    await cache.set(feedKey(sourceId), feed, FEED_CACHE_TTL_MS);
  }

  for (;;) {
    const unaired = feed.posts.map(toItem).filter((item) => !aired.has(item.id));
    const popular = unaired.filter((item) => item.score >= MIN_SCORE);
    if (popular.length > 0) return bestOf(popular);

    if (feed.nextToken !== undefined && feed.pages < MAX_FEED_PAGES) {
      const page = await fetchFeedPage(
        access.accessToken,
        access.xUserId,
        feed.source,
        feed.nextToken,
      );
      await spend.record("x", sourceId, pageUsd(page));
      const deeper: FeedCache = {
        source: feed.source,
        posts: [...feed.posts, ...page.posts],
        nextToken: page.nextToken,
        pages: feed.pages + 1,
      };
      feed = deeper;
      await cache.set(feedKey(sourceId), feed, FEED_CACHE_TTL_MS);
      continue;
    }

    // Nothing clears the bar. A brand-new channel still needs something on
    // air, so bootstrap from the best available; an established one waits.
    return aired.size < BOOTSTRAP_AIRED_SIZE ? bestOf(unaired) : undefined;
  }
};

export const pickXCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
): Promise<Item | undefined> => {
  const trending = await pickTrendCandidate(access, sourceId, context);
  if (trending !== undefined) return trending;
  return pickTimelineCandidate(access, sourceId, context);
};
