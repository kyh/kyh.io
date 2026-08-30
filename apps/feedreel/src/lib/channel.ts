import { count, eq, gte, max } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/drizzle-client";
import { channelClip, clip as clipTable, pendingJob } from "@/db/drizzle-schema";
import type { Clip } from "@/lib/api-contract";
import { env, videoModel } from "@/lib/env";
import { generateVideo, getVideoJob } from "@/lib/fal";
import { buildVideoPrompt } from "@/lib/prompt";
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
const FEED_CACHE_TTL_MS = 120_000;
const PENDING_TTL_MS = 3_600_000;
/**
 * How long a request may spend reaching a finished clip, measured from when it
 * arrived — session lookups, token refresh and feed pagination all come out of
 * it. The route's maxDuration is 60s; the remainder is headroom for parking a
 * pending job, which is what keeps a slow generation from being paid for and
 * then lost to a killed function.
 */
const GENERATE_BUDGET_MS = 45_000;
/** Below this much budget left, submitting to fal would only park a job. */
const MIN_GENERATE_MS = 5_000;

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
// Storage. Drizzle + Turso when TURSO_DATABASE_URL is set (feedreel's own
// database — see src/db/drizzle-schema.ts); module-level maps otherwise, so a
// local dev server still builds an archive for its lifetime.

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

type CachedPost = z.infer<typeof cachedPostSchema>;

type FeedCache = {
  source: "home" | "own";
  posts: CachedPost[];
  nextToken?: string;
  pages: number;
};

type PendingJob = {
  requestId: string;
  prompt: string;
  post: CachedPost;
};

const memClips = new Map<string, Clip>();
const memIndexes = new Map<string, string[]>();
const memPending = new Map<string, PendingJob>();
const memGenDays = new Map<string, number>();
let memLastGenAt = 0;

// The feed cache is a short-lived rate-limit shield for X reads, not durable
// state — it stays in memory (per server instance) in both storage modes.
const memFeedCaches = new Map<string, { cache: FeedCache; expiresAt: number }>();

const readIndex = async (channelKey: string): Promise<string[]> => {
  if (db === undefined) return memIndexes.get(channelKey) ?? [];
  const rows = await db
    .select({ postId: channelClip.postId })
    .from(channelClip)
    .where(eq(channelClip.channelKey, channelKey))
    .orderBy(channelClip.addedAt);
  return rows.map((row) => row.postId);
};

const readClip = async (postId: string): Promise<Clip | undefined> => {
  if (db === undefined) return memClips.get(postId);
  const rows = await db.select().from(clipTable).where(eq(clipTable.postId, postId)).limit(1);
  const row = rows[0];
  if (row === undefined) return undefined;
  const clip: Clip = {
    postId: row.postId,
    videoUrl: row.videoUrl,
    text: row.text,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    score: row.score,
    generatedAt: row.generatedAt,
  };
  if (row.authorImage !== null) clip.authorImage = row.authorImage;
  if (row.postCreatedAt !== null) clip.postCreatedAt = row.postCreatedAt;
  return clip;
};

const readFeedCache = (channelKey: string): FeedCache | undefined => {
  const entry = memFeedCaches.get(channelKey);
  return entry !== undefined && entry.expiresAt > Date.now() ? entry.cache : undefined;
};

const writeFeedCache = (channelKey: string, cache: FeedCache): void => {
  memFeedCaches.set(channelKey, { cache, expiresAt: Date.now() + FEED_CACHE_TTL_MS });
};

const readPending = async (channelKey: string): Promise<PendingJob | undefined> => {
  if (db === undefined) return memPending.get(channelKey);
  const rows = await db
    .select()
    .from(pendingJob)
    .where(eq(pendingJob.channelKey, channelKey))
    .limit(1);
  const row = rows[0];
  if (row === undefined) return undefined;
  if (row.createdAt < Date.now() - PENDING_TTL_MS) {
    // A pending marker outliving an hour is a lost job; drop it.
    await db.delete(pendingJob).where(eq(pendingJob.channelKey, channelKey));
    return undefined;
  }
  let post: CachedPost | undefined;
  try {
    const parsed = cachedPostSchema.safeParse(JSON.parse(row.postJson));
    if (parsed.success) post = parsed.data;
  } catch {
    // Corrupt row — treated as absent below.
  }
  if (post === undefined) {
    await db.delete(pendingJob).where(eq(pendingJob.channelKey, channelKey));
    return undefined;
  }
  return { requestId: row.requestId, prompt: row.prompt, post };
};

const writePending = async (channelKey: string, job: PendingJob | undefined): Promise<void> => {
  if (db === undefined) {
    if (job === undefined) {
      memPending.delete(channelKey);
    } else {
      memPending.set(channelKey, job);
    }
    return;
  }
  if (job === undefined) {
    await db.delete(pendingJob).where(eq(pendingJob.channelKey, channelKey));
    return;
  }
  const row = {
    channelKey,
    requestId: job.requestId,
    prompt: job.prompt,
    postJson: JSON.stringify(job.post),
    createdAt: Date.now(),
  };
  await db
    .insert(pendingJob)
    .values(row)
    .onConflictDoUpdate({ target: pendingJob.channelKey, set: row });
};

// ---------------------------------------------------------------------------
// Spend guards. With the database, the day count and spacing are derived
// straight from the clips generated today — no counters to drift.

const dayKey = (): string => new Date().toISOString().slice(0, 10);

const generationAllowed = async (): Promise<boolean> => {
  if (Date.now() - memLastGenAt < MIN_MS_BETWEEN_GENERATIONS) return false;
  if (db === undefined) return (memGenDays.get(dayKey()) ?? 0) < MAX_CLIPS_PER_DAY;
  const dayStart = Date.parse(`${dayKey()}T00:00:00Z`);
  const rows = await db
    .select({ total: count(), last: max(clipTable.generatedAt) })
    .from(clipTable)
    .where(gte(clipTable.generatedAt, dayStart));
  const row = rows[0];
  if (row === undefined) return true;
  if (row.last !== null && Date.now() - row.last < MIN_MS_BETWEEN_GENERATIONS) return false;
  return row.total < MAX_CLIPS_PER_DAY;
};

const recordGeneration = (): void => {
  memLastGenAt = Date.now();
  if (db === undefined) {
    memGenDays.set(dayKey(), (memGenDays.get(dayKey()) ?? 0) + 1);
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
  let cache = readFeedCache(channelKey);
  if (cache === undefined) {
    const page = await fetchFeedPage(generator.accessToken, generator.userId);
    cache = { source: page.source, posts: page.posts, pages: 1 };
    if (page.nextToken !== undefined) cache.nextToken = page.nextToken;
    writeFeedCache(channelKey, cache);
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
      writeFeedCache(channelKey, cache);
      continue;
    }

    // Nothing clears the bar. A brand-new channel still needs something on
    // air, so bootstrap from the best available; an established one reruns.
    return aired.size < BOOTSTRAP_ARCHIVE_SIZE ? bestOf(unaired) : undefined;
  }
};

const clipFromPost = (post: CachedPost, videoUrl: string): Clip => {
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
  if (db === undefined) {
    memClips.set(clip.postId, clip);
    memIndexes.set(channelKey, [...index, clip.postId]);
  } else {
    await db
      .insert(clipTable)
      .values({
        postId: clip.postId,
        videoUrl: clip.videoUrl,
        text: clip.text,
        authorName: clip.authorName,
        authorUsername: clip.authorUsername,
        authorImage: clip.authorImage ?? null,
        postCreatedAt: clip.postCreatedAt ?? null,
        score: clip.score,
        generatedAt: clip.generatedAt,
      })
      .onConflictDoNothing();
    await db
      .insert(channelClip)
      .values({ channelKey, postId: clip.postId, addedAt: Date.now() })
      .onConflictDoNothing();
  }
  recordGeneration();
};

/**
 * Air a clip another channel already paid for. Clips are global by post id, so
 * this is the "never twice" rule doing its job across channels — no spend, and
 * nothing to record against the daily cap.
 */
const adoptClip = async (channelKey: string, index: string[], clip: Clip): Promise<void> => {
  if (db === undefined) {
    memIndexes.set(channelKey, [...index, clip.postId]);
    return;
  }
  await db
    .insert(channelClip)
    .values({ channelKey, postId: clip.postId, addedAt: Date.now() })
    .onConflictDoNothing();
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

/** `generated` is false for a clip adopted from another channel's archive. */
type FreshResult = { clip: Clip; generated: boolean };

const generateFresh = async (
  viewer: ChannelViewer,
  generator: ChannelGenerator,
  index: string[],
  falKey: string,
  deadline: number,
): Promise<FreshResult | undefined> => {
  const resumed = await resumePending(viewer.channelKey, index, falKey);
  if (resumed !== undefined) return { clip: resumed, generated: true };

  const candidate = await pickCandidate(generator, viewer.channelKey, new Set(index));
  if (candidate === undefined) return undefined;

  const existing = await readClip(candidate.id);
  if (existing !== undefined) {
    await adoptClip(viewer.channelKey, index, existing);
    return { clip: existing, generated: false };
  }

  const budget = deadline - Date.now();
  if (budget < MIN_GENERATE_MS) return undefined;

  const prompt = buildVideoPrompt(candidate.text, candidate.author.name);
  const job = await generateVideo(falKey, videoModel, prompt, budget);
  if (job.status !== "done" || job.videoUrl === undefined) {
    // Slower model than the budget: remember the paid-for job and finish it
    // on a later request instead of abandoning it.
    await writePending(viewer.channelKey, { requestId: job.requestId, prompt, post: candidate });
    return undefined;
  }
  const clip = clipFromPost(candidate, job.videoUrl);
  await archiveClip(viewer.channelKey, index, clip);
  return { clip, generated: true };
};

export const nextChannelClip = async (
  viewer: ChannelViewer,
  exclude: string[],
  receivedAt: number,
): Promise<NextClipResult> => {
  const index = await readIndex(viewer.channelKey);
  const deadline = receivedAt + GENERATE_BUDGET_MS;

  let freshFailure: string | undefined;
  const falKey = env.FAL_KEY;
  if (viewer.generator !== undefined && falKey !== undefined && (await generationAllowed())) {
    try {
      const result = await generateFresh(viewer, viewer.generator, index, falKey, deadline);
      if (result !== undefined) {
        return { kind: result.generated ? "fresh" : "rerun", clip: result.clip };
      }
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
