import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { z } from "zod";

import type { db } from "@/db/drizzle-client";
import { sourceCache, sourceRead } from "@/db/drizzle-schema";
import type { SourceKind } from "@/lib/source-kinds";

// What reading the sources remembers, and what it costs. The cache is shared
// by every instance of the server: X bills per post returned, so a page one
// instance bought must serve the rest, or each cold start buys it again. The
// ledger is what the read budget is counted from — X is the only source that
// bills, and the console's spending cap is the backstop behind this, not the
// guard.

/** What a day of reads may cost, per kind; undefined is free, and only X bills. */
export const DAILY_READ_BUDGET_USD = {
  gmail: undefined,
  rss: undefined,
  // Trends and a search run ~$0.06 a program before the hour-long caches, the
  // timeline fallback up to $0.75 an hour. Ten dollars is a long day of
  // several X channels, and a short one of something gone wrong.
  x: 10,
  youtube: undefined,
} satisfies Record<SourceKind, number | undefined>;

export interface CacheStore {
  /** What is under `key`, if it is there and has not expired — parsed, since it comes back as data. */
  get: <T>(key: string, schema: z.ZodType<T>) => Promise<T | undefined>;
  set: <T extends object>(key: string, value: T, ttlMs: number) => Promise<void>;
}

export interface SpendStore {
  /** Dollars spent reading sources of `kind` since `since` (unix ms). */
  spent: (kind: SourceKind, since: number) => Promise<number>;
  /** A paid read on a channel, priced at what the API bills for what it returned. */
  record: (kind: SourceKind, channelKey: string, usd: number, at?: number) => Promise<void>;
}

/** The cache and the ledger together: what an adapter is handed. */
export interface Reads {
  cache: CacheStore;
  spend: SpendStore;
}

export const memoryReads = (): Reads => {
  const entries = new Map<string, { value: unknown; expiresAt: number }>();
  const ledger: { kind: SourceKind; channelKey: string; usd: number; at: number }[] = [];
  const lookup = <T>(key: string, schema: z.ZodType<T>): T | undefined => {
    const entry = entries.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    const parsed = schema.safeParse(entry.value);
    return parsed.success ? parsed.data : undefined;
  };
  return {
    cache: {
      get: (key, schema) => Promise.resolve(lookup(key, schema)),
      set: (key, value, ttlMs) => {
        entries.set(key, { expiresAt: Date.now() + ttlMs, value });
        return Promise.resolve();
      },
    },
    spend: {
      record: (kind, channelKey, usd, at = Date.now()) => {
        if (usd > 0) {
          ledger.push({ at, channelKey, kind, usd });
        }
        return Promise.resolve();
      },
      spent: (kind, since) => {
        let total = 0;
        for (const row of ledger) {
          if (row.kind === kind && row.at >= since) {
            total += row.usd;
          }
        }
        return Promise.resolve(total);
      },
    },
  };
};

export const databaseReads = (database: NonNullable<typeof db>): Reads => ({
  cache: {
    get: async (key, schema) => {
      const rows = await database
        .select()
        .from(sourceCache)
        .where(eq(sourceCache.key, key))
        .limit(1);
      const [row] = rows;
      if (row === undefined) {
        return;
      }
      if (row.expiresAt <= Date.now()) {
        await database.delete(sourceCache).where(eq(sourceCache.key, key));
        return;
      }
      // A shape left by an earlier deploy is a miss, not a crash.
      const parsed = schema.safeParse(row.value);
      return parsed.success ? parsed.data : undefined;
    },
    set: async (key, value, ttlMs) => {
      const now = Date.now();
      const expiresAt = now + ttlMs;
      await database
        .insert(sourceCache)
        .values({ expiresAt, key, value })
        .onConflictDoUpdate({ set: { expiresAt, value }, target: sourceCache.key });
      // A key nobody asks for again — a trend that never comes back — would otherwise stay forever.
      await database.delete(sourceCache).where(lt(sourceCache.expiresAt, now));
    },
  },
  spend: {
    record: async (kind, channelKey, usd, at = Date.now()) => {
      if (usd <= 0) {
        return;
      }
      await database
        .insert(sourceRead)
        .values({ channelKey, id: crypto.randomUUID(), kind, readAt: at, usd });
    },
    spent: async (kind, since) => {
      const rows = await database
        .select({ total: sql<number>`coalesce(sum(${sourceRead.usd}), 0)` })
        .from(sourceRead)
        .where(and(eq(sourceRead.kind, kind), gte(sourceRead.readAt, since)));
      return rows[0]?.total ?? 0;
    },
  },
});
