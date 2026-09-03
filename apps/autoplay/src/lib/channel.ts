import { and, count, desc, eq, gte, max } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { channelClip, clip as clipTable, pendingJob } from "@/db/drizzle-schema";
import type { Clip, Program } from "@/lib/api-contract";
import { DEFAULT_VIDEO_MODEL, env, videoModel } from "@/lib/env";
import {
  CONTINUATION_VIDEO_MODEL,
  awaitVideoJob,
  extractLastFrame,
  getVideoJob,
  submitVideoJob,
} from "@/lib/fal";
import { buildVideoPrompt } from "@/lib/prompt";
import { pickCandidate } from "@/lib/sources";
import { itemKind, itemSchema } from "@/lib/sources/types";
import type { Item, SourceAccess } from "@/lib/sources/types";

// The channel scheduler. A channel is a source — an X account, a newsletter
// inbox, a feed — and the rules are the same for all of them, in order:
//   1. Lazy: a new clip is generated only while someone whose source it is
//      watches — an idle channel and everyone else replay the archive. Even
//      then generation runs a program ahead: a request queues the next clip
//      and airs a rerun meanwhile, and the clip lands on a later request.
//   2. Best first: the source's adapter (src/lib/sources) says which un-aired
//      item is worth a video — engagement on X, recency for mail and feeds,
//      views on YouTube.
//   3. Never twice: every generated clip is archived by item id and rerun
//      forever — an item is paid for at most once.

/** Safety caps on spend, over and above viewer-driven laziness. */
const MAX_CLIPS_PER_DAY = 100;
const MIN_MS_BETWEEN_GENERATIONS = 8_000;
/** A submitted job fal still hasn't finished after this long is lost. */
const PENDING_TTL_MS = 3_600_000;
/**
 * A claim that never turned into a submission belongs to a request that died
 * between the two; submitting takes well under a second, so anything older
 * is safe to take over.
 */
const CLAIM_TTL_MS = 60_000;
/**
 * How long a request may wait for a channel's first-ever program, measured
 * from when it arrived — session lookups, token refresh and feed pagination
 * all come out of it. Every later program is served from the archive while
 * generation runs ahead, so nothing else waits on fal. The route's
 * maxDuration is 60s; the remainder is headroom for the frame extraction and
 * archive writes that follow.
 */
const GENERATE_BUDGET_MS = 45_000;
/** Pulling the closing frame is a cheap ffmpeg job; never let it hold a request. */
const FRAME_EXTRACT_BUDGET_MS = 8_000;
/**
 * Development only: how many clips a channel may have in rotation before it
 * stops minting new ones and just reruns. Working on the UI should not cost a
 * generation every fifteen seconds. It counts what still airs, not everything
 * ever made, so archiving a clip you dislike in the guide frees a slot and the
 * next request generates a replacement — which is the loop you want while
 * tuning prompts.
 */
export const DEV_MAX_PLAYABLE_CLIPS = 5;

export const devCapReached = (playableCount: number, nodeEnv: string | undefined): boolean =>
  nodeEnv !== "production" && playableCount >= DEV_MAX_PLAYABLE_CLIPS;

export type ChannelViewer = {
  /** The source id; "owner" for the public channel. */
  channelKey: string;
  /** Present when this viewer's watching may mint new clips: their source, with a working grant. */
  access?: SourceAccess;
  /** Shown instead of the generic OFF AIR reason when there is nothing to rerun. */
  noAccessReason?: string;
};

export type NextClipResult =
  | { kind: "fresh"; clip: Clip }
  | { kind: "rerun"; clip: Clip }
  | { kind: "off-air"; reason: string };

// ---------------------------------------------------------------------------
// Storage. Drizzle + Turso when TURSO_DATABASE_URL is set (autoplay's own
// database — see src/db/drizzle-schema.ts); module-level maps otherwise, so a
// local dev server still builds an archive for its lifetime.

/**
 * A channel's one generation, from the moment a request decides to spend
 * until the clip is archived. "claimed" is the window between that decision
 * and fal accepting the job — written first, so a concurrent request sees the
 * slot is taken and airs a rerun instead of paying a second time.
 */
export type PendingJob =
  | { phase: "claimed"; prompt: string; item: Item; createdAt: number }
  | { phase: "submitted"; requestId: string; prompt: string; item: Item; createdAt: number };

type ClaimedJob = Extract<PendingJob, { phase: "claimed" }>;
type SubmittedJob = Extract<PendingJob, { phase: "submitted" }>;

type PendingRow = typeof pendingJob.$inferInsert;
/** What tells one occupant of the slot from the next: the id and when it arrived. */
type PendingIdentity = Pick<PendingRow, "requestId" | "createdAt">;

/**
 * `pending_job.request_id` is NOT NULL, so a claim that has not reached fal
 * yet is stored with an empty id rather than a schema change.
 */
const UNSUBMITTED_REQUEST_ID = "";

const memClips = new Map<string, Clip>();
const memIndexes = new Map<string, string[]>();
const memPending = new Map<string, PendingRow>();
const memGenDays = new Map<string, number>();
let memLastGenAt = 0;
/** Last frame of the newest clip on a channel, when there is no database. */
const memSeedFrames = new Map<string, string>();
/** Programs pulled off the air, when there is no database. */
const memHidden = new Map<string, Set<string>>();

/**
 * A channel's programs, split by whether they still air.
 *
 * `all` is what stops an item being picked again — a hidden program must stay
 * in it, or the scheduler would treat the item as new and pay to generate it
 * a second time. `playable` is what reruns draw from.
 */
type ChannelIndex = {
  all: string[];
  playable: string[];
};

const readIndex = async (channelKey: string): Promise<ChannelIndex> => {
  if (db === undefined) {
    const all = memIndexes.get(channelKey) ?? [];
    const hidden = memHidden.get(channelKey);
    return { all, playable: all.filter((id) => hidden?.has(id) !== true) };
  }
  const rows = await db
    .select({ itemId: channelClip.itemId, hiddenAt: channelClip.hiddenAt })
    .from(channelClip)
    .where(eq(channelClip.channelKey, channelKey))
    .orderBy(channelClip.addedAt);
  return {
    all: rows.map((row) => row.itemId),
    playable: rows.filter((row) => row.hiddenAt === null).map((row) => row.itemId),
  };
};

const clipFromRow = (row: typeof clipTable.$inferSelect): Clip => {
  const clip: Clip = {
    itemId: row.itemId,
    kind: itemKind(row.itemId),
    videoUrl: row.videoUrl,
    text: row.text,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    score: row.score,
    generatedAt: row.generatedAt,
  };
  if (row.authorImage !== null) clip.authorImage = row.authorImage;
  if (row.itemCreatedAt !== null) clip.itemCreatedAt = row.itemCreatedAt;
  return clip;
};

/**
 * Every program that has aired on a channel, newest first, including the ones
 * pulled off the air — the point of the listing is to be able to put them
 * back.
 */
export const listChannelPrograms = async (channelKey: string): Promise<Program[]> => {
  if (db === undefined) {
    const hiddenIds = memHidden.get(channelKey);
    return (memIndexes.get(channelKey) ?? []).toReversed().flatMap((itemId) => {
      const clip = memClips.get(itemId);
      return clip === undefined ? [] : [{ clip, hidden: hiddenIds?.has(itemId) === true }];
    });
  }
  const rows = await db
    .select()
    .from(channelClip)
    .innerJoin(clipTable, eq(channelClip.itemId, clipTable.itemId))
    .where(eq(channelClip.channelKey, channelKey))
    .orderBy(desc(channelClip.addedAt));
  return rows.map((row) => ({
    clip: clipFromRow(row.clip),
    hidden: row.channel_clip.hiddenAt !== null,
  }));
};

/**
 * Pull a program off the air, or put it back. The channel_clip row is never
 * deleted: it is what remembers the item was already paid for, so archiving
 * must not open the door to generating it again.
 */
export const setProgramHidden = async (
  channelKey: string,
  itemId: string,
  hidden: boolean,
): Promise<void> => {
  if (db === undefined) {
    const set = memHidden.get(channelKey) ?? new Set<string>();
    if (hidden) {
      set.add(itemId);
    } else {
      set.delete(itemId);
    }
    memHidden.set(channelKey, set);
    return;
  }
  await db
    .update(channelClip)
    .set({ hiddenAt: hidden ? Date.now() : null })
    .where(and(eq(channelClip.channelKey, channelKey), eq(channelClip.itemId, itemId)));
};

export const readClip = async (itemId: string): Promise<Clip | undefined> => {
  if (db === undefined) return memClips.get(itemId);
  const rows = await db.select().from(clipTable).where(eq(clipTable.itemId, itemId)).limit(1);
  const row = rows[0];
  return row === undefined ? undefined : clipFromRow(row);
};

/**
 * The frame the next program should continue out of: the final frame of the
 * clip most recently added to this channel. Undefined starts a fresh scene,
 * which is right for a channel's first program and after a failed extraction.
 */
const readSeedFrame = async (channelKey: string): Promise<string | undefined> => {
  if (db === undefined) return memSeedFrames.get(channelKey);
  const rows = await db
    .select({ lastFrameUrl: clipTable.lastFrameUrl })
    .from(channelClip)
    .innerJoin(clipTable, eq(channelClip.itemId, clipTable.itemId))
    .where(eq(channelClip.channelKey, channelKey))
    .orderBy(desc(channelClip.addedAt))
    .limit(1);
  return rows[0]?.lastFrameUrl ?? undefined;
};

const rowFromPending = (channelKey: string, job: PendingJob): PendingRow => ({
  channelKey,
  requestId: job.phase === "submitted" ? job.requestId : UNSUBMITTED_REQUEST_ID,
  prompt: job.prompt,
  itemJson: JSON.stringify(job.item),
  createdAt: job.createdAt,
});

/**
 * The job a stored row stands for, or undefined once the row is spent: a claim
 * older than CLAIM_TTL_MS, a submission older than PENDING_TTL_MS, or an item
 * that no longer parses.
 */
export const pendingFromRow = (row: PendingRow, now: number): PendingJob | undefined => {
  const claimed = row.requestId === UNSUBMITTED_REQUEST_ID;
  if (row.createdAt < now - (claimed ? CLAIM_TTL_MS : PENDING_TTL_MS)) return undefined;
  let item: Item | undefined;
  try {
    const parsed = itemSchema.safeParse(JSON.parse(row.itemJson));
    if (parsed.success) item = parsed.data;
  } catch {
    // Corrupt row — spent.
  }
  if (item === undefined) return undefined;
  const base = { prompt: row.prompt, item, createdAt: row.createdAt };
  return claimed
    ? { phase: "claimed", ...base }
    : { phase: "submitted", requestId: row.requestId, ...base };
};

const sameOccupant = (row: PendingIdentity, other: PendingIdentity): boolean =>
  row.requestId === other.requestId && row.createdAt === other.createdAt;

/**
 * Delete the row, but only while it is still the one that was read. Between
 * the read and now another request may have released it and claimed afresh,
 * and that claim must not be swept away with the old row. Returns whether this
 * caller was the one to release it — the tie-break when two requests both
 * find the same job finished.
 */
const releasePending = async (channelKey: string, row: PendingIdentity): Promise<boolean> => {
  if (db === undefined) {
    const current = memPending.get(channelKey);
    if (current === undefined || !sameOccupant(current, row)) return false;
    memPending.delete(channelKey);
    return true;
  }
  const result = await db
    .delete(pendingJob)
    .where(
      and(
        eq(pendingJob.channelKey, channelKey),
        eq(pendingJob.requestId, row.requestId),
        eq(pendingJob.createdAt, row.createdAt),
      ),
    );
  return result.rowsAffected > 0;
};

const readPending = async (channelKey: string): Promise<PendingJob | undefined> => {
  let row: PendingRow | undefined;
  if (db === undefined) {
    row = memPending.get(channelKey);
  } else {
    const rows = await db
      .select()
      .from(pendingJob)
      .where(eq(pendingJob.channelKey, channelKey))
      .limit(1);
    row = rows[0];
  }
  if (row === undefined) return undefined;
  const job = pendingFromRow(row, Date.now());
  if (job === undefined) await releasePending(channelKey, row);
  return job;
};

/**
 * Reserve the channel's generation slot before any money is spent. Undefined
 * means another request holds it; that request's clip will air on a later
 * program, so the caller reruns rather than submitting a duplicate.
 */
const claimPending = async (
  channelKey: string,
  prompt: string,
  item: Item,
): Promise<ClaimedJob | undefined> => {
  const claim: ClaimedJob = { phase: "claimed", prompt, item, createdAt: Date.now() };
  const row = rowFromPending(channelKey, claim);
  if (db === undefined) {
    if (memPending.has(channelKey)) return undefined;
    memPending.set(channelKey, row);
    return claim;
  }
  const result = await db.insert(pendingJob).values(row).onConflictDoNothing();
  return result.rowsAffected > 0 ? claim : undefined;
};

/** The claim, now accepted by fal under `requestId`. */
const submitPending = async (
  channelKey: string,
  claim: ClaimedJob,
  requestId: string,
): Promise<SubmittedJob> => {
  const job: SubmittedJob = {
    phase: "submitted",
    requestId,
    prompt: claim.prompt,
    item: claim.item,
    createdAt: Date.now(),
  };
  const row = rowFromPending(channelKey, job);
  const claimRow = rowFromPending(channelKey, claim);
  if (db === undefined) {
    const current = memPending.get(channelKey);
    if (current !== undefined && sameOccupant(current, claimRow)) memPending.set(channelKey, row);
    return job;
  }
  await db
    .update(pendingJob)
    .set(row)
    .where(
      and(
        eq(pendingJob.channelKey, channelKey),
        eq(pendingJob.requestId, claimRow.requestId),
        eq(pendingJob.createdAt, claimRow.createdAt),
      ),
    );
  return job;
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

const clipFromItem = (item: Item, videoUrl: string): Clip => {
  const clip: Clip = {
    itemId: item.id,
    kind: item.kind,
    videoUrl,
    text: item.text,
    authorName: item.author.name,
    authorUsername: item.author.username,
    score: item.score,
    generatedAt: Date.now(),
  };
  if (item.author.profileImageUrl !== undefined) clip.authorImage = item.author.profileImageUrl;
  if (item.createdAt !== undefined) clip.itemCreatedAt = item.createdAt;
  return clip;
};

const archiveClip = async (
  channelKey: string,
  index: string[],
  clip: Clip,
  lastFrameUrl: string | undefined,
): Promise<void> => {
  if (db === undefined) {
    memClips.set(clip.itemId, clip);
    memIndexes.set(channelKey, [...index, clip.itemId]);
    if (lastFrameUrl === undefined) {
      memSeedFrames.delete(channelKey);
    } else {
      memSeedFrames.set(channelKey, lastFrameUrl);
    }
  } else {
    await db
      .insert(clipTable)
      .values({
        itemId: clip.itemId,
        videoUrl: clip.videoUrl,
        text: clip.text,
        authorName: clip.authorName,
        authorUsername: clip.authorUsername,
        authorImage: clip.authorImage ?? null,
        itemCreatedAt: clip.itemCreatedAt ?? null,
        score: clip.score,
        lastFrameUrl: lastFrameUrl ?? null,
        generatedAt: clip.generatedAt,
      })
      .onConflictDoNothing();
    await db
      .insert(channelClip)
      .values({ channelKey, itemId: clip.itemId, addedAt: Date.now() })
      .onConflictDoNothing();
  }
  recordGeneration();
};

/**
 * Air a clip another channel already paid for. Clips are global by item id, so
 * this is the "never twice" rule doing its job across channels — no spend, and
 * nothing to record against the daily cap.
 */
const adoptClip = async (channelKey: string, index: string[], clip: Clip): Promise<void> => {
  if (db === undefined) {
    memIndexes.set(channelKey, [...index, clip.itemId]);
    return;
  }
  await db
    .insert(channelClip)
    .values({ channelKey, itemId: clip.itemId, addedAt: Date.now() })
    .onConflictDoNothing();
};

type PendingOutcome = { status: "none" } | { status: "in-flight" } | { status: "done"; clip: Clip };

/**
 * The channel's in-flight generation, archived if fal has finished it. Only a
 * job fal no longer knows about frees the slot without a clip; anything still
 * running keeps it, which is what stops the next request paying twice.
 */
const resumePending = async (
  channelKey: string,
  index: string[],
  falKey: string,
): Promise<PendingOutcome> => {
  const pending = await readPending(channelKey);
  if (pending === undefined) return { status: "none" };
  if (pending.phase === "claimed") return { status: "in-flight" };
  const row = rowFromPending(channelKey, pending);
  // A parked job may have gone to either model, but both share the
  // `minimax/h3-max` root that getVideoJob falls back to, so one lookup
  // finds it either way.
  const job = await getVideoJob(falKey, videoModel, pending.requestId).catch(() => undefined);
  if (job === undefined) {
    // fal no longer knows the job: lost, and the slot is free.
    await releasePending(channelKey, row);
    return { status: "none" };
  }
  if (job.status !== "done" || job.videoUrl === undefined) return { status: "in-flight" };
  const clip = clipFromItem(pending.item, job.videoUrl);
  const lastFrame = await extractLastFrame(falKey, job.videoUrl, FRAME_EXTRACT_BUDGET_MS);
  await archiveClip(channelKey, index, clip, lastFrame);
  // Overlapping requests can both find the job finished. Archiving twice is
  // harmless; airing it as fresh twice is not, so only the one that clears
  // the row does.
  return (await releasePending(channelKey, row)) ? { status: "done", clip } : { status: "none" };
};

/** `generated` is false for a clip adopted from another channel's archive. */
type FreshResult = { clip: Clip; generated: boolean };

/**
 * Generation runs one program ahead of the viewer instead of in their way. A
 * request harvests the channel's in-flight job if fal has finished it, queues
 * the next one, and returns without waiting — the rerun that airs meanwhile is
 * what makes tuning in instant. The one exception is a channel with nothing
 * to rerun, which waits out its budget for the first-ever program.
 */
const generateFresh = async (
  channelKey: string,
  access: SourceAccess,
  index: ChannelIndex,
  falKey: string,
  deadline: number,
): Promise<FreshResult | undefined> => {
  // Decided before harvesting, or the clip archived just below would count as
  // "too soon" and the pipeline could never stay a program ahead.
  const mayQueue =
    !devCapReached(index.playable.length, process.env.NODE_ENV) && (await generationAllowed());

  const pending = await resumePending(channelKey, index.all, falKey);
  if (pending.status === "in-flight") return undefined;
  const harvested: FreshResult | undefined =
    pending.status === "done" ? { clip: pending.clip, generated: true } : undefined;
  if (!mayQueue) return harvested;

  const aired = new Set(index.all);
  if (harvested !== undefined) aired.add(harvested.clip.itemId);
  const candidate = await pickCandidate(access, channelKey, aired);
  if (candidate === undefined) return harvested;

  const existing = await readClip(candidate.id);
  if (existing !== undefined) {
    await adoptClip(channelKey, [...aired], existing);
    return harvested ?? { clip: existing, generated: false };
  }

  const prompt = buildVideoPrompt(candidate.text, candidate.author.name);
  const claim = await claimPending(channelKey, prompt, candidate);
  if (claim === undefined) return harvested;

  // Continue out of the previous program's final frame where there is one, so
  // the cut between clips lands on an identical image.
  const seedFrame =
    videoModel === DEFAULT_VIDEO_MODEL ? await readSeedFrame(channelKey) : undefined;
  const model = seedFrame === undefined ? videoModel : CONTINUATION_VIDEO_MODEL;

  let requestId: string;
  try {
    requestId = await submitVideoJob(falKey, model, prompt, seedFrame);
  } catch (error) {
    await releasePending(channelKey, rowFromPending(channelKey, claim));
    throw error;
  }
  const submitted = await submitPending(channelKey, claim, requestId);

  if (harvested !== undefined || index.playable.length > 0) return harvested;

  // Nothing to rerun yet: the first program is worth waiting for.
  const job = await awaitVideoJob(falKey, model, requestId, deadline - Date.now());
  if (job.status !== "done" || job.videoUrl === undefined) return undefined;
  const clip = clipFromItem(candidate, job.videoUrl);
  const lastFrame = await extractLastFrame(falKey, job.videoUrl, FRAME_EXTRACT_BUDGET_MS);
  await archiveClip(channelKey, [...aired], clip, lastFrame);
  await releasePending(channelKey, rowFromPending(channelKey, submitted));
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
  if (viewer.access !== undefined && falKey !== undefined) {
    try {
      const result = await generateFresh(viewer.channelKey, viewer.access, index, falKey, deadline);
      if (result !== undefined) {
        return { kind: result.generated ? "fresh" : "rerun", clip: result.clip };
      }
    } catch (error) {
      freshFailure = error instanceof Error ? error.message : "generation failed";
    }
  }

  // Rerun: anything from the archive the viewer hasn't just seen.
  const excluded = new Set(exclude);
  const pool = index.playable.filter((id) => !excluded.has(id));
  const candidates = pool.length > 0 ? pool : index.playable;
  for (let attempt = 0; attempt < 5 && candidates.length > 0; attempt += 1) {
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    if (id === undefined) break;
    const clip = await readClip(id);
    if (clip !== undefined) return { kind: "rerun", clip };
  }

  if (freshFailure !== undefined) {
    return { kind: "off-air", reason: freshFailure };
  }
  if (viewer.noAccessReason !== undefined) {
    return { kind: "off-air", reason: viewer.noAccessReason };
  }
  if (viewer.access === undefined) {
    return {
      kind: "off-air",
      reason: "Nothing in the archive yet — the channel goes live once its owner tunes in.",
    };
  }
  return { kind: "off-air", reason: "Nothing worth airing on this source yet — check back soon." };
};
