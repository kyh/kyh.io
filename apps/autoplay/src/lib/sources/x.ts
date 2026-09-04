import { fetchFeedPage, fetchPersonalizedTrends, searchTrendPosts } from "@/lib/x-api";
import type { FeedPost, Trend } from "@/lib/x-api";
import { bestOf } from "./types";
import type { AccessOf, Item } from "./types";

// X as a source. Programs come from what the account's corner of X is talking
// about: personalized trends seed a search filtered on engagement, and the
// home timeline is the fallback when trends are unavailable (no Premium) or
// turn up nothing new.

/**
 * A timeline post must clear this engagement score to be worth a video. The
 * timeline is chronological, so this is the only quality filter on that path —
 * set high enough that a quiet feed reruns rather than airing filler.
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
/** While the archive is this small, air the best available post regardless. */
const BOOTSTRAP_ARCHIVE_SIZE = 3;
/**
 * X bills per post returned — a 50-post page of the home timeline is ~$0.25 —
 * so this TTL, not the request rate, sets the standing cost of a watching
 * owner. An hour keeps that near the price of one page (three, if a quiet feed
 * makes the picker paginate) and sits inside X's 24h read deduplication.
 * Freshness costs little here: clips are seconds long, the archive reruns
 * regardless, and a post popular enough to air is rarely brand new.
 */
const FEED_CACHE_TTL_MS = 3_600_000;

type FeedCache = {
  source: "home" | "own";
  posts: FeedPost[];
  nextToken?: string;
  pages: number;
};

// Caches are rate-limit shields for X reads, not durable state — per server
// instance, keyed by source.
const feedCaches = new Map<string, { cache: FeedCache; expiresAt: number }>();
const trendCaches = new Map<string, { trends: Trend[]; expiresAt: number }>();
/** Search results per trend name. */
const searchCaches = new Map<string, { posts: FeedPost[]; expiresAt: number }>();
/** Which trend a source searches next; rotates so programs stay varied. */
const trendCursors = new Map<string, number>();

export const xItemId = (postId: string): string => `x:${postId}`;

const toItem = (post: FeedPost): Item => ({ ...post, id: xItemId(post.id), kind: "x" });

const readFeedCache = (sourceId: string): FeedCache | undefined => {
  const entry = feedCaches.get(sourceId);
  return entry !== undefined && entry.expiresAt > Date.now() ? entry.cache : undefined;
};

const writeFeedCache = (sourceId: string, cache: FeedCache): void => {
  feedCaches.set(sourceId, { cache, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
};

const readTrendCache = (sourceId: string): Trend[] | undefined => {
  const entry = trendCaches.get(sourceId);
  return entry !== undefined && entry.expiresAt > Date.now() ? entry.trends : undefined;
};

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
  aired: Set<string>,
): Promise<Item | undefined> => {
  let trends = readTrendCache(sourceId);
  if (trends === undefined) {
    try {
      trends = await fetchPersonalizedTrends(access.accessToken);
    } catch {
      trends = [];
    }
    trendCaches.set(sourceId, { trends, expiresAt: Date.now() + TREND_CACHE_TTL_MS });
  }
  if (trends.length === 0) return undefined;

  const offset = trendCursors.get(sourceId) ?? 0;
  trendCursors.set(sourceId, offset + 1);
  const trend = trends[offset % trends.length];
  if (trend === undefined) return undefined;

  try {
    const cached = searchCaches.get(trend.name);
    let posts: FeedPost[];
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      posts = cached.posts;
    } else {
      posts = await searchTrendPosts(access.accessToken, trend.name, MIN_LIKES);
      searchCaches.set(trend.name, { posts, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
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
  aired: Set<string>,
): Promise<Item | undefined> => {
  let cache = readFeedCache(sourceId);
  if (cache === undefined) {
    const page = await fetchFeedPage(access.accessToken, access.xUserId);
    cache = { source: page.source, posts: page.posts, pages: 1 };
    if (page.nextToken !== undefined) cache.nextToken = page.nextToken;
    writeFeedCache(sourceId, cache);
  }

  for (;;) {
    const unaired = cache.posts.map(toItem).filter((item) => !aired.has(item.id));
    const popular = unaired.filter((item) => item.score >= MIN_SCORE);
    if (popular.length > 0) return bestOf(popular);

    if (cache.nextToken !== undefined && cache.pages < MAX_FEED_PAGES) {
      const page = await fetchFeedPage(
        access.accessToken,
        access.xUserId,
        cache.source,
        cache.nextToken,
      );
      const next: FeedCache = {
        source: cache.source,
        posts: [...cache.posts, ...page.posts],
        pages: cache.pages + 1,
      };
      if (page.nextToken !== undefined) next.nextToken = page.nextToken;
      cache = next;
      writeFeedCache(sourceId, cache);
      continue;
    }

    // Nothing clears the bar. A brand-new channel still needs something on
    // air, so bootstrap from the best available; an established one reruns.
    return aired.size < BOOTSTRAP_ARCHIVE_SIZE ? bestOf(unaired) : undefined;
  }
};

export const pickXCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  aired: Set<string>,
): Promise<Item | undefined> => {
  const trending = await pickTrendCandidate(access, sourceId, aired);
  if (trending !== undefined) return trending;
  return pickTimelineCandidate(access, sourceId, aired);
};
