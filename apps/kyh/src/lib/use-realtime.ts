import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { FixedRate, MultiplayerClient } from "@vibedgames/multiplayer";

import type { JsonRecord, MultiplayerSnapshot } from "@vibedgames/multiplayer";
import type { PlayerMap } from "@/lib/player";
import type { Said } from "@/lib/chat";
import { draftState, sayState, SHOW_MS } from "@/lib/chat";
import { lookOf, ownColor, ownColorName } from "@/lib/color";
import { listenForChat } from "@/lib/chat-input";
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
    /** This visitor's own colors, once they're in the room. */
    me: () => (client ? ownColor() : null),
    /** Milliseconds on the room's clock, so everyone agrees when a line comes down. */
    now: () => client?.serverNow() ?? Date.now(),
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
    /** Send a line of chat. */
    say: (text: string) => {
      client?.updateMyState(sayState(text, client.serverNow()));
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
    /** What this visitor is typing, or null once they stop. */
    type: (draft: string | null) => {
      client?.updateMyState(draftState(draft));
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
  /** Whether typing here chats in this room; off where a page chats its own way. */
  chat: boolean;
}

export const useRealtime = ({ room, chat }: UseRealtimeProps) => {
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

  const [draft, setDraft] = useState<string | null>(null);
  // This visitor's own line, as they see it until it comes down.
  const [said, setSaid] = useState<Said | null>(null);
  useEffect(() => {
    if (!chat) {
      return;
    }
    return listenForChat({
      onDraft: (next) => {
        setDraft(next);
        shared.type(next);
      },
      onSend: (text) => {
        setSaid({ text, until: shared.now() + SHOW_MS });
        shared.say(text);
      },
    });
  }, [chat, shared]);

  // Which page they're on, said again whenever the room needs to hear it.
  useEffect(() => {
    shared.at(pathname);
  }, [shared, pathname]);

  return { draft, me: shared.me(), now: shared.now, players, said, windowDimensions };
};
