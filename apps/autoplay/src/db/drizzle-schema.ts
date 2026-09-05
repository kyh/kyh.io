import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { SOURCE_KINDS } from "@/lib/source-kinds";

// better-auth tables (same shape as policingice's, plus `username`: the X
// handle mapped from the profile at sign-in, used for the owner check and
// the OSD without spending X API reads).
export const user = sqliteTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text(),
  username: text(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text().primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text().notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable(
  "account",
  {
    id: text().primaryKey(),
    issuer: text().notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text(),
    password: text(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("account_issuer_accountId_uidx").on(t.issuer, t.accountId)],
);

export const verification = sqliteTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// What a channel has aired. A program is a prompt streamed through the
// director model, not a file, so there is nothing to replay from here — but
// the item is spent all the same, and this is what keeps it from airing
// twice. The daily budgets are derived from `aired_at`, so no counters drift.
export const airedItem = sqliteTable(
  "aired_item",
  {
    channelKey: text("channel_key").notNull(),
    /** `{kind}:{id inside the source}` — see itemKind in src/lib/sources/types.ts. */
    itemId: text("item_id").notNull(),
    /** Who was watching when it aired; what their daily budget is counted from. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Unix ms. */
    airedAt: integer("aired_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.channelKey, table.itemId] })],
);

// The public channel's stream, recorded in the owner's browser while it was
// live and kept so that everyone else has something to watch. One row per
// ten-second chunk of one continuous recording per session; a replay appends
// a session's chunks back into a single stream. Files live in Vercel Blob.
export const recording = sqliteTable(
  "recording",
  {
    id: text().primaryKey(),
    channelKey: text("channel_key").notNull(),
    /** One live session, one recording; chunks share it. */
    sessionId: text("session_id").notNull(),
    /** Position in the session's stream; chunk 0 carries the container header. */
    index: integer().notNull(),
    url: text().notNull(),
    /** The format the session was opened on, so a replay can say what it is. */
    formatLabel: text("format_label").notNull(),
    /** The program on air when the chunk began, for the ticker. */
    itemId: text("item_id").notNull(),
    text: text().notNull(),
    authorName: text("author_name").notNull(),
    authorUsername: text("author_username").notNull(),
    seconds: integer().notNull(),
    bytes: integer().notNull(),
    /** Unix ms. */
    recordedAt: integer("recorded_at").notNull(),
  },
  (table) => [uniqueIndex("recording_session_index_uidx").on(table.sessionId, table.index)],
);

// A feed a user has connected. Each source is a channel in that user's lineup;
// the public channel is not a row here (see lineup.ts). Sources backed by a
// grant are created from the grant — see lineup.ts — so a row exists for as
// long as the grant does, and `removed_at` is what takes it off the lineup.
export const source = sqliteTable(
  "source",
  {
    id: text().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text({ enum: SOURCE_KINDS }).notNull(),
    /** The better-auth account the source reads with; null for a feed URL. */
    accountId: text("account_id").references(() => account.id, { onDelete: "cascade" }),
    /** Per-kind settings as JSON, parsed at the boundary: the URL and title of a feed. */
    config: text(),
    label: text().notNull(),
    /** What makes the source unique for its user: the grant it reads, or the URL. */
    key: text().notNull(),
    position: integer().notNull(),
    /** Unix ms. */
    createdAt: integer("created_at").notNull(),
    /** Unix ms when the user took the channel off their lineup. */
    removedAt: integer("removed_at"),
  },
  (table) => [uniqueIndex("source_user_key_uidx").on(table.userId, table.key)],
);
