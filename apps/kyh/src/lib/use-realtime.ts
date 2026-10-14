import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { FixedRate, MultiplayerClient } from "@vibedgames/multiplayer";

import type { JsonRecord, MultiplayerSnapshot } from "@vibedgames/multiplayer";
import type { PlayerMap } from "@/lib/player";
import { PARTY, PARTY_HOST } from "@/lib/party";

// Pointers go out on a steady clock, smooth enough without flooding the room.
const SEND_RATE = 30;

const NONE: PlayerMap = {};

const subscribeToResize = (onStoreChange: () => void) => {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
};

const unmeasured = { height: 0, width: 0 };
// useSyncExternalStore compares snapshots by identity, so a fresh object per
// read would loop forever. Only allocate when the size actually changed.
let lastDimensions = unmeasured;
const getWindowDimensions = () => {
  if (lastDimensions.width !== window.innerWidth || lastDimensions.height !== window.innerHeight) {
    lastDimensions = { height: window.innerHeight, width: window.innerWidth };
  }
  return lastDimensions;
};

/**
 * One room per page load, opened by the first component that wants it and
 * closed with the last. Created on subscribe, so never during a server render.
 */
const createRoom = (room: string) => {
  let client: MultiplayerClient | null = null;
  let users = 0;
  /** The page this visitor is on, as everyone should see it. */
  let page: string | null = null;
  // The client drops state written before it has joined, and a rejoin is a
  // new player: so whenever its own state is missing the page, say it again.
  const announce = () => {
    const self = client?.playerId ? client.players[client.playerId] : undefined;
    if (client && self && page !== null && self.state?.pathname !== page) {
      client.updateMyState({ pathname: page });
    }
  };
  let others: PlayerMap = NONE;
  let seen: MultiplayerSnapshot | null = null;
  return {
    /** Which page this visitor is on. */
    at: (pathname: string) => {
      page = pathname;
      announce();
    },
    get client() {
      return client;
    },
    /** Everyone else in the room, as the site draws them. */
    others: () => {
      const snapshot = client?.getSnapshot() ?? null;
      if (snapshot !== seen) {
        seen = snapshot;
        const next: PlayerMap = {};
        for (const [id, player] of Object.entries(snapshot?.players ?? {})) {
          if (id !== snapshot?.playerId && player.connected !== false) {
            next[id] = {
              color: player.color ?? "hsl(206, 100%, 50%)",
              hue: player.hue ?? "hsl(208, 77.5%, 76.9%)",
              id,
              state: player.state ?? {},
            };
          }
        }
        others = next;
      }
      return others;
    },
    subscribe: (listener: () => void) => {
      users += 1;
      client ??= new MultiplayerClient({
        fallbackMs: 10_000,
        host: PARTY_HOST,
        party: PARTY,
        room,
      });
      const unsubscribe = client.subscribe(() => {
        announce();
        listener();
      });
      return () => {
        unsubscribe();
        users -= 1;
        if (users === 0) {
          client?.destroy();
          client = null;
          seen = null;
          others = NONE;
        }
      };
    },
  };
};

const rooms = new Map<string, ReturnType<typeof createRoom>>();
const roomFor = (name: string) => {
  let room = rooms.get(name);
  if (!room) {
    room = createRoom(name);
    rooms.set(name, room);
  }
  return room;
};

interface UseRealtimeProps {
  room: string;
}

export const useRealtime = ({ room }: UseRealtimeProps) => {
  const shared = roomFor(room);
  const players = useSyncExternalStore(shared.subscribe, shared.others, () => NONE);
  const windowDimensions = useSyncExternalStore(
    subscribeToResize,
    getWindowDimensions,
    () => unmeasured,
  );
  const pathname = usePathname();
  const pointer = useRef<JsonRecord | null>(null);

  // Where this visitor is, sent on a steady clock while it changes.
  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      pointer.current = {
        pointer: "mouse",
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };
    const onTouchMove = (event: TouchEvent) => {
      const [touch] = event.touches;
      if (touch) {
        pointer.current = {
          pointer: "touch",
          x: touch.clientX / window.innerWidth,
          y: touch.clientY / window.innerHeight,
        };
      }
    };
    // A lifted finger leaves no cursor behind.
    const onTouchEnd = () => {
      pointer.current = { x: null, y: null };
    };
    const rate = new FixedRate(SEND_RATE);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (rate.due(now - last) && pointer.current) {
        shared.client?.updateMyState(pointer.current);
        pointer.current = null;
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
  }, [shared]);

  // Which page they're on, said again whenever the room needs to hear it.
  useEffect(() => {
    shared.at(pathname);
  }, [shared, pathname]);

  return { players, windowDimensions };
};
