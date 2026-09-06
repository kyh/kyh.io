import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db/drizzle-client";
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
  // Trends and a search run ~$0.06 a program before the hour-long caches, the
  // timeline fallback up to $0.75 an hour. Ten dollars is a long day of
  // several X channels, and a short one of something gone wrong.
  x: 10,
  gmail: undefined,
  rss: undefined,
  youtube: undefined,
} satisfies Record<SourceKind, number | undefined>;

export type CacheStore = {
  /** What is under `key`, if it is there and has not expired — parsed, since it comes back as data. */
  get<T>(key: string, schema: z.ZodType<T>): Promise<T | undefined>;
  set<T extends object>(key: string, value: T, ttlMs: number): Promise<void>;
};

export type SpendStore = {
  /** Dollars spent reading sources of `kind` since `since` (unix ms). */
  spent(kind: SourceKind, since: number): Promise<number>;
  /** A paid read on a channel, priced at what the API bills for what it returned. */
  record(kind: SourceKind, channelKey: string, usd: number, at?: number): Promise<void>;
};

/** The cache and the ledger together: what an adapter is handed. */
export type Reads = { cache: CacheStore; spend: SpendStore };

export const memoryReads = (): Reads => {
  const entries = new Map<string, { value: unknown; expiresAt: number }>();
  const ledger: { kind: SourceKind; channelKey: string; usd: number; at: number }[] = [];
  return {
    cache: {
      get: async (key, schema) => {
        const entry = entries.get(key);
        if (entry === undefined) return undefined;
        if (entry.expiresAt <= Date.now()) {
          entries.delete(key);
          return undefined;
        }
        const parsed = schema.safeParse(entry.value);
        return parsed.success ? parsed.data : undefined;
      },
      set: async (key, value, ttlMs) => {
        entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      },
    },
    spend: {
      spent: async (kind, since) =>
        ledger.reduce(
          (total, row) => (row.kind === kind && row.at >= since ? total + row.usd : total),
          0,
        ),
      record: async (kind, channelKey, usd, at = Date.now()) => {
        if (usd <= 0) return;
        ledger.push({ kind, channelKey, usd, at });
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
      const row = rows[0];
      if (row === undefined) return undefined;
      if (row.expiresAt <= Date.now()) {
        await database.delete(sourceCache).where(eq(sourceCache.key, key));
        return undefined;
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
        .values({ key, value, expiresAt })
        .onConflictDoUpdate({ target: sourceCache.key, set: { value, expiresAt } });
      // A key nobody asks for again — a trend that never comes back — would otherwise stay forever.
      await database.delete(sourceCache).where(lt(sourceCache.expiresAt, now));
    },
  },
  spend: {
    spent: async (kind, since) => {
      const rows = await database
        .select({ total: sql<number>`coalesce(sum(${sourceRead.usd}), 0)` })
        .from(sourceRead)
        .where(and(eq(sourceRead.kind, kind), gte(sourceRead.readAt, since)));
      return rows[0]?.total ?? 0;
    },
    record: async (kind, channelKey, usd, at = Date.now()) => {
      if (usd <= 0) return;
      await database
        .insert(sourceRead)
        .values({ id: crypto.randomUUID(), kind, channelKey, usd, readAt: at });
    },
  },
});
