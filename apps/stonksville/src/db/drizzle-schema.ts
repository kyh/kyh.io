/**
 * Application schema
 */
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

import { user } from "./drizzle-schema-auth";

export const company = sqliteTable("company", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ticker: text("ticker"),
  name: text("name").notNull(),
  sector: text("sector").notNull(),
  marketCap: integer("market_cap").notNull(),
  employees: integer("employees").notNull(),
  ipoYear: integer("ipo_year").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const puzzle = sqliteTable("puzzle", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  date: text("date").notNull().unique(),
  type: text("type").notNull(),
  answerCompanyId: text("answer_company_id")
    .notNull()
    .references(() => company.id),
  puzzleData: text("puzzle_data").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const guess = sqliteTable(
  "guess",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    puzzleId: text("puzzle_id")
      .notNull()
      .references(() => puzzle.id),
    userId: text("user_id").references(() => user.id),
    guessedCompanyId: text("guessed_company_id")
      .notNull()
      .references(() => company.id),
    guessNumber: integer("guess_number").notNull(),
    feedback: text("feedback"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("guess_puzzleId_idx").on(table.puzzleId),
    index("guess_userId_idx").on(table.userId),
  ],
);

export const userStats = sqliteTable("user_stats", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id),
  gamesPlayed: integer("games_played").notNull().default(0),
  gamesWon: integer("games_won").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  guessDistribution: text("guess_distribution").notNull().default("{}"),
  lastPlayedDate: text("last_played_date"),
});

export const puzzleRelations = relations(puzzle, ({ one, many }) => ({
  answerCompany: one(company, {
    fields: [puzzle.answerCompanyId],
    references: [company.id],
  }),
  guesses: many(guess),
}));

export const guessRelations = relations(guess, ({ one }) => ({
  puzzle: one(puzzle, {
    fields: [guess.puzzleId],
    references: [puzzle.id],
  }),
  user: one(user, {
    fields: [guess.userId],
    references: [user.id],
  }),
  company: one(company, {
    fields: [guess.guessedCompanyId],
    references: [company.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(user, {
    fields: [userStats.userId],
    references: [user.id],
  }),
}));
