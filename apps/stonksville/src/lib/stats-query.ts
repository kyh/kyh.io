import { cacheTag } from "next/cache";
import { eq } from "@/db";
import { db } from "@/db/drizzle-client";
import { userStats } from "@/db/drizzle-schema";
import { guessDistributionSchema } from "@/db/zod-schema";

import type { GuessDistribution } from "@/db/zod-schema";

export type UserStatsData = {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: GuessDistribution;
  lastPlayedDate: string | null;
};

export async function getUserStats(
  userId: string,
): Promise<UserStatsData | null> {
  "use cache";
  cacheTag("stats", `stats-${userId}`);

  const row = await db.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });

  if (!row) return null;

  const distribution = guessDistributionSchema.parse(
    JSON.parse(row.guessDistribution),
  );

  return {
    gamesPlayed: row.gamesPlayed,
    gamesWon: row.gamesWon,
    currentStreak: row.currentStreak,
    maxStreak: row.maxStreak,
    guessDistribution: distribution,
    lastPlayedDate: row.lastPlayedDate,
  };
}
