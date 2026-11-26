import { MultiplayerClient } from "@vibedgames/multiplayer";

import type { JsonRecord, JsonValue, MultiplayerSnapshot } from "@vibedgames/multiplayer";
import type { PlayerMap, Visitor } from "@/lib/player";
import type { Drop } from "@/lib/shared-order";
import { draftState, sayState } from "@/lib/chat";
import { lookOf, ownColor, ownColorName, subscribeToOwnColor } from "@/lib/color";
import { PARTY, PARTY_HOST } from "@/lib/party";
import { asText } from "@/lib/wire";
import { acceptOrder, hostReorder, ordersEntry, REORDER } from "@/lib/shared-order";

const SITE_ROOM = "kyh-site";

const NONE: PlayerMap = {};
const NO_ONE: Visitor[] = [];

const HOST_SLICES: { event: string; key: string; apply: typeof hostReorder }[] = [
  { apply: hostReorder, event: REORDER, key: "orders" },
];

export const createSiteRoom = () => {
  let client: MultiplayerClient | null = null;
  const listeners = new Set<() => void>();
  let page: string | null = null;

  const announce = () => {
    const self =
      client !== null &&
      client.playerId !== undefined &&
      client.playerId !== null &&
      client.playerId !== ""
        ? client.players[client.playerId]
        : undefined;

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

    if (!slice || client?.isHost !== true) {
      return;
    }

    const next = slice.apply(client.sharedState[slice.key], payload, from);

    if (next) {
      client.updateSharedState({ [slice.key]: next });
    }
  };

  let others: PlayerMap = NONE;
  let seen: MultiplayerSnapshot | null = null;
  let roster: Visitor[] = NO_ONE;
  let rosterKey = "";
  const drops = new Map<string, Drop>();
  let dropped = 0;

  const readOthers = () => {
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
  };

  return {
    at: (pathname: string) => {
      page = pathname;
      announce();
    },
    connect: () => {
      client = new MultiplayerClient({
        fallbackMs: 10_000,
        host: PARTY_HOST,
        onEvent,
        party: PARTY,
        room: SITE_ROOM,
      });
      const unsubscribe = client.subscribe(notify);
      const stopRepaint = subscribeToOwnColor(notify);

      return () => {
        unsubscribe();
        stopRepaint();
        client?.destroy();
        client = null;
        notify();
      };
    },
    drop: (grid: string, order: string[]) => {
      dropped += 1;
      const entry: JsonRecord = { by: client?.playerId ?? "self", n: dropped, order };
      drops.set(grid, { base: ordersEntry(client?.sharedState, grid), entry });
      client?.sendToHost(REORDER, { grid, n: dropped, order });
      notify();
    },
    joinedWith: (grid: string, entry: JsonValue) =>
      entry !== null && entry === ordersEntry(atJoin, grid),
    now: () => client?.serverNow() ?? Date.now(),
    order: (grid: string) => acceptOrder(ordersEntry(client?.sharedState, grid), drops.get(grid)),
    others: readOthers,
    point: (state: JsonRecord) => {
      client?.updateMyState(state);
    },
    roster: () => {
      const next: Visitor[] = [];

      for (const player of Object.values(readOthers())) {
        const pathname = asText(player.state.pathname);

        if (pathname) {
          next.push({ color: player.color, hue: player.hue, id: player.id, pathname });
        }
      }

      const key = next
        .map(({ color, hue, id, pathname }) => `${id} ${color} ${hue} ${pathname}`)
        .join("\n");

      if (key !== rosterKey) {
        rosterKey = key;
        roster = next.length > 0 ? next : NO_ONE;
      }

      return roster;
    },
    say: (text: string) => {
      client?.updateMyState(sayState(text, client.serverNow()));
    },
    self: () => (client ? ownColor() : null),
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    type: (draft: string | null) => {
      client?.updateMyState(draftState(draft));
    },
  };
};

export type SiteRoom = ReturnType<typeof createSiteRoom>;
