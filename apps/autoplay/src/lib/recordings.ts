import { del } from "@vercel/blob";
import { asc, desc, eq, inArray, min } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { recording } from "@/db/drizzle-schema";
import type { RecordedSession } from "@/lib/api-contract";
import { itemKind } from "@/lib/sources/types";

// The replay. The public channel is recorded in its owner's browser while it
// is live — one continuous recording per session, uploaded ten seconds at a
// time — and everyone else watches the newest sessions, each appended back
// into a single stream. Retention is by count, not age: the channel has to
// have something to show however long its owner has been away, so the newest
// sessions stay whatever their date, and only what falls off the end goes.

/** Sessions kept, and offered to a replay. A day at the station's cap is under a gigabyte. */
const KEPT_SESSIONS = 6;
/** A ten-second chunk at the recorder's bitrate is ~2MB; anything near this is not one. */
export const MAX_CHUNK_BYTES = 12 * 1024 * 1024;

type Row = typeof recording.$inferSelect;

const memRecordings: Row[] = [];

/** Rows grouped into sessions, newest session first, chunks in order within. */
const toSessions = (rows: Row[]): RecordedSession[] => {
  const sessions = new Map<string, RecordedSession>();
  for (const row of rows.toSorted((a, b) => a.recordedAt - b.recordedAt || a.index - b.index)) {
    const session = sessions.get(row.sessionId) ?? {
      sessionId: row.sessionId,
      formatLabel: row.formatLabel,
      startedAt: row.recordedAt,
      chunks: [],
    };
    session.chunks.push({
      index: row.index,
      url: row.url,
      seconds: row.seconds,
      itemId: row.itemId,
      kind: itemKind(row.itemId),
      text: row.text,
      authorName: row.authorName,
      authorUsername: row.authorUsername,
    });
    sessions.set(row.sessionId, session);
  }
  for (const session of sessions.values()) session.chunks.sort((a, b) => a.index - b.index);
  return (
    [...sessions.values()]
      // A session whose first chunk is missing has no container header and
      // cannot be appended; it is not offered.
      .filter((session) => session.chunks[0]?.index === 0)
      .toSorted((a, b) => b.startedAt - a.startedAt)
      .slice(0, KEPT_SESSIONS)
  );
};

export const listSessions = async (channelKey: string): Promise<RecordedSession[]> => {
  if (db === undefined)
    return toSessions(memRecordings.filter((row) => row.channelKey === channelKey));
  const rows = await db
    .select()
    .from(recording)
    .where(eq(recording.channelKey, channelKey))
    .orderBy(desc(recording.recordedAt), asc(recording.index));
  return toSessions(rows);
};

/**
 * Keep a chunk, and let go of the sessions that have fallen off the end —
 * files first, so a failed delete leaves a row pointing at a file rather
 * than a file nothing points at.
 */
export const addChunk = async (row: Omit<typeof recording.$inferInsert, "id" | "recordedAt">) => {
  const entry = { ...row, id: crypto.randomUUID(), recordedAt: Date.now() };
  if (db === undefined) {
    memRecordings.push(entry);
    return;
  }
  await db.insert(recording).values(entry).onConflictDoNothing();
  const starts = await db
    .select({ sessionId: recording.sessionId, startedAt: min(recording.recordedAt) })
    .from(recording)
    .where(eq(recording.channelKey, row.channelKey))
    .groupBy(recording.sessionId)
    .orderBy(desc(min(recording.recordedAt)));
  const dropped = starts.slice(KEPT_SESSIONS).map((session) => session.sessionId);
  if (dropped.length === 0) return;
  const expired = await db
    .select({ id: recording.id, url: recording.url })
    .from(recording)
    .where(inArray(recording.sessionId, dropped));
  if (expired.length === 0) return;
  try {
    await del(expired.map((old) => old.url));
  } catch {
    // Left for the next pass; the rows stay so the files are not forgotten.
    return;
  }
  for (const old of expired) await db.delete(recording).where(eq(recording.id, old.id));
};
