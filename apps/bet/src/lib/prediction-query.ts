import { desc } from "drizzle-orm";

import { db } from "@/db/drizzle-client";

export async function getGroups() {
  return db.query.groups.findMany({
    with: { members: true },
    orderBy: (groups) => [desc(groups.createdAt)],
  });
}

export async function getGroupWithPredictions(groupId: number) {
  return db.query.groups.findFirst({
    where: (groups, { eq }) => eq(groups.id, groupId),
    with: {
      members: true,
      predictions: {
        with: { predictor: true },
        orderBy: (predictions) => [desc(predictions.madeAt)],
      },
    },
  });
}

export async function getAllPredictions() {
  return db.query.predictions.findMany({
    with: { predictor: true, group: true },
    orderBy: (predictions) => [desc(predictions.madeAt)],
  });
}

export async function getPredictionStats() {
  const predictions = await db.query.predictions.findMany({
    with: { predictor: true, group: true },
  });

  const byPredictor = new Map<
    number,
    {
      name: string;
      total: number;
      correct: number;
      wrong: number;
      pending: number;
      groups: Set<string>;
    }
  >();

  for (const p of predictions) {
    const existing = byPredictor.get(p.predictorId) ?? {
      name: p.predictor.name,
      total: 0,
      correct: 0,
      wrong: 0,
      pending: 0,
      groups: new Set<string>(),
    };
    existing.total++;
    existing[p.status]++;
    existing.groups.add(p.group.name);
    byPredictor.set(p.predictorId, existing);
  }

  return Array.from(byPredictor.entries()).map(([id, stats]) => ({
    memberId: id,
    name: stats.name,
    total: stats.total,
    correct: stats.correct,
    wrong: stats.wrong,
    pending: stats.pending,
    accuracy:
      stats.correct + stats.wrong > 0
        ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
        : null,
    groups: Array.from(stats.groups),
  }));
}
