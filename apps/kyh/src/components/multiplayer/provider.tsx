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

import type { JsonRecord, JsonValue } from "@vibedgames/multiplayer";
import type { PlayerMap } from "@/lib/player";
import type { Said } from "@/lib/chat";
import type { SiteRoom } from "@/lib/site-room";
import { SHOW_MS } from "@/lib/chat";
import { listenForChat } from "@/lib/chat-input";
import { readSharedOrder } from "@/lib/shared-order";
import { createSiteRoom } from "@/lib/site-room";

// Pointers go out on a steady clock, smooth enough without flooding the room.
const SEND_RATE = 30;

const NONE: PlayerMap = {};
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
    let pointer: JsonRecord | null = null;
    const onMouseMove = (event: MouseEvent) => {
      pointer = {
        pointer: "mouse",
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      const [touch] = event.touches;
      if (touch) {
        pointer = {
          pointer: "touch",
          x: touch.clientX / window.innerWidth,
          y: touch.clientY / window.innerHeight,
        };
      }
    };
    // A lifted finger leaves no cursor behind.
    const onTouchEnd = () => {
      pointer = { x: null, y: null };
    };
    const rate = new FixedRate(SEND_RATE);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (rate.due(now - last) && pointer) {
        room.point(pointer);
        pointer = null;
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
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
 * callbacks a SortableGrid takes. While a tile is held, nothing from the room
 * reaches this grid (a re-render mid-drag throws off motion's layout
 * compensation and sets Reorder swapping back and forth); the latest lands
 * on release, after this visitor's own drop.
 */
export const useSharedOrder = <T,>(grid: string, items: T[], keyOf: (item: T) => string) => {
  const room = useSiteRoom();
  const [held, setHeld] = useState(false);
  const entry = useSyncExternalStore(
    held ? ignore : room.subscribe,
    () => room.order(grid) ?? NO_ENTRY,
    () => NO_ENTRY,
  );
  const ordered = useMemo(() => {
    const keys = items.map(keyOf);
    const order = readSharedOrder(entry, keys)?.order ?? keys;
    const byKey = new Map(items.map((item) => [keyOf(item), item]));
    return order.flatMap((key) => byKey.get(key) ?? []);
  }, [entry, items, keyOf]);
  const handleDrop = useCallback((order: string[]) => room.drop(grid, order), [room, grid]);
  return { handleDrop, handleHold: setHeld, items: ordered };
};
