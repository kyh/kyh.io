"use client";

import { useRef, useState, useSyncExternalStore } from "react";

import type { JsonValue } from "@/lib/player";
import { SITE_ROOM } from "@/lib/party";
import { ordersEntry, readSharedOrder } from "@/lib/shared-order";
import { roomFor } from "@/lib/use-realtime";

/**
 * A grid's order, shared with everyone in the site's room while it lives. A
 * drag plays out here alone and goes to the host when it's dropped; everyone
 * else's drops land here, except while this visitor holds a tile, when they
 * wait for the drop (a re-render mid-drag would throw off motion's layout
 * compensation and set Reorder swapping back and forth).
 */
export const useSharedOrder = (grid: string, keys: string[]) => {
  const room = roomFor(SITE_ROOM);
  const held = useRef(false);
  const frozen = useRef<JsonValue>(null);
  // Only this grid's entry, which keeps its identity while the rest of the room
  // (pointers, chat) changes, so other visitors moving about don't re-render it.
  const entry = useSyncExternalStore(
    room.subscribe,
    () => {
      if (!held.current) {
        frozen.current = ordersEntry(room.snapshot()?.sharedState, grid) ?? null;
      }
      return frozen.current;
    },
    () => null,
  );
  const me = useSyncExternalStore(
    room.subscribe,
    () => room.snapshot()?.playerId ?? null,
    () => null,
  );

  const [order, setOrder] = useState(keys);
  // Re-renders on release, so the room's latest is read again.
  const [, setHolding] = useState(false);
  // The room's entry this grid last took in, and this visitor's latest drop.
  const [seen, setSeen] = useState<JsonValue>(null);
  const [sent, setSent] = useState(0);
  const count = useRef(0);
  const dropped = useRef<string[] | null>(null);

  if (entry !== seen) {
    setSeen(entry);
    const shared = readSharedOrder(entry, keys);
    // A late echo of this visitor's own earlier drop would undo a newer one.
    if (shared && !(shared.by === me && shared.n < sent)) {
      setOrder(shared.order);
    }
  }

  const reorder = (next: string[]) => {
    dropped.current = next;
    setOrder(next);
  };

  const hold = (holding: boolean) => {
    held.current = holding;
    setHolding(holding);
    const next = dropped.current;
    if (holding || !next) {
      return;
    }
    dropped.current = null;
    count.current += 1;
    setSent(count.current);
    // Whatever the room settled on during the drag is superseded by this drop.
    setSeen(ordersEntry(room.snapshot()?.sharedState, grid) ?? null);
    room.reorder({ grid, n: count.current, order: next });
  };

  return { hold, order, reorder };
};
