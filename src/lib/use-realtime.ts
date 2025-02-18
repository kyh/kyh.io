import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import usePartySocket from "partysocket/react";

import type { MessageType, PlayerMap, PositionMessage } from "@/lib/player";

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

  useEffect(() => {
    const onMessage = (evt: WebSocketEventMap["message"]) => {
      const msg = JSON.parse(evt.data as string) as MessageType;
      switch (msg.type) {
        case "sync":
          setPlayers({ ...msg.data });
          break;
        case "update":
          setPlayers((others) => ({ ...others, [msg.data.id]: msg.data }));
          break;
        case "remove":
          setPlayers((others) => {
            const newOthers = { ...others };
            delete newOthers[msg.data.id];
            return newOthers;
          });
          break;
      }
    };
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket]);

  // Always track the mouse position
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!windowDimensions.width || !windowDimensions.height) return;
      const message: PositionMessage = {
        type: "position",
        data: {
          x: e.clientX / windowDimensions.width,
          y: e.clientY / windowDimensions.height,
          pointer: "mouse",
        },
      };
      socket.send(JSON.stringify(message));
    };

    // Also listen for touch events
    const onTouchMove = (e: TouchEvent) => {
      if (!windowDimensions.width || !windowDimensions.height) return;
      if (!e.touches[0]) return;
      e.preventDefault();
      const message: PositionMessage = {
        type: "position",
        data: {
          x: e.touches[0].clientX / windowDimensions.width,
          y: e.touches[0].clientY / windowDimensions.height,
          pointer: "touch",
        },
      };
      socket.send(JSON.stringify(message));
    };

    // Catch the end of touch events
    const onTouchEnd = () => {
      const message: PositionMessage = {
        type: "position",
        data: {},
      };
      socket.send(JSON.stringify(message));
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
    const message: PositionMessage = {
      type: "position",
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
