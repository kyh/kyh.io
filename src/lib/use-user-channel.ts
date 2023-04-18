import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useSupabase, type RealtimePayload } from "./use-supabase";
import { getRandomColors, getRandomUniqueColor } from "./random-color";
import { type RealtimeChannel } from "@supabase/supabase-js";

const X_THRESHOLD = 25;
const Y_THRESHOLD = 35;

export type User = {
  color: string;
  hue: string;
  isTyping?: boolean;
  message?: string;
} & Coordinates;

type Coordinates = {
  x: number | undefined;
  y: number | undefined;
};

type UseUserChannelProps = {
  roomId: string;
};

const userId = nanoid();

export const useUserChannel = ({ roomId }: UseUserChannelProps) => {
  const supabase = useSupabase();
  const userChannelRef = useRef<RealtimeChannel>();
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [isInitialStateSynced, setIsInitialStateSynced] = useState(false);

  useEffect(() => {
    const roomChannel = supabase.channel("rooms", {
      config: { presence: { key: roomId } },
    });

    roomChannel.on("presence", { event: "sync" }, () => {
      const state = roomChannel.presenceState();
      const _users = state[roomId];

      if (!_users) return;

      // Deconflict duplicate colours at the beginning of the browser session
      const colors =
        Object.keys(users).length === 0 ? getRandomColors(_users.length) : [];

      if (_users) {
        setUsers((existingUsers) => {
          const updatedUsers = _users.reduce(
            (
              acc: { [key: string]: User },
              { user_id: userId }: any,
              index: number
            ) => {
              const userColors = Object.values(users).map(
                (user: any) => user.color
              );
              // Deconflict duplicate colors for incoming clients during the browser session
              const color =
                colors.length > 0
                  ? colors[index]
                  : getRandomUniqueColor(userColors);

              acc[userId] = existingUsers[userId] || {
                x: 0,
                y: 0,
                color: color.bg,
                hue: color.hue,
              };
              return acc;
            },
            {}
          );
          return updatedUsers;
        });
      }

      setIsInitialStateSynced(true);
    });

    roomChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomChannel.track({ user_id: userId });
      }
    });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !isInitialStateSynced) return;

    const userChannel = supabase.channel(`users:${roomId}`);

    const onMouseEvent = (e: MouseEvent) => {
      const [x, y] = [e.clientX, e.clientY];
      userChannel
        .send({
          type: "broadcast",
          event: "mouse",
          payload: { user_id: userId, x, y },
        })
        .catch(() => {});
    };

    userChannel.on(
      "broadcast",
      { event: "mouse" },
      (data: RealtimePayload<{ user_id: string } & Coordinates>) => {
        setUsers((users) => {
          const userId = data.payload!.user_id;
          const existingUser = users[userId];

          if (existingUser) {
            const x =
              (data.payload?.x ?? 0) - X_THRESHOLD > window.innerWidth
                ? window.innerWidth - X_THRESHOLD
                : data.payload?.x;
            const y =
              (data.payload?.y ?? 0 - Y_THRESHOLD) > window.innerHeight
                ? window.innerHeight - Y_THRESHOLD
                : data.payload?.y;

            users[userId] = { ...existingUser, ...{ x, y } };
            users = structuredClone(users);
          }

          return users;
        });
      }
    );

    userChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        window.addEventListener("mousemove", onMouseEvent);
      }
    });

    userChannelRef.current = userChannel;

    return () => {
      supabase.removeChannel(userChannel);
      window.removeEventListener("mousemove", onMouseEvent);
    };
  }, [roomId, isInitialStateSynced]);

  return { userId, users, userChannelRef };
};
