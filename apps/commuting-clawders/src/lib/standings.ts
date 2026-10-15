import { and, count, countDistinct, desc, eq, gt, sql } from "drizzle-orm";

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

// Everything every run has come to, for the page's HUD.
export const totals = async () => {
  const [row] = await db
    .select({
      coins: sql<number>`coalesce(sum(${run.coins}), 0)`,
      players: countDistinct(run.name),
      tokens: sql<number>`coalesce(sum(${run.tokens}), 0)`,
    })
    .from(run);
  return row ?? { coins: 0, players: 0, tokens: 0 };
};

export type Totals = Awaited<ReturnType<typeof totals>>;

const POSTS_PER_WINDOW = 20;
const WINDOW_MS = 10 * 60 * 1000;

// Whether this poster has room for another run: a finished run takes at least
// the 5s grace, so 20 in 10 minutes is far past any real player.
export const canPost = async (poster: string) => {
  const [row] = await db
    .select({ recent: count() })
    .from(run)
    .where(and(eq(run.poster, poster), gt(run.endedAt, Date.now() - WINDOW_MS)));
  return (row?.recent ?? 0) < POSTS_PER_WINDOW;
};

// Saves the run; the answer is where its player now stands.
export const saveRun = async (posted: Run, poster: string) => {
  await db.insert(run).values({ ...posted, poster });
  const bests = db
    .select({ best: best.as("best") })
    .from(run)
    .groupBy(run.name)
    .as("bests");
  const mine = db.select({ best }).from(run).where(eq(run.name, posted.name));
  const [row] = await db.select({ ahead: count() }).from(bests).where(gt(bests.best, mine));
  return (row?.ahead ?? 0) + 1;
};
