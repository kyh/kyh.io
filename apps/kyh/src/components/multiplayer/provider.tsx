"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { FixedRate } from "@vibedgames/multiplayer";

import type { JsonValue } from "@vibedgames/multiplayer";
import type { PlayerMap, Visitor } from "@/lib/player";
import type { Said } from "@/lib/chat";
import type { SiteRoom } from "@/lib/site-room";
import { SHOW_MS } from "@/lib/chat";
import { listenForChat } from "@/lib/chat-input";
import { readViewport, toPage } from "@/lib/page-point";
import { lastPointer, pointerLifted, subscribeToPointer } from "@/lib/pointer";
import { readSharedOrder } from "@/lib/shared-order";
import { createSiteRoom } from "@/lib/site-room";

// Pointers go out on a steady clock, stamped so each visitor's browser can
// blend between them (components/cursor.tsx): smooth without flooding the room.
// The town sends its pointers at the same rate (city/net.ts).
const SEND_RATE = 15;

const NONE: PlayerMap = {};
const NO_ONE: Visitor[] = [];
const NO_ENTRY: JsonValue = null;
/** A subscription that never fires, for reads that should hold still. */
// oxlint-disable-next-line no-empty-function -- there is nothing to unsubscribe
const ignore = () => () => {};

const SiteRoomContext = createContext<SiteRoom | null>(null);

const useSiteRoom = () => {
  const room = useContext(SiteRoomContext);
  if (!room) {
    throw new Error("Multiplayer hooks need a <MultiplayerProvider> above them.");
  }
  return room;
};

/** Where this visitor's pointer is, sent on a steady clock while it changes. */
const usePointerBroadcast = (room: SiteRoom) => {
  useEffect(() => {
    let moved = false;
    const rate = new FixedRate(SEND_RATE);
    let last = performance.now();
    let frame = 0;
    // The clock runs only while there's a move to send: a still page wakes no frames.
    const tick = (now: number) => {
      const at = lastPointer();
      if (!at) {
        moved = false;
      } else if (rate.due(now - last) && moved) {
        moved = false;
        // A lifted finger leaves no cursor behind.
        room.point(
          pointerLifted()
            ? { fromCenter: null, fromTop: null }
            : {
                ...toPage(at.x, at.y, readViewport()),
                pointer: at.kind,
                t: Math.round(room.now()),
              },
        );
      }
      last = now;
      frame = moved ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      moved = true;
      if (frame === 0) {
        frame = requestAnimationFrame(tick);
      }
    };
    const stop = subscribeToPointer(wake);
    // Scrolling slides the page under a still pointer.
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      stop();
      window.removeEventListener("scroll", wake);
    };
  }, [room]);
};

/**
 * The site's room for everything under it: opened once on mount (never during
 * a server render), told which page this visitor is on, and sent their pointer.
 * The context holds the store itself, which never changes, so nothing
 * re-renders through it; each hook below subscribes to just what it reads.
 */
export const MultiplayerProvider = ({ children }: { children: React.ReactNode }) => {
  // oxlint-disable-next-line react/hook-use-state -- the store is made once and never replaced
  const [room] = useState(createSiteRoom);
  const pathname = usePathname();

  useEffect(() => room.connect(), [room]);
  useEffect(() => {
    room.at(pathname);
  }, [room, pathname]);
  usePointerBroadcast(room);

  return <SiteRoomContext value={room}>{children}</SiteRoomContext>;
};

/** Everyone else on the site, as the site draws them. */
export const usePlayers = () => {
  const room = useSiteRoom();
  return useSyncExternalStore(room.subscribe, room.others, () => NONE);
};

/** Everyone else on the site and the page they're on, unmoved by their pointers. */
export const useRoster = () => {
  const room = useSiteRoom();
  return useSyncExternalStore(room.subscribe, room.roster, () => NO_ONE);
};

/** This visitor's own colors, once they're in the room. */
export const useSelf = () => {
  const room = useSiteRoom();
  return useSyncExternalStore(room.subscribe, room.self, () => null);
};

/** The room's clock (ms), so everyone agrees when a line of chat comes down. */
export const useRoomClock = () => useSiteRoom().now;

/** This visitor's chat: what they're typing, and their last line until it comes down. */
export const useChat = (enabled: boolean) => {
  const room = useSiteRoom();
  const [draft, setDraft] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return listenForChat({
      onDraft: (next) => {
        setDraft(next);
        room.type(next);
      },
      onSend: (text) => {
        setSaid({ text, until: room.now() + SHOW_MS });
        room.say(text);
      },
    });
  }, [enabled, room]);
  return { draft, said };
};

/**
 * `items` in the order everyone on the site has them in, with the two
 * callbacks a SortableGrid takes. While a tile is held, the grid shows the
 * room's order as it was at pick-up and nothing newer reaches it (a re-render
 * mid-drag throws off motion's layout compensation and sets Reorder swapping
 * back and forth); the latest lands on release, after this visitor's own drop.
 */
export const useSharedOrder = <T,>(grid: string, items: T[], keyOf: (item: T) => string) => {
  const room = useSiteRoom();
  // The room's entry as it stood when a tile was picked up; undefined when none is held.
  const [heldAt, setHeldAt] = useState<JsonValue | undefined>();
  const held = heldAt !== undefined;
  const live = useSyncExternalStore(
    held ? ignore : room.subscribe,
    () => room.order(grid) ?? NO_ENTRY,
    () => NO_ENTRY,
  );
  const entry = held ? heldAt : live;
  const ordered = useMemo(() => {
    const keys = items.map(keyOf);
    const order = readSharedOrder(entry, keys)?.order ?? keys;
    const byKey = new Map(items.map((item) => [keyOf(item), item]));
    return order.flatMap((key) => byKey.get(key) ?? []);
  }, [entry, items, keyOf]);
  const handleDrop = useCallback((order: string[]) => room.drop(grid, order), [room, grid]);
  const handleHold = useCallback(
    (holding: boolean) => setHeldAt(holding ? (room.order(grid) ?? NO_ENTRY) : undefined),
    [room, grid],
  );
  // The order the room already had when this visitor arrived lands in place;
  // only moves made since (anyone's drop) slide.
  const settling = room.joinedWith(grid, entry);
  return { handleDrop, handleHold, items: ordered, settling };
};
