import { and, asc, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/drizzle-client";
import { account, source } from "@/db/drizzle-schema";
import type { ChannelSummary } from "@/lib/api-contract";
import { env } from "@/lib/env";
import { googleAccessToken } from "@/lib/grants";
import type { BudgetViewer } from "@/lib/live";
import { GOOGLE_SOURCES, OWNER_SOURCE_ID } from "@/lib/source-kinds";
import type { SourceKind } from "@/lib/source-kinds";
import { fetchFeed } from "@/lib/sources/rss";
import type { SourceAccess } from "@/lib/sources/types";
import { freshXAccount } from "@/lib/x-account";

// A viewer's lineup. CH 01 is the public channel — the env-configured owner's
// X, no row needed — and every channel after it is one of the viewer's own
// `source` rows in position order. Sources with a grant behind them are
// derived from the grant, so connecting Gmail is all it takes to get a
// channel; a feed URL is the one source added by hand.

/** The signed-in user, as much of it as the lineup needs. Null for a visitor. */
export type Viewer = { user: { id: string; username?: string | null } } | null;

/**
 * A channel as this viewer may watch it. "live" means their watching runs a
 * session: it is their source, read with their grant. Anyone else on the
 * public channel gets the replay, and a grant that no longer works says why.
 */
export type ResolvedSource =
  | { mode: "live"; channelKey: string; kind: SourceKind; access: SourceAccess }
  | { mode: "replay"; channelKey: string; kind: SourceKind }
  | { mode: "off-air"; channelKey: string; kind: SourceKind; reason: string };

const rssConfigSchema = z.object({ url: z.string(), title: z.string() });

type SourceRow = typeof source.$inferSelect;

export const isOwnerHandle = (username: string | null | undefined): boolean =>
  username !== undefined &&
  username !== null &&
  env.OWNER_X_USERNAME !== undefined &&
  username.toLowerCase() === env.OWNER_X_USERNAME.toLowerCase();

/** The same viewer as the budgets see them. */
export const budgetViewerOf = (viewer: NonNullable<Viewer>): BudgetViewer => ({
  userId: viewer.user.id,
  owner: isOwnerHandle(viewer.user.username),
});

const ownerChannel = (owner: boolean): ChannelSummary => ({
  number: 1,
  sourceId: OWNER_SOURCE_ID,
  kind: "x",
  label: env.OWNER_X_USERNAME === undefined ? "public access" : `@${env.OWNER_X_USERNAME}`,
  mode: owner ? "live" : "replay",
});

const toChannel = (row: SourceRow, number: number): ChannelSummary => ({
  number,
  sourceId: row.id,
  kind: row.kind,
  label: row.label,
  mode: "live",
});

type NewSource = {
  kind: SourceKind;
  key: string;
  label: string;
  accountId?: string;
  config?: string;
};

/**
 * Idempotent: the unique (user, key) index makes a repeat a no-op but for the
 * label and settings, which follow the code and the grant — a rename here or
 * on X reaches the lineup on the next load. A removed source is not
 * resurrected — the row still exists, removed — except by `addRssSource`,
 * which is the user asking for it back.
 */
const insertSource = async (
  database: NonNullable<typeof db>,
  userId: string,
  entry: NewSource,
): Promise<void> => {
  const rows = await database
    .select({ last: max(source.position) })
    .from(source)
    .where(eq(source.userId, userId));
  await database
    .insert(source)
    .values({
      id: crypto.randomUUID(),
      userId,
      kind: entry.kind,
      accountId: entry.accountId ?? null,
      config: entry.config ?? null,
      label: entry.label,
      key: entry.key,
      position: (rows[0]?.last ?? 0) + 1,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [source.userId, source.key],
      set: { label: entry.label, config: entry.config ?? null },
    });
};

const grantedScopes = (scope: string | null): string[] => (scope ?? "").split(/[,\s]+/);

/**
 * The sources a user's grants imply. Their X is a source unless it is the
 * owner's, which is CH 01 already; a Google grant is a source per scope it
 * carries, so one consent can add two channels.
 */
export const ensureSources = async (viewer: NonNullable<Viewer>): Promise<void> => {
  if (db === undefined) return;
  const accounts = await db.select().from(account).where(eq(account.userId, viewer.user.id));
  const wanted: NewSource[] = [];
  for (const row of accounts) {
    if (row.providerId === "twitter" && !isOwnerHandle(viewer.user.username)) {
      const username = viewer.user.username;
      wanted.push({
        kind: "x",
        accountId: row.id,
        key: `x:${row.accountId}`,
        label: username === undefined || username === null ? "your X" : `@${username}`,
      });
    }
    if (row.providerId === "google") {
      const scopes = grantedScopes(row.scope);
      for (const entry of GOOGLE_SOURCES) {
        if (!scopes.includes(entry.scope)) continue;
        wanted.push({
          kind: entry.kind,
          accountId: row.id,
          key: `${entry.kind}:${row.accountId}`,
          label: entry.label,
        });
      }
    }
  }
  for (const entry of wanted) await insertSource(db, viewer.user.id, entry);
};

export const listChannels = async (viewer: Viewer): Promise<ChannelSummary[]> => {
  const channels = [ownerChannel(viewer !== null && isOwnerHandle(viewer.user.username))];
  if (viewer === null || db === undefined) return channels;
  const rows = await db
    .select()
    .from(source)
    .where(and(eq(source.userId, viewer.user.id), isNull(source.removedAt)))
    .orderBy(asc(source.position));
  for (const row of rows) channels.push(toChannel(row, channels.length + 1));
  return channels;
};

const parseRssConfig = (row: SourceRow): z.infer<typeof rssConfigSchema> | undefined => {
  try {
    const parsed = rssConfigSchema.safeParse(JSON.parse(row.config ?? "null"));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

/** What reading a source came to: the access to read it with, or why there is none. */
type Access = { access: SourceAccess } | { noAccessReason: string };

const xAccess = async (userId: string): Promise<Access> => {
  const grant = await freshXAccount(userId);
  return grant === undefined
    ? { noAccessReason: "X connection expired — sign in again" }
    : { access: { kind: "x", accessToken: grant.accessToken, xUserId: grant.xUserId } };
};

const accessFor = async (row: SourceRow, userId: string): Promise<Access> => {
  switch (row.kind) {
    case "x":
      return xAccess(userId);
    case "gmail":
    case "youtube": {
      const accessToken =
        row.accountId === null ? undefined : await googleAccessToken(row.accountId, userId);
      return accessToken === undefined
        ? { noAccessReason: "Google connection expired — reconnect it in sources" }
        : { access: { kind: row.kind, accessToken } };
    }
    case "rss": {
      const config = parseRssConfig(row);
      return config === undefined
        ? { noAccessReason: "This feed's settings are unreadable — remove and re-add it" }
        : { access: { kind: "rss", url: config.url } };
    }
  }
};

const resolved = (channelKey: string, kind: SourceKind, outcome: Access): ResolvedSource =>
  "access" in outcome
    ? { mode: "live", channelKey, kind, access: outcome.access }
    : { mode: "off-air", channelKey, kind, reason: outcome.noAccessReason };

/**
 * The channel behind a source id, as this viewer may use it. The public
 * channel resolves for everyone; a `source` row only for the user it belongs
 * to — a lineup is private, so someone else's id is simply not found.
 */
export const resolveSource = async (
  sourceId: string,
  viewer: Viewer,
): Promise<ResolvedSource | undefined> => {
  if (sourceId === OWNER_SOURCE_ID) {
    if (viewer === null || !isOwnerHandle(viewer.user.username)) {
      return { mode: "replay", channelKey: OWNER_SOURCE_ID, kind: "x" };
    }
    return resolved(OWNER_SOURCE_ID, "x", await xAccess(viewer.user.id));
  }
  if (viewer === null || db === undefined) return undefined;
  const rows = await db
    .select()
    .from(source)
    .where(
      and(eq(source.id, sourceId), eq(source.userId, viewer.user.id), isNull(source.removedAt)),
    )
    .limit(1);
  const row = rows[0];
  if (row === undefined) return undefined;
  return resolved(row.id, row.kind, await accessFor(row, viewer.user.id));
};

/**
 * A feed URL as a channel. The feed is fetched and parsed here, so a bad URL
 * is an error now rather than a channel that is forever OFF AIR. Re-adding a
 * removed feed puts it back rather than failing on the unique key.
 */
export const addRssSource = async (viewer: NonNullable<Viewer>, url: string): Promise<void> => {
  if (db === undefined) return;
  const feed = await fetchFeed(url);
  const key = `rss:${url}`;
  await insertSource(db, viewer.user.id, {
    kind: "rss",
    key,
    label: feed.title,
    config: JSON.stringify({ url, title: feed.title }),
  });
  await db
    .update(source)
    .set({ removedAt: null })
    .where(and(eq(source.userId, viewer.user.id), eq(source.key, key)));
};

export const removeSource = async (
  viewer: NonNullable<Viewer>,
  sourceId: string,
): Promise<void> => {
  if (db === undefined) return;
  await db
    .update(source)
    .set({ removedAt: Date.now() })
    .where(and(eq(source.id, sourceId), eq(source.userId, viewer.user.id)));
};

/** Ids not in `order` keep their positions; the ones given are renumbered from 1. */
export const reorderSources = async (
  viewer: NonNullable<Viewer>,
  order: string[],
): Promise<void> => {
  if (db === undefined) return;
  for (const [index, sourceId] of order.entries()) {
    await db
      .update(source)
      .set({ position: index + 1 })
      .where(and(eq(source.id, sourceId), eq(source.userId, viewer.user.id)));
  }
};
