import { and, eq, gte } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { airedItem, liveSession } from "@/db/drizzle-schema";
import { dayStart, today } from "@/lib/day";
import { buildOpeningPrompt, buildSegmentPrompt, pickFormat } from "@/lib/prompt";
import { DAILY_READ_BUDGET_USD, databaseReads, memoryReads } from "@/lib/reads";
import type { Reads } from "@/lib/reads";
import { SOURCE_KIND_NAMES } from "@/lib/source-kinds";
import { pickCandidate } from "@/lib/sources";
import type { SourceAccess } from "@/lib/sources/types";
import type { LivePayload } from "@/lib/api-contract";

const LIST_USD_PER_SECOND = 0.08;
const PROMO_USD_PER_SECOND = 0.02;
const PROMO_LAST_DAY = "2026-09-14";

/** A session is billed at least this long the moment it exists. */
export const MIN_BILLED_SECONDS = 60;

/** What one signed-in viewer may spend a day on their own channels. */
export const DAILY_BUDGET_USD_PER_VIEWER = 20;

/** What the whole station may spend a day, the owner's CH 01 included. */
export const DAILY_BUDGET_USD = 50;
const OVERRUN_GRACE_SECONDS = 60;

export const usdPerSecond = (day: string = today()) =>
  day <= PROMO_LAST_DAY ? PROMO_USD_PER_SECOND : LIST_USD_PER_SECOND;

export interface BudgetViewer {
  userId: string;
  owner: boolean;
}

/** Where aired items are kept: the database, or memory while there is none. */
export interface AiredStore {
  aired: (channelKey: string) => Promise<Set<string>>;
  mark: (channelKey: string, itemId: string, userId: string) => Promise<void>;
}

/** Whose session, when it was opened, and when it was last heard from. */
export interface SessionSpan {
  userId: string;
  startedAt: number;
  seenAt: number;
}

/** Where the meter's sessions are kept: the database, or memory while there is none. */
export interface SessionStore {
  /** A session fal has opened for this viewer. */
  open: (id: string, userId: string, at: number) => Promise<void>;
  /** A heartbeat for it; not this viewer's session, not counted. */
  touch: (id: string, userId: string, at: number) => Promise<void>;
  /** Every session opened since `since` (unix ms). */
  spans: (since: number) => Promise<SessionSpan[]>;
}

export const memoryAiredStore = () => {
  const aired = new Map<string, Set<string>>();

  return {
    aired: (channelKey) => Promise.resolve(new Set(aired.get(channelKey))),
    mark: (channelKey, itemId) => {
      const channel = aired.get(channelKey) ?? new Set<string>();
      channel.add(itemId);
      aired.set(channelKey, channel);

      return Promise.resolve();
    },
  } satisfies AiredStore;
};

export const memorySessionStore = () => {
  const sessions = new Map<string, SessionSpan>();

  return {
    open: (id, userId, at) => {
      if (!sessions.has(id)) {
        sessions.set(id, { seenAt: at, startedAt: at, userId });
      }

      return Promise.resolve();
    },
    spans: (since) =>
      Promise.resolve([...sessions.values()].filter((session) => session.startedAt >= since)),
    touch: (id, userId, at) => {
      const session = sessions.get(id);

      if (session !== undefined && session.userId === userId) {
        session.seenAt = at;
      }

      return Promise.resolve();
    },
  } satisfies SessionStore;
};

export const databaseAiredStore = (database: NonNullable<typeof db>) =>
  ({
    aired: async (channelKey) => {
      const rows = await database
        .select({ itemId: airedItem.itemId })
        .from(airedItem)
        .where(eq(airedItem.channelKey, channelKey));

      return new Set(rows.map((row) => row.itemId));
    },
    mark: async (channelKey, itemId, userId) => {
      await database
        .insert(airedItem)
        .values({ airedAt: Date.now(), channelKey, itemId, userId })
        .onConflictDoNothing();
    },
  }) satisfies AiredStore;

export const databaseSessionStore = (database: NonNullable<typeof db>) =>
  ({
    open: async (id, userId, at) => {
      await database
        .insert(liveSession)
        .values({ id, seenAt: at, startedAt: at, userId })
        .onConflictDoNothing();
    },
    spans: (since) =>
      database
        .select({
          seenAt: liveSession.seenAt,
          startedAt: liveSession.startedAt,
          userId: liveSession.userId,
        })
        .from(liveSession)
        .where(gte(liveSession.startedAt, since)),
    touch: async (id, userId, at) => {
      await database
        .update(liveSession)
        .set({ seenAt: at })
        .where(and(eq(liveSession.id, id), eq(liveSession.userId, userId)));
    },
  }) satisfies SessionStore;

const billedSeconds = (spans: SessionSpan[]) =>
  spans.reduce(
    (total, span) => total + Math.max(MIN_BILLED_SECONDS, (span.seenAt - span.startedAt) / 1000),
    0,
  );

export const createProgramming = (store: AiredStore, sessions: SessionStore, reads: Reads) => {
  const budgetLeft = async (viewer: BudgetViewer) => {
    const spans = await sessions.spans(dayStart());
    const rate = usdPerSecond();
    const station = DAILY_BUDGET_USD - billedSeconds(spans) * rate;

    if (viewer.owner) {
      return station;
    }

    const own =
      DAILY_BUDGET_USD_PER_VIEWER -
      billedSeconds(spans.filter((span) => span.userId === viewer.userId)) * rate;

    return Math.min(station, own);
  };

  const mayOpen = async (viewer: BudgetViewer) =>
    (await budgetLeft(viewer)) >= MIN_BILLED_SECONDS * usdPerSecond();

  const mayContinue = async (viewer: BudgetViewer) =>
    (await budgetLeft(viewer)) > -OVERRUN_GRACE_SECONDS * usdPerSecond();

  const sessionOpened = (id: string, viewer: BudgetViewer, at: number = Date.now()) =>
    sessions.open(id, viewer.userId, at);

  const sessionSeen = (id: string, viewer: BudgetViewer, at: number = Date.now()) =>
    sessions.touch(id, viewer.userId, at);

  const nextProgram = async (
    channelKey: string,
    access: SourceAccess,
    viewer: BudgetViewer,
    opening: boolean,
  ) => {
    const readCap = DAILY_READ_BUDGET_USD[access.kind];

    const [left, spentOnReads, aired] = await Promise.all([
      budgetLeft(viewer),
      readCap === undefined ? 0 : reads.spend.spent(access.kind, dayStart()),
      store.aired(channelKey),
    ]);

    if (left <= 0) {
      return {
        kind: "off-air",
        reason: `Today's live budget ($${DAILY_BUDGET_USD_PER_VIEWER} a viewer, $${DAILY_BUDGET_USD} the station) is spent — back on air at midnight UTC.`,
      } satisfies LivePayload;
    }

    if (readCap !== undefined && spentOnReads >= readCap) {
      return {
        kind: "off-air",
        reason: `Today's ${SOURCE_KIND_NAMES[access.kind]} read budget ($${readCap}) is spent — back on air at midnight UTC.`,
      } satisfies LivePayload;
    }

    let item;

    try {
      item = await pickCandidate(access, channelKey, {
        aired,
        cache: reads.cache,
        spend: reads.spend,
      });
    } catch (error) {
      return {
        kind: "off-air",
        reason: error instanceof Error ? error.message : "The source couldn't be read",
      } satisfies LivePayload;
    }

    if (item === undefined) {
      return {
        kind: "off-air",
        reason: "Nothing worth airing on this source yet — check back soon.",
      } satisfies LivePayload;
    }

    await store.mark(channelKey, item.id, viewer.userId);
    const format = opening ? pickFormat() : undefined;
    const segment = buildSegmentPrompt(item.text, item.author.name);

    return {
      formatLabel: format?.label,
      kind: "program",
      program: {
        authorName: item.author.name,
        authorUsername: item.author.username,
        itemId: item.id,
        kind: item.kind,
        link: item.link,
        prompt: format === undefined ? segment : buildOpeningPrompt(format.world, segment),
        text: item.text,
      },
    } satisfies LivePayload;
  };

  return { budgetLeft, mayContinue, mayOpen, nextProgram, sessionOpened, sessionSeen };
};

/** The station's programming, on whichever stores the deployment has. */
export const programming =
  db === undefined
    ? createProgramming(memoryAiredStore(), memorySessionStore(), memoryReads())
    : createProgramming(databaseAiredStore(db), databaseSessionStore(db), databaseReads(db));
