import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { SOURCE_KINDS } from "@/lib/source-kinds";

// better-auth tables (same shape as policingice's, plus `username`: the X
// handle mapped from the profile at sign-in, used for the owner check and
// the OSD without spending X API reads).
export const user = sqliteTable("user", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  email: text().notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  id: text().primaryKey(),
  image: text(),
  /** The invite this user came in on; written by the sign-up hook, never by input. */
  invitedByCode: text("invited_by_code"),
  name: text().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  username: text(),
});

export const session = sqliteTable("session", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text().primaryKey(),
  ipAddress: text("ip_address"),
  token: text().notNull().unique(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    accountId: text("account_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    id: text().primaryKey(),
    idToken: text("id_token"),
    issuer: text().notNull(),
    password: text(),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("account_issuer_accountId_uidx").on(t.issuer, t.accountId),
    // Every grant read is by user and provider: the X token per program, the Google grants per session load.
    index("account_user_provider_idx").on(t.userId, t.providerId),
  ],
);

export const verification = sqliteTable("verification", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text().primaryKey(),
  identifier: text().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  value: text().notNull(),
});

// Invite codes, the door to the station. Sign-in is X, but an account is
// created only for a browser that gave a code with capacity left. Claiming a
// use is one conditional UPDATE, so two sign-ups on the same last use cannot
// both succeed; `user.invitedByCode` records which code each viewer redeemed,
// which is how a code's usage is read. Minted with scripts/create-invite.ts.
export const inviteCode = sqliteTable("invite_code", {
  /** Upper case, from an alphabet without 0/O/1/I. */
  code: text().notNull().unique(),
  /** Unix ms. */
  createdAt: integer("created_at").notNull(),
  /** Unix ms, or null for never. */
  expiresAt: integer("expires_at"),
  id: text().primaryKey(),
  /** Uses before exhaustion; null means unlimited. */
  maxUses: integer("max_uses"),
  note: text(),
  /** Unix ms when it was withdrawn. */
  revokedAt: integer("revoked_at"),
  usedCount: integer("used_count").notNull().default(0),
});

// What a channel has aired. A program is a prompt streamed through the
// director model, not a file, so there is nothing to replay from here — but
// the item is spent all the same, and this is what keeps it from airing
// twice.
export const airedItem = sqliteTable(
  "aired_item",
  {
    /** Unix ms. */
    airedAt: integer("aired_at").notNull(),
    channelKey: text("channel_key").notNull(),
    /** `{kind}:{id inside the source}` — see itemKind in src/lib/sources/types.ts. */
    itemId: text("item_id").notNull(),
    /** Who was watching when it aired; what their daily budget is counted from. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.channelKey, table.itemId] })],
);

// The meter. A director session as the proxy saw fal open it for a viewer,
// and the last heartbeat it relayed: fal bills a session from the moment it
// exists, a minute at least, until its heartbeats stop, and this is what the
// daily budgets in src/lib/live.ts are counted from.
export const liveSession = sqliteTable(
  "live_session",
  {
    /** fal's own id for the session, which its heartbeats carry. */
    id: text().primaryKey(),
    /** Unix ms of the last heartbeat relayed. */
    seenAt: integer("seen_at").notNull(),
    /** Unix ms. */
    startedAt: integer("started_at").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("live_session_started_idx").on(table.startedAt)],
);

// The public channel's stream, recorded in the owner's browser while it was
// live and kept so that everyone else has something to watch. One row per
// ten-second chunk of one continuous recording per session; a replay appends
// a session's chunks back into a single stream. Files live in Vercel Blob.
export const recording = sqliteTable(
  "recording",
  {
    authorName: text("author_name").notNull(),
    authorUsername: text("author_username").notNull(),
    bytes: integer().notNull(),
    channelKey: text("channel_key").notNull(),
    /** The format the session was opened on, so a replay can say what it is. */
    formatLabel: text("format_label").notNull(),
    id: text().primaryKey(),
    /** Position in the session's stream; chunk 0 carries the container header. */
    index: integer().notNull(),
    /** The program on air when the chunk began, for the ticker. */
    itemId: text("item_id").notNull(),
    link: text(),
    /** Unix ms. */
    recordedAt: integer("recorded_at").notNull(),
    seconds: integer().notNull(),
    /** One live session, one recording; chunks share it. */
    sessionId: text("session_id").notNull(),
    text: text().notNull(),
    url: text().notNull(),
  },
  (table) => [
    uniqueIndex("recording_session_index_uidx").on(table.sessionId, table.index),
    // A replay lists a channel newest first, every few seconds while it tails a session.
    index("recording_channel_recorded_idx").on(table.channelKey, table.recordedAt),
  ],
);

// A feed a user has connected. Each source is a channel in that user's lineup;
// the public channel is not a row here (see lineup.ts). Sources backed by a
// grant are created from the grant — see lineup.ts — so a row exists for as
// long as the grant does, and `removed_at` is what takes it off the lineup.
export const source = sqliteTable(
  "source",
  {
    /** The better-auth account the source reads with; null for a feed URL. */
    accountId: text("account_id").references(() => account.id, { onDelete: "cascade" }),
    /** Per-kind settings as JSON, parsed at the boundary: the URL and title of a feed. */
    config: text(),
    /** Unix ms. */
    createdAt: integer("created_at").notNull(),
    id: text().primaryKey(),
    /** What makes the source unique for its user: the grant it reads, or the URL. */
    key: text().notNull(),
    kind: text({ enum: SOURCE_KINDS }).notNull(),
    label: text().notNull(),
    position: integer().notNull(),
    /** Unix ms when the user took the channel off their lineup. */
    removedAt: integer("removed_at"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("source_user_key_uidx").on(table.userId, table.key)],
);

// What reading the sources remembered: a page of X, a list of trends, a
// feed's items, kept under a key until it expires. One table for every
// instance of the server, because X bills per post returned — a page one
// instance bought must serve the rest (src/lib/reads.ts).
export const sourceCache = sqliteTable("source_cache", {
  /** Unix ms. */
  expiresAt: integer("expires_at").notNull(),
  key: text().primaryKey(),
  value: text({ mode: "json" }).notNull(),
});

// What reading the sources cost: one row per paid API call, priced at what
// the API bills for what it returned. The daily read budget in
// src/lib/reads.ts is counted from here; the console's spending cap is the
// backstop behind it, not the guard.
export const sourceRead = sqliteTable(
  "source_read",
  {
    /** The channel whose program bought it. */
    channelKey: text("channel_key").notNull(),
    id: text().primaryKey(),
    kind: text({ enum: SOURCE_KINDS }).notNull(),
    /** Unix ms. */
    readAt: integer("read_at").notNull(),
    usd: real().notNull(),
  },
  (table) => [index("source_read_kind_read_idx").on(table.kind, table.readAt)],
);

// A finished session as one file, for browsers that cannot append a stream —
// Safari, and every browser on an iPhone. Built from the session's chunks once
// the last one is in, or the first time someone asks (src/lib/recordings.ts),
// and kept as long as the chunks are.
export const recordingFile = sqliteTable(
  "recording_file",
  {
    bytes: integer().notNull(),
    channelKey: text("channel_key").notNull(),
    /** Unix ms. */
    createdAt: integer("created_at").notNull(),
    seconds: real().notNull(),
    sessionId: text("session_id").primaryKey(),
    url: text().notNull(),
  },
  (table) => [index("recording_file_channel_idx").on(table.channelKey)],
);
