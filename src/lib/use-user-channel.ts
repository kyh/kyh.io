import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useSupabase, type RealtimePayload } from "./use-supabase";
import { getRandomColors, getRandomUniqueColor } from "./random-color";
import {
  RealtimePresenceState,
  type RealtimeChannel,
} from "@supabase/supabase-js";

const X_THRESHOLD = 25;

export type User = {
  color: string;
  hue: string;
  isTyping?: boolean;
  message?: string;
} & Coordinates;

type Coordinates = {
  path?: string;
  x?: number;
  y?: number;
};

type UseUserChannelProps = {
  roomId: string;
};

const userId = nanoid();

export const useUserChannel = ({ roomId }: UseUserChannelProps) => {
  const supabase = useSupabase();
  const userChannelRef = useRef<RealtimeChannel>();
  const pathname = usePathname();
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [isInitialStateSynced, setIsInitialStateSynced] = useState(false);
  const [isChannelSubscribed, setIsChannelSubscribed] = useState(false);
  const mouseEvent = `${pathname}:mouse`;
  const pathEvent = "path";

  useEffect(() => {
    const handleInitialSync = (state: RealtimePresenceState) => {
      const _users = state[roomId];

      if (!_users) return;

      // Deconflict duplicate colors at the beginning of the browser session
      const colors =
        Object.keys(users).length === 0 ? getRandomColors(_users.length) : [];

      setUsers((existingUsers) => {
        const updatedUsers = _users.reduce(
          (
            acc: { [key: string]: User },
            { user_id: userId, path }: any,
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
              path,
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

      setIsInitialStateSynced(true);
    };

    const roomChannel = supabase.channel("rooms", {
      config: { presence: { key: roomId } },
    });

    roomChannel.on("presence", { event: "sync" }, () => {
      handleInitialSync(roomChannel.presenceState());
    });

    roomChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await roomChannel.track({ user_id: userId, path: pathname });
      }
    });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  // Event listeners
  useEffect(() => {
    if (!isInitialStateSynced) return;

    const handleBroadcastEvents = (
      data: RealtimePayload<{ user_id: string } & Coordinates>
    ) => {
      setUsers((users) => {
        const userId = data.payload!.user_id;
        const existingUser = users[userId];

        if (!existingUser) return users;

        if (data.event.includes("mouse")) {
          const x =
            (data.payload?.x ?? 0) - X_THRESHOLD > window.innerWidth
              ? window.innerWidth - X_THRESHOLD
              : data.payload?.x;
          const y = data.payload?.y;

          users[userId] = { ...existingUser, x, y };
        }

        if (data.event.includes("path")) {
          users[userId] = { ...existingUser, path: data.payload?.path };
        }

        return structuredClone(users);
      });
    };

    const userChannel = supabase.channel(`${roomId}:users`);

    userChannel.on("broadcast", { event: mouseEvent }, handleBroadcastEvents);
    userChannel.on("broadcast", { event: pathEvent }, handleBroadcastEvents);

    userChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsChannelSubscribed(true);
      }
    });

    userChannelRef.current = userChannel;

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [isInitialStateSynced, pathname]);

  // Event emitters

  // on route change, resubscribe to the new channel
  useEffect(() => {
    if (!isChannelSubscribed || !userChannelRef.current) return;
    const userChannel = userChannelRef.current;

    const onMouseEvent = ({ clientX, clientY }: MouseEvent) => {
      userChannel.send({
        type: "broadcast",
        event: mouseEvent,
        payload: { user_id: userId, x: clientX, y: window.scrollY + clientY },
      });
    };

    window.addEventListener("mousemove", onMouseEvent);

    return () => {
      window.removeEventListener("mousemove", onMouseEvent);
    };
  }, [isChannelSubscribed, pathname]);

  // on route change, broadcast the new path
  useEffect(() => {
    if (!isChannelSubscribed || !userChannelRef.current) return;
    const userChannel = userChannelRef.current;

    userChannel.send({
      type: "broadcast",
      event: pathEvent,
      payload: { path: pathname, user_id: userId },
    });

    setUsers((users) => {
      users[userId] = { ...users[userId], path: pathname };
      return structuredClone(users);
    });
  }, [isChannelSubscribed, pathname]);

  const values = useMemo(
    () => ({ userId, users, userChannelRef }),
    [userId, users, userChannelRef]
  );

  return values;
};
