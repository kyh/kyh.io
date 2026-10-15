// The site's one multiplayer room, `kyh-site`, on the vibedgames party server:
// who's here and where their pointer is, their chat, and the order of the
// homepage grids. A plain store with no React in it: MultiplayerProvider
// connects it once and hooks read it through useSyncExternalStore, so every
// selector here returns the same object until what it reads changes.
// (/showcase runs its own room for the town; see city/net.ts.)
import { MultiplayerClient } from "@vibedgames/multiplayer";

import type { JsonRecord, JsonValue, MultiplayerSnapshot } from "@vibedgames/multiplayer";
import type { PlayerMap } from "@/lib/player";
import type { Drop } from "@/lib/shared-order";
import { draftState, sayState } from "@/lib/chat";
import { lookOf, ownColor, ownColorName, subscribeToOwnColor } from "@/lib/color";
import { PARTY, PARTY_HOST } from "@/lib/party";
import { acceptOrder, hostReorder, ordersEntry, REORDER } from "@/lib/shared-order";

export const SITE_ROOM = "kyh-site";

const NONE: PlayerMap = {};

/**
 * What the host keeps in shared state for guests: an intent named `event`
 * becomes `key`'s next value, or null to leave it be. Listed here, not
 * registered by whatever's on screen: the host may be on any page.
 */
const HOST_SLICES: { event: string; key: string; apply: typeof hostReorder }[] = [
  { apply: hostReorder, event: REORDER, key: "orders" },
];

export const createSiteRoom = () => {
  let client: MultiplayerClient | null = null;
  const listeners = new Set<() => void>();
  /** The page this visitor is on, as everyone should see it. */
  let page: string | null = null;
  // The client drops state written before it has joined, and a rejoin is a
  // new player: so whenever its own state is missing the page or its color,
  // say them again.
  const announce = () => {
    const self = client?.playerId ? client.players[client.playerId] : undefined;
    const look = ownColorName();
    if (
      client &&
      self &&
      page !== null &&
      (self.state?.pathname !== page || self.state.look !== look)
    ) {
      client.updateMyState({ look, pathname: page });
    }
  };
  // The room's shared state as this visitor joined it: the client withholds
  // its player id until it's in, so a new id is a fresh sync (or a rejoin).
  let joinedAs: string | null = null;
  let atJoin: JsonRecord | undefined;
  const notify = () => {
    const id = client?.playerId ?? null;
    if (id !== joinedAs) {
      joinedAs = id;
      atJoin = client?.sharedState;
    }
    announce();
    for (const listener of listeners) {
      listener();
    }
  };
  const onEvent = (event: string, payload: JsonValue, from: string) => {
    const slice = HOST_SLICES.find((candidate) => candidate.event === event);
    if (!slice || !client?.isHost) {
      return;
    }
    const next = slice.apply(client.sharedState[slice.key], payload, from);
    if (next) {
      client.updateSharedState({ [slice.key]: next });
    }
  };

  let others: PlayerMap = NONE;
  let seen: MultiplayerSnapshot | null = null;
  /** This visitor's latest drop per grid, shown until the room catches up. */
  const drops = new Map<string, Drop>();
  let dropped = 0;

  return {
    /** Which page this visitor is on. */
    at: (pathname: string) => {
      page = pathname;
      announce();
    },
    /** Open the room; returns the close. Call once, from an effect. */
    connect: () => {
      client = new MultiplayerClient({
        fallbackMs: 10_000,
        host: PARTY_HOST,
        onEvent,
        party: PARTY,
        room: SITE_ROOM,
      });
      const unsubscribe = client.subscribe(notify);
      // A new color (every easter egg found) is said again at once.
      const stopRepaint = subscribeToOwnColor(notify);
      return () => {
        unsubscribe();
        stopRepaint();
        client?.destroy();
        client = null;
        notify();
      };
    },
    /** Put a grid in a new order: shown here at once, sent to the host for everyone. */
    drop: (grid: string, order: string[]) => {
      dropped += 1;
      // Before the room has let this visitor in there's no player id yet; any
      // name does, since only this visitor's own entries are compared by it.
      const entry: JsonRecord = { by: client?.playerId ?? "self", n: dropped, order };
      drops.set(grid, { base: ordersEntry(client?.sharedState, grid), entry });
      client?.sendToHost(REORDER, { grid, n: dropped, order });
      notify();
    },
    /** Whether `entry` is the grid's order as the room had it when this visitor joined. */
    joinedWith: (grid: string, entry: JsonValue) =>
      entry !== null && entry === ordersEntry(atJoin, grid),
    /** Milliseconds on the room's clock, so everyone agrees when a line comes down. */
    now: () => client?.serverNow() ?? Date.now(),
    /** A grid's order as this visitor should see it (raw: read it against the tiles). */
    order: (grid: string) => acceptOrder(ordersEntry(client?.sharedState, grid), drops.get(grid)),
    /** Everyone else in the room, as the site draws them. */
    others: () => {
      const snapshot = client?.getSnapshot() ?? null;
      if (snapshot !== seen) {
        seen = snapshot;
        const next: PlayerMap = {};
        for (const [id, player] of Object.entries(snapshot?.players ?? {})) {
          if (id !== snapshot?.playerId && player.connected !== false) {
            next[id] = {
              ...lookOf(player.state, player),
              id,
              state: player.state ?? {},
            };
          }
        }
        others = next;
      }
      return others;
    },
    /** Where this visitor's pointer is. */
    point: (state: JsonRecord) => {
      client?.updateMyState(state);
    },
    /** Send a line of chat. */
    say: (text: string) => {
      client?.updateMyState(sayState(text, client.serverNow()));
    },
    /** This visitor's own colors, once they're in the room. */
    self: () => (client ? ownColor() : null),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** What this visitor is typing, or null once they stop. */
    type: (draft: string | null) => {
      client?.updateMyState(draftState(draft));
    },
  };
};

export type SiteRoom = ReturnType<typeof createSiteRoom>;
