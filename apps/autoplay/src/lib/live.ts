import { and, eq, gte } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { airedItem, liveSession } from "@/db/drizzle-schema";
import type { LivePayload } from "@/lib/api-contract";
import { dayStart, today } from "@/lib/day";
import { buildOpeningPrompt, buildSegmentPrompt, pickFormat } from "@/lib/prompt";
import { DAILY_READ_BUDGET_USD, databaseReads, memoryReads } from "@/lib/reads";
import type { Reads } from "@/lib/reads";
import { SOURCE_KIND_NAMES } from "@/lib/source-kinds";
import { pickCandidate } from "@/lib/sources";
import type { SourceAccess } from "@/lib/sources/types";

// Programming. A channel is a director session in its owner's browser: the
// model streams continuous video and takes a new prompt per program, and this
// is where the programs come from. Rules, in order:
//   1. Best first: the source's adapter (src/lib/sources) says which un-aired
//      item is worth airing — engagement on X, recency for mail and feeds,
//      views on YouTube.
//   2. Never twice: an item handed out is marked aired on the spot, since the
//      stream will have shown it before any later request could tell.
//   3. Budgeted: the session is the meter. fal bills it per second, so the
//      day's caps are in dollars, counted from the sessions the proxy has
//      seen fal open and heartbeat (src/app/api/fal/proxy). One cap for the
//      station, one for each signed-in viewer on their own channels; the
//      owner's CH 01 counts only against the station's.
//   4. Reads budgeted too: X bills per post returned, so what its adapter
//      buys is priced into a ledger as it lands (src/lib/reads.ts) and the
//      day has a cap of its own; between buys, a cache every instance
//      shares answers instead.

/** What fal bills a director session per second, at list and until the promotion ends. */
const LIST_USD_PER_SECOND = 0.08;
const PROMO_USD_PER_SECOND = 0.02;
/** The last UTC day of the promotional rate. */
const PROMO_LAST_DAY = "2026-09-14";
/** A session is billed at least this long the moment it exists. */
export const MIN_BILLED_SECONDS = 60;
/** What one signed-in viewer may spend a day on their own channels. */
export const DAILY_BUDGET_USD_PER_VIEWER = 20;
/** What the whole station may spend a day, the owner's CH 01 included. */
export const DAILY_BUDGET_USD = 50;
/**
 * How far past its cap a running session may go before the proxy stops
 * answering its heartbeats: long enough for the client to be refused its
 * next program and close on its own, which is the graceful way off.
 */
const OVERRUN_GRACE_SECONDS = 60;

export const usdPerSecond = (day: string = today()): number =>
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

export const memoryAiredStore = (): AiredStore => {
  const aired = new Map<string, Set<string>>();
  return {
    aired: (channelKey) => Promise.resolve(new Set(aired.get(channelKey))),
    mark: (channelKey, itemId) => {
      const channel = aired.get(channelKey) ?? new Set<string>();
      channel.add(itemId);
      aired.set(channelKey, channel);
      return Promise.resolve();
    },
  };
};

export const memorySessionStore = (): SessionStore => {
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
  };
};

export const databaseAiredStore = (database: NonNullable<typeof db>): AiredStore => ({
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
});

export const databaseSessionStore = (database: NonNullable<typeof db>): SessionStore => ({
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
});

/** What fal bills for these sessions, in seconds: each at least the minimum. */
const billedSeconds = (spans: SessionSpan[]): number =>
  spans.reduce(
    (total, span) => total + Math.max(MIN_BILLED_SECONDS, (span.seenAt - span.startedAt) / 1000),
    0,
  );

export const createProgramming = (store: AiredStore, sessions: SessionStore, reads: Reads) => {
  /**
   * Dollars left of today's budget for this viewer: the station's, and their
   * own unless they are the owner, whichever is tighter. Sessions count
   * toward the day they were opened on.
   */
  const budgetLeft = async (viewer: BudgetViewer): Promise<number> => {
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

  /** Whether a session may be opened: it is billed a minute the moment it exists. */
  const mayOpen = async (viewer: BudgetViewer): Promise<boolean> =>
    (await budgetLeft(viewer)) >= MIN_BILLED_SECONDS * usdPerSecond();

  /** Whether a running session may go on: past the cap by no more than the grace. */
  const mayContinue = async (viewer: BudgetViewer): Promise<boolean> =>
    (await budgetLeft(viewer)) > -OVERRUN_GRACE_SECONDS * usdPerSecond();

  const sessionOpened = (id: string, viewer: BudgetViewer, at: number = Date.now()) =>
    sessions.open(id, viewer.userId, at);

  const sessionSeen = (id: string, viewer: BudgetViewer, at: number = Date.now()) =>
    sessions.touch(id, viewer.userId, at);

  /** The next program to direct on a channel, spent the moment it is handed out. */
  const nextProgram = async (
    channelKey: string,
    access: SourceAccess,
    viewer: BudgetViewer,
    opening: boolean,
  ): Promise<LivePayload> => {
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
      };
    }
    if (readCap !== undefined && spentOnReads >= readCap) {
      return {
        kind: "off-air",
        reason: `Today's ${SOURCE_KIND_NAMES[access.kind]} read budget ($${readCap}) is spent — back on air at midnight UTC.`,
      };
    }
    let item;
    try {
      item = await pickCandidate(access, channelKey, {
        aired,
        cache: reads.cache,
        spend: reads.spend,
      });
    } catch (error) {
      // The source couldn't be read — an expired grant, a dead feed, a spent
      // X balance. The reason is the program.
      return {
        kind: "off-air",
        reason: error instanceof Error ? error.message : "The source couldn't be read",
      };
    }
    if (item === undefined) {
      return {
        kind: "off-air",
        reason: "Nothing worth airing on this source yet — check back soon.",
      };
    }
    await store.mark(channelKey, item.id, viewer.userId);
    // The day's format: one show per day, so reopening a channel or replaying
    // its sessions stays in the same world.
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
    };
  };

  return { budgetLeft, mayContinue, mayOpen, nextProgram, sessionOpened, sessionSeen };
};

/** The station's programming, on whichever stores the deployment has. */
export const programming =
  db === undefined
    ? createProgramming(memoryAiredStore(), memorySessionStore(), memoryReads())
    : createProgramming(databaseAiredStore(db), databaseSessionStore(db), databaseReads(db));
