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

// The clip archive. A clip is global — one row per item ever generated — so an
// item is paid for at most once even when it appears on several channels. The
// daily generation cap and spacing guards are derived from `generatedAt`
// rather than kept in counters.
export const clip = sqliteTable("clip", {
  /**
   * `{kind}:{id inside the source}` — the kind is read off the prefix, see
   * itemKind in src/lib/sources/types.ts. The column name predates other
   * kinds, as do rows with a bare X post id.
   */
  itemId: text("post_id").primaryKey(),
  videoUrl: text("video_url").notNull(),
  text: text().notNull(),
  authorName: text("author_name").notNull(),
  /** An X handle, a sender address, a feed host, a channel name. */
  authorUsername: text("author_username").notNull(),
  authorImage: text("author_image"),
  itemCreatedAt: text("post_created_at"),
  score: integer().notNull(),
  /**
   * Final frame of this clip, as an image. The next program on the channel is
   * generated out of it, so one clip continues into the next instead of
   * cutting to an unrelated scene. Null for clips generated before this
   * existed, and whenever frame extraction failed.
   */
  lastFrameUrl: text("last_frame_url"),
  /** Unix ms. */
  generatedAt: integer("generated_at").notNull(),
});

// Which clips air on which channel, in air order. A channel is keyed by its
// source id; "owner" is the public channel, whose source is the env-configured
// owner rather than a `source` row.
export const channelClip = sqliteTable(
  "channel_clip",
  {
    channelKey: text("channel_key").notNull(),
    itemId: text("post_id")
      .notNull()
      .references(() => clip.itemId, { onDelete: "cascade" }),
    /** Unix ms. */
    addedAt: integer("added_at").notNull(),
    /**
     * Unix ms when the channel's owner pulled this program off the air. The
     * row stays: it is what stops the post being picked — and paid for —
     * a second time. Null means it is still in rotation.
     */
    hiddenAt: integer("hidden_at"),
  },
  (table) => [primaryKey({ columns: [table.channelKey, table.itemId] })],
);

// A channel's one generation in flight: claimed before fal is paid, released
// once the clip is archived. See channel.ts for the claim protocol.
export const pendingJob = sqliteTable("pending_job", {
  channelKey: text("channel_key").primaryKey(),
  /** Empty until fal has accepted the job. */
  requestId: text("request_id").notNull(),
  prompt: text().notNull(),
  /** The item being generated, as JSON. */
  itemJson: text("post_json").notNull(),
  /** Unix ms. */
  createdAt: integer("created_at").notNull(),
});

// A feed a user has connected. Each source is a channel in that user's lineup;
// the public channel is not a row here (see channel_clip). Sources backed by a
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
