"use server";

import { updateTag } from "next/cache";
import { eq } from "@/db";
import { db } from "@/db/drizzle-client";
import { userStats } from "@/db/drizzle-schema";
import { guessDistributionSchema } from "@/db/zod-schema";

import { getSession } from "@/lib/auth";
import { getTodayDateString } from "@/lib/puzzle-query";

export async function recordResult(
  won: boolean,
  guessCount: number,
): Promise<void> {
  const session = await getSession();
  if (!session?.user) return;

  const userId = session.user.id;
  const today = await getTodayDateString();

  const existing = await db.query.userStats.findFirst({
    where: eq(userStats.userId, userId),
  });

  if (!existing) {
    const distribution: Record<string, number> = {};
    if (won) {
      distribution[String(guessCount)] = 1;
    }

    await db.insert(userStats).values({
      userId,
      gamesPlayed: 1,
      gamesWon: won ? 1 : 0,
      currentStreak: won ? 1 : 0,
      maxStreak: won ? 1 : 0,
      guessDistribution: JSON.stringify(distribution),
      lastPlayedDate: today,
    });
    updateTag(`stats-${userId}`);
    return;
  }

  // Don't double-count same day
  if (existing.lastPlayedDate === today) return;

  const dist = guessDistributionSchema.parse(
    JSON.parse(existing.guessDistribution),
  );

  if (won) {
    const key = String(guessCount) as keyof typeof dist;
    dist[key] = (dist[key] ?? 0) + 1;
  }

  // Streak: continues if last played was yesterday
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const streakContinues = existing.lastPlayedDate === yesterdayStr;

  const newStreak = won ? (streakContinues ? existing.currentStreak + 1 : 1) : 0;
  const newMax = Math.max(existing.maxStreak, newStreak);

  await db
    .update(userStats)
    .set({
      gamesPlayed: existing.gamesPlayed + 1,
      gamesWon: existing.gamesWon + (won ? 1 : 0),
      currentStreak: newStreak,
      maxStreak: newMax,
      guessDistribution: JSON.stringify(dist),
      lastPlayedDate: today,
    })
    .where(eq(userStats.userId, userId));

  updateTag(`stats-${userId}`);
}
