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
import type { AccessOf, SourceContext, Item } from "./types";

const USD_PER_TIMELINE_POST = 0.005;
const USD_PER_OWN_POST = 0.001;
const USD_PER_SEARCH_POST = 0.005;
const USD_PER_TRENDS_CALL = 0.01;

const MIN_SCORE = 250;
const MIN_LIKES = 500;
const TREND_CACHE_TTL_MS = 3_600_000;
const SEARCH_CACHE_TTL_MS = 3_600_000;
const MAX_FEED_PAGES = 3;
const BOOTSTRAP_AIRED_SIZE = 3;
const FEED_CACHE_TTL_MS = 3_600_000;

const feedCacheSchema = z.object({
  nextToken: z.string().optional(),
  pages: z.number().int(),
  posts: z.array(feedPostSchema),
  source: feedSourceSchema,
});

type FeedCache = z.infer<typeof feedCacheSchema>;

const trendsSchema = z.array(z.string());
const searchSchema = z.array(feedPostSchema);
const cursorSchema = z.object({ next: z.number().int() });

const feedKey = (sourceId: string) => `x:feed:${sourceId}`;
const trendsKey = (sourceId: string) => `x:trends:${sourceId}`;
const cursorKey = (sourceId: string) => `x:cursor:${sourceId}`;
const searchKey = (trend: string) => `x:search:${trend}`;

export const xItemId = (postId: string) => `x:${postId}`;

const toItem = (post: FeedPost) =>
  ({
    ...post,
    id: xItemId(post.id),
    kind: "x",
    link: `https://x.com/${post.author.username}/status/${post.id}`,
  }) satisfies Item;

const pageUsd = (page: FeedPage) =>
  page.posts.length * (page.source === "home" ? USD_PER_TIMELINE_POST : USD_PER_OWN_POST);

const searchFresh = async (
  { cache, spend }: SourceContext,
  accessToken: string,
  sourceId: string,
  trend: string,
) => {
  const posts = await searchTrendPosts(accessToken, trend, MIN_LIKES);
  await spend.record("x", sourceId, posts.length * USD_PER_SEARCH_POST);
  await cache.set(searchKey(trend), searchSchema, posts, SEARCH_CACHE_TTL_MS);

  return posts;
};

const pickTrendCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
) => {
  const { aired, cache, spend } = context;
  let trends = await cache.get(trendsKey(sourceId), trendsSchema);

  if (trends === null) {
    try {
      trends = await fetchPersonalizedTrends(access.accessToken);
      await spend.record("x", sourceId, USD_PER_TRENDS_CALL);
    } catch {
      trends = [];
    }

    await cache.set(trendsKey(sourceId), trendsSchema, trends, TREND_CACHE_TTL_MS);
  }

  if (trends.length === 0) {
    return null;
  }

  const cursor = await cache.get(cursorKey(sourceId), cursorSchema);
  const next = cursor?.next ?? 0;
  await cache.set(cursorKey(sourceId), cursorSchema, { next: next + 1 }, TREND_CACHE_TTL_MS);
  const trend = trends[next % trends.length];

  if (trend === undefined) {
    return null;
  }

  let posts: z.infer<typeof searchSchema>;

  try {
    posts =
      (await cache.get(searchKey(trend), searchSchema)) ??
      (await searchFresh(context, access.accessToken, sourceId, trend));
  } catch {
    return null;
  }

  return bestOf(posts.map(toItem).filter((item) => !aired.has(item.id))) ?? null;
};

const readDeeper: (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
  feed: FeedCache,
) => Promise<Item | undefined> = async (access, sourceId, context, feed) => {
  const { aired, cache, spend } = context;
  const unaired = feed.posts.map(toItem).filter((item) => !aired.has(item.id));
  const popular = unaired.filter((item) => item.score >= MIN_SCORE);

  if (popular.length > 0) {
    return bestOf(popular);
  }

  if (feed.nextToken === undefined || feed.pages >= MAX_FEED_PAGES) {
    return aired.size < BOOTSTRAP_AIRED_SIZE ? bestOf(unaired) : undefined;
  }

  const page = await fetchFeedPage(access.accessToken, access.xUserId, feed.source, feed.nextToken);

  await spend.record("x", sourceId, pageUsd(page));

  const deeper: FeedCache = {
    nextToken: page.nextToken,
    pages: feed.pages + 1,
    posts: [...feed.posts, ...page.posts],
    source: feed.source,
  };

  await cache.set(feedKey(sourceId), feedCacheSchema, deeper, FEED_CACHE_TTL_MS);

  return await readDeeper(access, sourceId, context, deeper);
};

const pickTimelineCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
) => {
  const { cache, spend } = context;
  const cached = await cache.get(feedKey(sourceId), feedCacheSchema);

  if (cached !== null) {
    return await readDeeper(access, sourceId, context, cached);
  }

  const page = await fetchFeedPage(access.accessToken, access.xUserId);
  await spend.record("x", sourceId, pageUsd(page));
  const feed = { nextToken: page.nextToken, pages: 1, posts: page.posts, source: page.source };
  await cache.set(feedKey(sourceId), feedCacheSchema, feed, FEED_CACHE_TTL_MS);

  return await readDeeper(access, sourceId, context, feed);
};

export const pickXCandidate = async (
  access: AccessOf<"x">,
  sourceId: string,
  context: SourceContext,
) => {
  const trending = await pickTrendCandidate(access, sourceId, context);

  if (trending !== null) {
    return trending;
  }

  return await pickTimelineCandidate(access, sourceId, context);
};
