import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// One finished run as the mod posted it; the leaderboard is each name's best.
export const run = sqliteTable(
  "run",
  {
    coins: integer().notNull(),
    /** Unix ms. */
    endedAt: integer("ended_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    /** Who posted, for the rate limit: a hash of their IP and the day, never the IP. */
    poster: text(),
    seconds: integer().notNull(),
    tokens: integer().notNull(),
  },
  (table) => [
    index("run_name_tokens").on(table.name, table.tokens),
    index("run_poster_ended").on(table.poster, table.endedAt),
  ],
);
