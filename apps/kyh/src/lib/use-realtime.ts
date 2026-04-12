import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import usePartySocket from "partysocket/react";

import type { ClientMessage, PlayerMap, ServerMessage } from "@/lib/player";

const THROTTLE_MS = 32; // ~30fps, good balance between smoothness and network

type useRealtimeProps = {
  host: string;
  party: string;
  room: string;
};

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
        }, THROTTLE_MS - timeSinceLastSend) as unknown as number;
      }
    },
    [socket],
  );

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        clearTimeout(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMessage = (evt: WebSocketEventMap["message"]) => {
      const msg = JSON.parse(evt.data as string) as ServerMessage;
      switch (msg.type) {
        case "sync":
          setPlayers({ ...msg.data.players });
          break;
        case "player_joined":
          setPlayers((prev) => ({ ...prev, [msg.data.id]: msg.data }));
          break;
        case "player_state":
          setPlayers((prev) => {
            const player = prev[msg.data.id];
            if (!player) return prev;
            return {
              ...prev,
              [msg.data.id]: { ...player, state: { ...player.state, ...msg.data.state } },
            };
          });
          break;
        case "player_left":
          setPlayers((prev) => {
            const next = { ...prev };
            delete next[msg.data.id];
            return next;
          });
          break;
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
      if (!windowDimensions.width || !windowDimensions.height) return;
      const message: ClientMessage = {
        type: "player_state_patch",
        data: {
          x: e.clientX / windowDimensions.width,
          y: e.clientY / windowDimensions.height,
          pointer: "mouse",
        },
      };
      sendThrottled(message);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!windowDimensions.width || !windowDimensions.height) return;
      if (!e.touches[0]) return;
      const message: ClientMessage = {
        type: "player_state_patch",
        data: {
          x: e.touches[0].clientX / windowDimensions.width,
          y: e.touches[0].clientY / windowDimensions.height,
          pointer: "touch",
        },
      };
      sendThrottled(message);
    };

    // touchend sends immediately (no throttle needed)
    const onTouchEnd = () => {
      const message: ClientMessage = {
        type: "player_state_patch",
        data: { x: undefined, y: undefined },
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

  useEffect(() => {
    const message: ClientMessage = {
      type: "player_state_patch",
      data: {
        x: 1,
        y: 1,
        pathname,
      },
    };
    socket.send(JSON.stringify(message));
  }, [socket, pathname]);

  return { socket, players, windowDimensions };
};

const useTrackWindow = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    setWindowDimensions({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
};
