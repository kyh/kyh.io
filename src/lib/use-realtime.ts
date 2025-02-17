import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import usePartySocket from "partysocket/react";

import type { Cursor, Position } from "@/lib/cursor";
import { useTrackWindow } from "@/lib/use-track-window";

type OtherCursorsMap = Record<string, Cursor>;

type useRealtimeProps = {
  host: string;
  party: string;
  room: string;
};

export const useRealtime = ({ host, party, room }: useRealtimeProps) => {
  const socket = usePartySocket({ host, party, room });
  const pathname = usePathname();
  const [others, setOthers] = useState<OtherCursorsMap>({});
  const windowDimensions = useTrackWindow();

  useEffect(() => {
    if (socket) {
      const onMessage = (evt: WebSocketEventMap["message"]) => {
        const msg = JSON.parse(evt.data as string);
        switch (msg.type) {
          case "sync":
            const newOthers = { ...msg.cursors };
            setOthers(newOthers);
            break;
          case "update":
            setOthers((others) => ({ ...others, [msg.id]: msg }));
            break;
          case "remove":
            setOthers((others) => {
              const newOthers = { ...others };
              delete newOthers[msg.id];
              return newOthers;
            });
            break;
        }
      };
      socket.addEventListener("message", onMessage);

      return () => {
        socket.removeEventListener("message", onMessage);
      };
    }
  }, [socket]);

  // Always track the mouse position
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!socket) return;
      if (!windowDimensions.width || !windowDimensions.height) return;
      const position: Position = {
        x: e.clientX / windowDimensions.width,
        y: e.clientY / windowDimensions.height,
        pointer: "mouse",
      };
      socket.send(JSON.stringify(position));
    };

    // Also listen for touch events
    const onTouchMove = (e: TouchEvent) => {
      if (!socket) return;
      if (!windowDimensions.width || !windowDimensions.height) return;
      if (!e.touches[0]) return;
      e.preventDefault();
      const position: Position = {
        x: e.touches[0].clientX / windowDimensions.width,
        y: e.touches[0].clientY / windowDimensions.height,
        pointer: "touch",
      };
      socket.send(JSON.stringify(position));
    };

    // Catch the end of touch events
    const onTouchEnd = () => {
      if (!socket) return;
      socket.send(JSON.stringify({}));
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [socket, windowDimensions]);

  useEffect(() => {
    if (!socket) return;
    socket.send(JSON.stringify({ x: 1, y: 1, pathname }));
  }, [socket, pathname]);

  return { others: others };
};
