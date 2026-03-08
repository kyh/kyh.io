import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { predictions, user } from "@/db/drizzle-schema";

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
  const rows = await db
    .select({
      userId: predictions.userId,
      name: user.name,
      total: sql<number>`count(*)`.as("total"),
      correct: sql<number>`sum(case when ${predictions.status} = 'correct' then 1 else 0 end)`.as("correct"),
      wrong: sql<number>`sum(case when ${predictions.status} = 'wrong' then 1 else 0 end)`.as("wrong"),
      pending: sql<number>`sum(case when ${predictions.status} = 'pending' then 1 else 0 end)`.as("pending"),
    })
    .from(predictions)
    .innerJoin(user, eq(predictions.userId, user.id))
    .groupBy(predictions.userId, user.name);

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    total: r.total,
    correct: r.correct,
    wrong: r.wrong,
    pending: r.pending,
    accuracy:
      r.correct + r.wrong > 0
        ? Math.round((r.correct / (r.correct + r.wrong)) * 100)
        : null,
  }));
}
