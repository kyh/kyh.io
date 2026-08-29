import { z } from "zod";

import { clipSchema } from "@/lib/api-contract";
import type { Clip } from "@/lib/api-contract";
import { env, kvConfig, videoModel } from "@/lib/env";
import { generateVideo, getVideoJob } from "@/lib/fal";
import { buildVideoPrompt } from "@/lib/prompt";
import { kvDel, kvGet, kvIncr, kvSet } from "@/lib/store";
import { fetchFeedPage } from "@/lib/x-api";
import type { FeedPost } from "@/lib/x-api";

// The channel scheduler. Programming rules, in order:
//   1. Lazy: a new clip is generated only while someone whose feed it is
//      watches (the owner on the public channel, a user on their own) — an
//      idle channel and anonymous viewers replay the archive instead.
//   2. Popular first: the highest-engagement post without a clip airs next;
//      when nothing in the current batch clears the bar, older pages of the
//      feed are fetched (up to a few) before settling.
//   3. Never twice: every generated clip is archived by post id and rerun
//      forever — a post is paid for at most once.

/** A post must clear this engagement score to be worth a video. */
const MIN_SCORE = 10;
const MAX_FEED_PAGES = 3;
/** While the archive is this small, air the best available post regardless. */
const BOOTSTRAP_ARCHIVE_SIZE = 3;
/** Safety caps on spend, over and above viewer-driven laziness. */
const MAX_CLIPS_PER_DAY = 100;
const MIN_MS_BETWEEN_GENERATIONS = 8_000;
const FEED_CACHE_TTL_SECONDS = 120;
const GENERATE_BUDGET_MS = 50_000;

export type ChannelGenerator = {
  accessToken: string;
  userId: string;
};

export type ChannelViewer = {
  /** "owner" for the public channel, `u:{id}` for a personal channel. */
  channelKey: string;
  /** Present when this viewer's watching may mint new clips (their feed, their tokens). */
  generator?: ChannelGenerator;
};

export type NextClipResult =
  | { kind: "fresh"; clip: Clip }
  | { kind: "rerun"; clip: Clip }
  | { kind: "off-air"; reason: string };

// ---------------------------------------------------------------------------
// Storage. KV (Upstash-compatible REST) when configured; module-level maps
// otherwise, so a local dev server still builds an archive for its lifetime.

const indexSchema = z.array(z.string());

const cachedPostSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string().optional(),
  score: z.number(),
  author: z.object({
    name: z.string(),
    username: z.string(),
    profileImageUrl: z.string().optional(),
  }),
});

const feedCacheSchema = z.object({
  source: z.enum(["home", "own"]),
  posts: z.array(cachedPostSchema),
  nextToken: z.string().optional(),
  pages: z.number(),
});

type FeedCache = z.infer<typeof feedCacheSchema>;

const pendingJobSchema = z.object({
  requestId: z.string(),
  prompt: z.string(),
  post: cachedPostSchema,
});

type PendingJob = z.infer<typeof pendingJobSchema>;

const memClips = new Map<string, Clip>();
const memIndexes = new Map<string, string[]>();
const memFeedCaches = new Map<string, { cache: FeedCache; expiresAt: number }>();
const memPending = new Map<string, PendingJob>();
const memGenDays = new Map<string, number>();
let memLastGenAt = 0;

const useKv = (): boolean => kvConfig() !== undefined;

/** JSON-decode a stored value; corrupt or non-JSON data reads as absent. */
const decodeStored = <Value>(schema: z.ZodType<Value>, raw: string): Value | undefined => {
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

const readIndex = async (channelKey: string): Promise<string[]> => {
  if (!useKv()) return memIndexes.get(channelKey) ?? [];
  const raw = await kvGet(`fr:index:${channelKey}`);
  if (raw === undefined) return [];
  return decodeStored(indexSchema, raw) ?? [];
};

const writeIndex = async (channelKey: string, index: string[]): Promise<void> => {
  if (!useKv()) {
    memIndexes.set(channelKey, index);
    return;
  }
  await kvSet(`fr:index:${channelKey}`, JSON.stringify(index));
};

const readClip = async (postId: string): Promise<Clip | undefined> => {
  if (!useKv()) return memClips.get(postId);
  const raw = await kvGet(`fr:clip:${postId}`);
  if (raw === undefined) return undefined;
  return decodeStored(clipSchema, raw);
};

const writeClip = async (clip: Clip): Promise<void> => {
  if (!useKv()) {
    memClips.set(clip.postId, clip);
    return;
  }
  await kvSet(`fr:clip:${clip.postId}`, JSON.stringify(clip));
};

const readFeedCache = async (channelKey: string): Promise<FeedCache | undefined> => {
  if (!useKv()) {
    const entry = memFeedCaches.get(channelKey);
    return entry !== undefined && entry.expiresAt > Date.now() ? entry.cache : undefined;
  }
  const raw = await kvGet(`fr:feed:${channelKey}`);
  if (raw === undefined) return undefined;
  return decodeStored(feedCacheSchema, raw);
};

const writeFeedCache = async (channelKey: string, cache: FeedCache): Promise<void> => {
  if (!useKv()) {
    memFeedCaches.set(channelKey, {
      cache,
      expiresAt: Date.now() + FEED_CACHE_TTL_SECONDS * 1000,
    });
    return;
  }
  await kvSet(`fr:feed:${channelKey}`, JSON.stringify(cache), FEED_CACHE_TTL_SECONDS);
};

const readPending = async (channelKey: string): Promise<PendingJob | undefined> => {
  if (!useKv()) return memPending.get(channelKey);
  const raw = await kvGet(`fr:pending:${channelKey}`);
  if (raw === undefined) return undefined;
  return decodeStored(pendingJobSchema, raw);
};

const writePending = async (channelKey: string, job: PendingJob | undefined): Promise<void> => {
  if (!useKv()) {
    if (job === undefined) {
      memPending.delete(channelKey);
    } else {
      memPending.set(channelKey, job);
    }
    return;
  }
  if (job === undefined) {
    await kvDel(`fr:pending:${channelKey}`);
    return;
  }
  // A pending marker outliving an hour is a lost job; let it expire.
  await kvSet(`fr:pending:${channelKey}`, JSON.stringify(job), 3_600);
};

// ---------------------------------------------------------------------------
// Spend guards.

const dayKey = (): string => new Date().toISOString().slice(0, 10);

const generationAllowed = async (): Promise<boolean> => {
  const sinceLast = Date.now() - memLastGenAt;
  if (sinceLast < MIN_MS_BETWEEN_GENERATIONS) return false;
  if (useKv()) {
    const last = Number((await kvGet("fr:genlast")) ?? "0");
    if (Date.now() - last < MIN_MS_BETWEEN_GENERATIONS) return false;
    const count = Number((await kvGet(`fr:gen:${dayKey()}`)) ?? "0");
    return count < MAX_CLIPS_PER_DAY;
  }
  return (memGenDays.get(dayKey()) ?? 0) < MAX_CLIPS_PER_DAY;
};

const recordGeneration = async (): Promise<void> => {
  memLastGenAt = Date.now();
  memGenDays.set(dayKey(), (memGenDays.get(dayKey()) ?? 0) + 1);
  if (useKv()) {
    await kvSet("fr:genlast", String(Date.now()));
    await kvIncr(`fr:gen:${dayKey()}`, 2 * 86_400);
  }
};

// ---------------------------------------------------------------------------
// Programming.

const bestOf = (posts: FeedPost[]): FeedPost | undefined => {
  let best: FeedPost | undefined;
  for (const post of posts) {
    if (best === undefined || post.score > best.score) best = post;
  }
  return best;
};

/**
 * The most popular un-aired post in the viewer's feed, paginating deeper when
 * the current batch has nothing worth a video.
 */
const pickCandidate = async (
  generator: ChannelGenerator,
  channelKey: string,
  aired: Set<string>,
): Promise<FeedPost | undefined> => {
  let cache = await readFeedCache(channelKey);
  if (cache === undefined) {
    const page = await fetchFeedPage(generator.accessToken, generator.userId);
    cache = { source: page.source, posts: page.posts, pages: 1 };
    if (page.nextToken !== undefined) cache.nextToken = page.nextToken;
    await writeFeedCache(channelKey, cache);
  }

  for (;;) {
    const unaired = cache.posts.filter((post) => !aired.has(post.id));
    const popular = unaired.filter((post) => post.score >= MIN_SCORE);
    if (popular.length > 0) return bestOf(popular);

    if (cache.nextToken !== undefined && cache.pages < MAX_FEED_PAGES) {
      const page = await fetchFeedPage(
        generator.accessToken,
        generator.userId,
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
      await writeFeedCache(channelKey, cache);
      continue;
    }

    // Nothing clears the bar. A brand-new channel still needs something on
    // air, so bootstrap from the best available; an established one reruns.
    return aired.size < BOOTSTRAP_ARCHIVE_SIZE ? bestOf(unaired) : undefined;
  }
};

const clipFromPost = (post: z.infer<typeof cachedPostSchema>, videoUrl: string): Clip => {
  const clip: Clip = {
    postId: post.id,
    videoUrl,
    text: post.text,
    authorName: post.author.name,
    authorUsername: post.author.username,
    score: post.score,
    generatedAt: Date.now(),
  };
  if (post.author.profileImageUrl !== undefined) clip.authorImage = post.author.profileImageUrl;
  if (post.createdAt !== undefined) clip.postCreatedAt = post.createdAt;
  return clip;
};

const archiveClip = async (channelKey: string, index: string[], clip: Clip): Promise<void> => {
  await writeClip(clip);
  await writeIndex(channelKey, [...index, clip.postId]);
  await recordGeneration();
};

/** Finish a generation left pending by a slower model, if its clip is ready. */
const resumePending = async (
  channelKey: string,
  index: string[],
  falKey: string,
): Promise<Clip | undefined> => {
  const pending = await readPending(channelKey);
  if (pending === undefined) return undefined;
  try {
    const job = await getVideoJob(falKey, videoModel, pending.requestId);
    if (job.status !== "done" || job.videoUrl === undefined) return undefined;
    const clip = clipFromPost(pending.post, job.videoUrl);
    await archiveClip(channelKey, index, clip);
    await writePending(channelKey, undefined);
    return clip;
  } catch {
    await writePending(channelKey, undefined);
    return undefined;
  }
};

const generateFresh = async (
  viewer: ChannelViewer,
  generator: ChannelGenerator,
  index: string[],
  falKey: string,
): Promise<Clip | undefined> => {
  const resumed = await resumePending(viewer.channelKey, index, falKey);
  if (resumed !== undefined) return resumed;

  const candidate = await pickCandidate(generator, viewer.channelKey, new Set(index));
  if (candidate === undefined) return undefined;

  const prompt = buildVideoPrompt(candidate.text, candidate.author.name);
  const job = await generateVideo(falKey, videoModel, prompt, GENERATE_BUDGET_MS);
  if (job.status !== "done" || job.videoUrl === undefined) {
    // Slower model than the budget: remember the paid-for job and finish it
    // on a later request instead of abandoning it.
    await writePending(viewer.channelKey, { requestId: job.requestId, prompt, post: candidate });
    return undefined;
  }
  const clip = clipFromPost(candidate, job.videoUrl);
  await archiveClip(viewer.channelKey, index, clip);
  return clip;
};

export const nextChannelClip = async (
  viewer: ChannelViewer,
  exclude: string[],
): Promise<NextClipResult> => {
  const index = await readIndex(viewer.channelKey);

  let freshFailure: string | undefined;
  const falKey = env.FAL_KEY;
  if (viewer.generator !== undefined && falKey !== undefined && (await generationAllowed())) {
    try {
      const clip = await generateFresh(viewer, viewer.generator, index, falKey);
      if (clip !== undefined) return { kind: "fresh", clip };
    } catch (error) {
      freshFailure = error instanceof Error ? error.message : "generation failed";
    }
  }

  // Rerun: anything from the archive the viewer hasn't just seen.
  const excluded = new Set(exclude);
  const pool = index.filter((id) => !excluded.has(id));
  const candidates = pool.length > 0 ? pool : index;
  for (let attempt = 0; attempt < 5 && candidates.length > 0; attempt += 1) {
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    if (id === undefined) break;
    const clip = await readClip(id);
    if (clip !== undefined) return { kind: "rerun", clip };
  }

  if (freshFailure !== undefined) {
    return { kind: "off-air", reason: freshFailure };
  }
  if (viewer.generator === undefined) {
    return {
      kind: "off-air",
      reason: "Nothing in the archive yet — the channel goes live once its owner tunes in.",
    };
  }
  return { kind: "off-air", reason: "Nothing worth airing in the feed yet — check back soon." };
};
