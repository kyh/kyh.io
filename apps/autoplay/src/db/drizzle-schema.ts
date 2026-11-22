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
  (t) => [index("account_user_provider_idx").on(t.userId, t.providerId)],
);

export const verification = sqliteTable("verification", {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  id: text().primaryKey(),
  identifier: text().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  value: text().notNull(),
});

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
    index("recording_channel_recorded_idx").on(table.channelKey, table.recordedAt),
  ],
);

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

export const sourceCache = sqliteTable("source_cache", {
  /** Unix ms. */
  expiresAt: integer("expires_at").notNull(),
  key: text().primaryKey(),
  value: text({ mode: "json" }).notNull(),
});

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
