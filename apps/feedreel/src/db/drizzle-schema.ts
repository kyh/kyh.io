import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
