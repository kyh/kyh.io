import { del, put } from "@vercel/blob";
import { asc, desc, eq, inArray, min } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { recording, recordingFile } from "@/db/drizzle-schema";
import type { RecordedSession } from "@/lib/api-contract";
import { itemKind } from "@/lib/sources/types";
import { finalizeWebm } from "@/lib/webm";

// The replay. The public channel is recorded in its owner's browser while it
// is live — one continuous recording per session, uploaded ten-odd seconds at a
// time — and everyone else watches the newest sessions, each appended back
// into a single stream. A browser that cannot append a stream — Safari, every
// browser on an iPhone — gets a finished session as one file instead, built
// from the same chunks. Retention is by count, not age: the channel has to
// have something to show however long its owner has been away, so the newest
// sessions stay whatever their date, and only what falls off the end goes.

/** Sessions kept, and offered to a replay. A day at the station's cap is under a gigabyte. */
const KEPT_SESSIONS = 6;
/** A ten-second chunk at the recorder's bitrate is ~2MB; anything near this is not one. */
export const MAX_CHUNK_BYTES = 12 * 1024 * 1024;
/**
 * How long after its last chunk a session may be asked for as a file by
 * someone other than its owner: before that it may still be recording, and
 * the owner's recorder asks the moment it has stopped.
 */
const FILE_AFTER_MS = 60_000;

type Row = typeof recording.$inferSelect;
type FileRow = typeof recordingFile.$inferSelect;

const memRecordings: Row[] = [];
const memFiles: FileRow[] = [];

const filePath = (channelKey: string, sessionId: string): string =>
  `recordings/${channelKey}/${sessionId}/session.webm`;

/** Rows grouped into sessions, newest session first, chunks in order within. */
const toSessions = (rows: Row[], files: Map<string, string>): RecordedSession[] => {
  const sessions = new Map<string, RecordedSession>();
  for (const row of rows.toSorted((a, b) => a.recordedAt - b.recordedAt || a.index - b.index)) {
    const session = sessions.get(row.sessionId) ?? {
      sessionId: row.sessionId,
      formatLabel: row.formatLabel,
      startedAt: row.recordedAt,
      updatedAt: row.recordedAt,
      chunks: [],
      fileUrl: files.get(row.sessionId),
    };
    session.updatedAt = Math.max(session.updatedAt, row.recordedAt);
    session.chunks.push({
      index: row.index,
      url: row.url,
      seconds: row.seconds,
      itemId: row.itemId,
      kind: itemKind(row.itemId),
      text: row.text,
      link: row.link ?? undefined,
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

const fileUrls = (files: FileRow[]): Map<string, string> =>
  new Map(files.map((file) => [file.sessionId, file.url]));

export const listSessions = async (channelKey: string): Promise<RecordedSession[]> => {
  if (db === undefined) {
    return toSessions(
      memRecordings.filter((row) => row.channelKey === channelKey),
      fileUrls(memFiles.filter((file) => file.channelKey === channelKey)),
    );
  }
  const [rows, files] = await Promise.all([
    db
      .select()
      .from(recording)
      .where(eq(recording.channelKey, channelKey))
      .orderBy(desc(recording.recordedAt), asc(recording.index)),
    db.select().from(recordingFile).where(eq(recordingFile.channelKey, channelKey)),
  ]);
  return toSessions(rows, fileUrls(files));
};

/**
 * Keep a chunk, and let go of the sessions that have fallen off the end —
 * files first, so a failed delete leaves a row pointing at a file rather
 * than a file nothing points at.
 */
export const addChunk = async (row: Omit<typeof recording.$inferInsert, "id" | "recordedAt">) => {
  const entry = { ...row, link: row.link ?? null, id: crypto.randomUUID(), recordedAt: Date.now() };
  if (db === undefined) {
    memRecordings.push(entry);
    return;
  }
  await db.insert(recording).values(entry).onConflictDoNothing();
  // Retention is by session, so it can only change when one begins.
  if (row.index !== 0) return;
  const starts = await db
    .select({ sessionId: recording.sessionId, startedAt: min(recording.recordedAt) })
    .from(recording)
    .where(eq(recording.channelKey, row.channelKey))
    .groupBy(recording.sessionId)
    .orderBy(desc(min(recording.recordedAt)));
  const dropped = starts.slice(KEPT_SESSIONS).map((session) => session.sessionId);
  if (dropped.length === 0) return;
  const [expired, expiredFiles] = await Promise.all([
    db
      .select({ id: recording.id, url: recording.url })
      .from(recording)
      .where(inArray(recording.sessionId, dropped)),
    db
      .select({ sessionId: recordingFile.sessionId, url: recordingFile.url })
      .from(recordingFile)
      .where(inArray(recordingFile.sessionId, dropped)),
  ]);
  const urls = [...expired.map((old) => old.url), ...expiredFiles.map((old) => old.url)];
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch {
    // Left for the next pass; the rows stay so the files are not forgotten.
    return;
  }
  for (const old of expired) await db.delete(recording).where(eq(recording.id, old.id));
  for (const old of expiredFiles) {
    await db.delete(recordingFile).where(eq(recordingFile.sessionId, old.sessionId));
  }
};

const sessionRows = async (channelKey: string, sessionId: string): Promise<Row[]> => {
  const rows =
    db === undefined
      ? memRecordings.filter((row) => row.channelKey === channelKey && row.sessionId === sessionId)
      : await db
          .select()
          .from(recording)
          .where(eq(recording.sessionId, sessionId))
          .then((found) => found.filter((row) => row.channelKey === channelKey));
  return rows.toSorted((a, b) => a.index - b.index);
};

const knownFile = async (sessionId: string): Promise<FileRow | undefined> => {
  if (db === undefined) return memFiles.find((file) => file.sessionId === sessionId);
  const rows = await db
    .select()
    .from(recordingFile)
    .where(eq(recordingFile.sessionId, sessionId))
    .limit(1);
  return rows[0];
};

const keepFile = async (file: FileRow): Promise<void> => {
  if (db === undefined) {
    memFiles.push(file);
    return;
  }
  await db
    .insert(recordingFile)
    .values(file)
    .onConflictDoUpdate({
      target: recordingFile.sessionId,
      set: { url: file.url, bytes: file.bytes, seconds: file.seconds, createdAt: file.createdAt },
    });
};

/**
 * A finished session as one file: its chunks fetched back in order, stitched
 * into the stream they were cut from, finalized as a file (sizes and duration
 * in), and stored under the session. Built once; asked for again, handed over.
 * The owner may ask the moment the recorder stops; anyone else only once the
 * session has been quiet long enough to be over.
 */
export const sessionFile = async (
  channelKey: string,
  sessionId: string,
  owner: boolean,
): Promise<{ url: string } | { refused: "unknown" | "on-air" }> => {
  const known = await knownFile(sessionId);
  if (known !== undefined) return { url: known.url };
  const rows = await sessionRows(channelKey, sessionId);
  if (rows[0]?.index !== 0) return { refused: "unknown" };
  const lastAt = rows.reduce((latest, row) => Math.max(latest, row.recordedAt), 0);
  if (!owner && Date.now() - lastAt < FILE_AFTER_MS) return { refused: "on-air" };

  const parts: Uint8Array[] = [];
  for (const row of rows) {
    const response = await fetch(row.url);
    if (!response.ok) throw new Error(`Chunk ${row.index} answered ${response.status}`);
    parts.push(new Uint8Array(await response.arrayBuffer()));
  }
  const stream = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    stream.set(part, offset);
    offset += part.length;
  }
  const seconds = rows.reduce((total, row) => total + row.seconds, 0);
  const bytes = finalizeWebm(stream, seconds);
  const stored = await put(
    filePath(channelKey, sessionId),
    new Blob([bytes], { type: "video/webm" }),
    {
      access: "public",
      contentType: "video/webm",
      addRandomSuffix: false,
      allowOverwrite: true,
    },
  );
  await keepFile({
    sessionId,
    channelKey,
    url: stored.url,
    bytes: bytes.length,
    seconds,
    createdAt: Date.now(),
  });
  return { url: stored.url };
};
