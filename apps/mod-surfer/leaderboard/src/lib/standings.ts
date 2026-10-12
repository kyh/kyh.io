import { count, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { run } from "@/db/schema";

import type { Run } from "./runs";

const LEADERBOARD_SIZE = 100;

const best = sql<number>`max(${run.tokens})`;

// SQLite fills the bare columns from the row max() picked: each player's best run.
export const standings = () =>
  db
    .select({
      coins: run.coins,
      endedAt: run.endedAt,
      name: run.name,
      seconds: run.seconds,
      tokens: best,
    })
    .from(run)
    .groupBy(run.name)
    .orderBy(desc(best))
    .limit(LEADERBOARD_SIZE);

export type Standing = Awaited<ReturnType<typeof standings>>[number];

// Saves the run; the answer is where its player now stands.
export const saveRun = async (posted: Run) => {
  await db.insert(run).values(posted);
  const bests = db
    .select({ best: best.as("best") })
    .from(run)
    .groupBy(run.name)
    .as("bests");
  const mine = db.select({ best }).from(run).where(eq(run.name, posted.name));
  const [row] = await db.select({ ahead: count() }).from(bests).where(gt(bests.best, mine));
  return (row?.ahead ?? 0) + 1;
};
