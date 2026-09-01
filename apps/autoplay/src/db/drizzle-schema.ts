import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// The clip archive. A clip is global — one row per post ever generated — so a
// post is paid for at most once even when it appears in several feeds. The
// daily generation cap and spacing guards are derived from `generatedAt`
// rather than kept in counters.
export const clip = sqliteTable("clip", {
  postId: text("post_id").primaryKey(),
  videoUrl: text("video_url").notNull(),
  text: text().notNull(),
  authorName: text("author_name").notNull(),
  authorUsername: text("author_username").notNull(),
  authorImage: text("author_image"),
  postCreatedAt: text("post_created_at"),
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

// Which clips air on which channel ("owner" or `u:{userId}`), in air order.
export const channelClip = sqliteTable(
  "channel_clip",
  {
    channelKey: text("channel_key").notNull(),
    postId: text("post_id")
      .notNull()
      .references(() => clip.postId, { onDelete: "cascade" }),
    /** Unix ms. */
    addedAt: integer("added_at").notNull(),
    /**
     * Unix ms when the channel's owner pulled this program off the air. The
     * row stays: it is what stops the post being picked — and paid for —
     * a second time. Null means it is still in rotation.
     */
    hiddenAt: integer("hidden_at"),
  },
  (table) => [primaryKey({ columns: [table.channelKey, table.postId] })],
);

// A generation a slower model left unfinished — already paid for, so it is
// resumed on a later request instead of abandoned. One in flight per channel.
export const pendingJob = sqliteTable("pending_job", {
  channelKey: text("channel_key").primaryKey(),
  requestId: text("request_id").notNull(),
  prompt: text().notNull(),
  postJson: text("post_json").notNull(),
  /** Unix ms. */
  createdAt: integer("created_at").notNull(),
});
