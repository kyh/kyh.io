import { del } from "@vercel/blob";
import { desc, eq, lt } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { recording } from "@/db/drizzle-schema";
import type { Recording } from "@/lib/api-contract";
import { itemKind } from "@/lib/sources/types";

// The replay. The public channel is recorded in its owner's browser while it
// is live — one webm per 30s program, uploaded to Vercel Blob — and everyone
// else watches the newest of those, on a loop. Retention is by age: a day of
// stream at the station's cap is under a gigabyte, so a few hours is plenty
// and keeps the store from growing without bound.

/** How far back a replay reaches; older segments and their files are dropped. */
const RETENTION_MS = 6 * 3_600_000;
/** How many segments a replay is handed at once: about half an hour. */
const REPLAY_LENGTH = 60;
/** A 30s segment at the recorder's bitrate is ~6MB; anything near this is not one. */
export const MAX_SEGMENT_BYTES = 12 * 1024 * 1024;

const memRecordings: (typeof recording.$inferSelect)[] = [];

const toRecording = (row: typeof recording.$inferSelect): Recording => ({
  id: row.id,
  itemId: row.itemId,
  kind: itemKind(row.itemId),
  url: row.url,
  formatLabel: row.formatLabel,
  text: row.text,
  authorName: row.authorName,
  authorUsername: row.authorUsername,
  seconds: row.seconds,
  recordedAt: row.recordedAt,
});

export const listRecordings = async (channelKey: string): Promise<Recording[]> => {
  if (db === undefined) {
    return memRecordings
      .filter((row) => row.channelKey === channelKey)
      .toSorted((a, b) => b.recordedAt - a.recordedAt)
      .slice(0, REPLAY_LENGTH)
      .map(toRecording);
  }
  const rows = await db
    .select()
    .from(recording)
    .where(eq(recording.channelKey, channelKey))
    .orderBy(desc(recording.recordedAt))
    .limit(REPLAY_LENGTH);
  return rows.map(toRecording);
};

/**
 * Keep a segment, and let go of the ones that have aged out — files first,
 * so a failed delete leaves a row pointing at a file rather than a file
 * nothing points at.
 */
export const addRecording = async (
  row: Omit<typeof recording.$inferInsert, "id" | "recordedAt">,
): Promise<void> => {
  const entry = { ...row, id: crypto.randomUUID(), recordedAt: Date.now() };
  const cutoff = Date.now() - RETENTION_MS;
  if (db === undefined) {
    memRecordings.push(entry);
    return;
  }
  await db.insert(recording).values(entry);
  const expired = await db
    .select({ id: recording.id, url: recording.url })
    .from(recording)
    .where(lt(recording.recordedAt, cutoff));
  if (expired.length === 0) return;
  try {
    await del(expired.map((old) => old.url));
  } catch {
    // Left for the next pass; the rows stay so the files are not forgotten.
    return;
  }
  for (const old of expired) await db.delete(recording).where(eq(recording.id, old.id));
};
