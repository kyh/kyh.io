import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { usePartySocket } from "partysocket/react";

import type { ClientMessage, PlayerMap, ServerMessage } from "@/lib/player";

// ~30fps, good balance between smoothness and network
const THROTTLE_MS = 32;

interface useRealtimeProps {
  host: string;
  party: string;
  room: string;
}

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

const useTrackWindow = () =>
  useSyncExternalStore(subscribeToResize, getWindowDimensions, () => unmeasured);

export const useRealtime = ({ host, party, room }: useRealtimeProps) => {
  const socket = usePartySocket({ host, party, room });
  const pathname = usePathname();
  const [players, setPlayers] = useState<PlayerMap>({});
  const windowDimensions = useTrackWindow();
  const lastSendRef = useRef(0);
  const pendingMessageRef = useRef<ClientMessage | null>(null);
  const rafRef = useRef<number | null>(null);

  // Throttled send that batches rapid updates
  const sendThrottled = useCallback(
    (message: ClientMessage) => {
      pendingMessageRef.current = message;

      const now = Date.now();
      const timeSinceLastSend = now - lastSendRef.current;

      if (timeSinceLastSend >= THROTTLE_MS) {
        socket.send(JSON.stringify(message));
        lastSendRef.current = now;
        pendingMessageRef.current = null;
      } else if (!rafRef.current) {
        // Schedule send for remaining throttle time
        rafRef.current = window.setTimeout(() => {
          if (pendingMessageRef.current) {
            socket.send(JSON.stringify(pendingMessageRef.current));
            lastSendRef.current = Date.now();
            pendingMessageRef.current = null;
          }
          rafRef.current = null;
        }, THROTTLE_MS - timeSinceLastSend);
      }
    },
    [socket],
  );

  // Cleanup pending timeout on unmount
  useEffect(
    () => () => {
      if (rafRef.current) {
        clearTimeout(rafRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const onMessage = (evt: WebSocketEventMap["message"]) => {
      // SAFETY: the only sender on this socket is our own party server
      // (apps/party KyhServer), which emits ServerMessage JSON strings and
      // nothing else.
      const msg = JSON.parse(evt.data as string) as ServerMessage;
      switch (msg.type) {
        case "ping": {
          // The server reaps connections it stops hearing from, so an idle
          // visitor who never moves the mouse still has to answer.
          const pong: ClientMessage = { type: "pong" };
          socket.send(JSON.stringify(pong));
          break;
        }
        case "sync": {
          setPlayers({ ...msg.data.players });
          break;
        }
        case "player_joined": {
          setPlayers((prev) => ({ ...prev, [msg.data.id]: msg.data }));
          break;
        }
        case "player_state": {
          setPlayers((prev) => {
            const player = prev[msg.data.id];
            if (!player) {
              return prev;
            }
            return {
              ...prev,
              [msg.data.id]: { ...player, state: { ...player.state, ...msg.data.state } },
            };
          });
          break;
        }
        case "player_left": {
          setPlayers((prev) =>
            Object.fromEntries(Object.entries(prev).filter(([id]) => id !== msg.data.id)),
          );
          break;
        }
        default: {
          break;
        }
      }
    };
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket]);

  // Track mouse/touch position with throttling
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!windowDimensions.width || !windowDimensions.height) {
        return;
      }
      const message: ClientMessage = {
        data: {
          pointer: "mouse",
          x: e.clientX / windowDimensions.width,
          y: e.clientY / windowDimensions.height,
        },
        type: "player_state_patch",
      };
      sendThrottled(message);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!windowDimensions.width || !windowDimensions.height) {
        return;
      }
      if (!e.touches[0]) {
        return;
      }
      const message: ClientMessage = {
        data: {
          pointer: "touch",
          x: e.touches[0].clientX / windowDimensions.width,
          y: e.touches[0].clientY / windowDimensions.height,
        },
        type: "player_state_patch",
      };
      sendThrottled(message);
    };

    // touchend sends immediately (no throttle needed)
    const onTouchEnd = () => {
      const message: ClientMessage = {
        data: { x: null, y: null },
        type: "player_state_patch",
      };
      socket.send(JSON.stringify(message));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [socket, windowDimensions, sendThrottled]);

  // partysocket reuses one socket object across reconnects, so a bare send on
  // mount is never repeated. Each reconnect is a fresh connection server-side
  // with empty state, and mousemove only ever patches x/y — so without
  // re-announcing here, a reconnected player would keep a pathname-less state
  // forever and their cursor could never render again for anyone.
  useEffect(() => {
    const announce = () => {
      const message: ClientMessage = {
        data: {
          pathname,
          x: 1,
          y: 1,
        },
        type: "player_state_patch",
      };
      socket.send(JSON.stringify(message));
    };

    // While still connecting, the open handler covers it (and partysocket would
    // queue the send anyway) — sending now as well would just duplicate the patch.
    if (socket.readyState === WebSocket.OPEN) {
      announce();
    }
    socket.addEventListener("open", announce);

    return () => socket.removeEventListener("open", announce);
  }, [socket, pathname]);

  return { players, socket, windowDimensions };
};
