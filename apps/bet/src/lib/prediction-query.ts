import { desc } from "drizzle-orm";

import { db } from "@/db/drizzle-client";

export async function getUsers() {
  return db.query.user.findMany({
    orderBy: (user) => [desc(user.createdAt)],
  });
}

export async function getAllPredictions() {
  return db.query.predictions.findMany({
    with: { user: true },
    orderBy: (predictions) => [desc(predictions.madeAt)],
  });
}

export async function getPredictionStats() {
  const predictions = await db.query.predictions.findMany({
    with: { user: true },
  });

  const byUser = new Map<
    string,
    {
      name: string;
      total: number;
      correct: number;
      wrong: number;
      pending: number;
    }
  >();

  for (const p of predictions) {
    const existing = byUser.get(p.userId) ?? {
      name: p.user.name,
      total: 0,
      correct: 0,
      wrong: 0,
      pending: 0,
    };
    existing.total++;
    existing[p.status]++;
    byUser.set(p.userId, existing);
  }

  return Array.from(byUser.entries()).map(([id, stats]) => ({
    userId: id,
    name: stats.name,
    total: stats.total,
    correct: stats.correct,
    wrong: stats.wrong,
    pending: stats.pending,
    accuracy:
      stats.correct + stats.wrong > 0
        ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
        : null,
  }));
}
