import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { airedItem } from "@/db/drizzle-schema";
import type { LivePayload } from "@/lib/api-contract";
import { buildSegmentPrompt, pickFormat } from "@/lib/prompt";
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
//   3. Budgeted: the session is the meter, and every program is ~15s of it.
//      Two daily caps, derived from what has aired: one for the station, one
//      for each signed-in viewer on their own channels. The owner's CH 01
//      counts only against the station's.

/**
 * Programs a day across the whole station. A program is fifteen to twenty
 * seconds of stream (the client holds a subject ten seconds once it is on
 * screen, and the model changes at its next ten-second chunk), so this is
 * about forty-five minutes of live video — at list price about $4.80 a
 * minute, which makes this the number to change first.
 */
export const MAX_PROGRAMS_PER_DAY = 150;
/** What one signed-in viewer may take of that on their own channels: about fifteen minutes. */
export const MAX_PROGRAMS_PER_USER_PER_DAY = 50;

export type Viewer = { userId: string; owner: boolean };

/** Where aired items are kept: the database, or memory while there is none. */
export type AiredStore = {
  aired(channelKey: string): Promise<Set<string>>;
  mark(channelKey: string, itemId: string, userId: string): Promise<void>;
  /** Programs handed out since `since` (unix ms): every viewer's, or one viewer's. */
  count(since: number, userId: string | undefined): Promise<number>;
};

export const memoryAiredStore = (): AiredStore => {
  const aired = new Map<string, Map<string, { at: number; userId: string }>>();
  return {
    aired: async (channelKey) => new Set(aired.get(channelKey)?.keys() ?? []),
    mark: async (channelKey, itemId, userId) => {
      const channel = aired.get(channelKey) ?? new Map<string, { at: number; userId: string }>();
      channel.set(itemId, { at: Date.now(), userId });
      aired.set(channelKey, channel);
    },
    count: async (since, userId) => {
      let total = 0;
      for (const channel of aired.values()) {
        for (const entry of channel.values()) {
          if (entry.at >= since && (userId === undefined || entry.userId === userId)) total += 1;
        }
      }
      return total;
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
      .values({ channelKey, itemId, userId, airedAt: Date.now() })
      .onConflictDoNothing();
  },
  count: async (since, userId) => {
    const recent = gte(airedItem.airedAt, since);
    const rows = await database
      .select({ total: count() })
      .from(airedItem)
      .where(userId === undefined ? recent : and(recent, eq(airedItem.userId, userId)));
    return rows[0]?.total ?? 0;
  },
});

const dayStart = (): number => Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

export const createProgramming = (store: AiredStore) => {
  /**
   * Whether one more program may air today for this viewer. Checked before a
   * session is even negotiated (src/app/api/fal/proxy), because a session is
   * billed for a minute the moment it exists. The owner spends the station's
   * budget alone; everyone else has their own slice of it too.
   */
  const withinBudget = async (viewer: Viewer): Promise<boolean> => {
    if ((await store.count(dayStart(), undefined)) >= MAX_PROGRAMS_PER_DAY) return false;
    if (viewer.owner) return true;
    return (await store.count(dayStart(), viewer.userId)) < MAX_PROGRAMS_PER_USER_PER_DAY;
  };

  /** The next program to direct on a channel, spent the moment it is handed out. */
  const nextProgram = async (
    channelKey: string,
    access: SourceAccess,
    viewer: Viewer,
    opening: boolean,
  ): Promise<LivePayload> => {
    if (!(await withinBudget(viewer))) {
      return {
        kind: "off-air",
        reason: "Today's live budget is spent — back on air at midnight UTC.",
      };
    }
    let item;
    try {
      item = await pickCandidate(access, channelKey, await store.aired(channelKey));
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
    const payload: LivePayload = {
      kind: "program",
      program: {
        itemId: item.id,
        kind: item.kind,
        text: item.text,
        authorName: item.author.name,
        authorUsername: item.author.username,
        prompt: buildSegmentPrompt(item.text, item.author.name),
      },
    };
    if (opening) {
      // The day's format: one show per day, so reopening a channel or
      // replaying its sessions stays in the same world.
      const format = pickFormat();
      payload.world = format.world;
      payload.formatLabel = format.label;
    }
    return payload;
  };

  return { withinBudget, nextProgram };
};

/** The station's programming, on whichever store the deployment has. */
export const programming = createProgramming(
  db === undefined ? memoryAiredStore() : databaseAiredStore(db),
);
