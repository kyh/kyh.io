"use client";

import { useUserChannel } from "~/lib/use-user-channel";
import { Cursor } from "~/components/cursor";
import { AvatarGroup } from "~/components/avatar-group";
import styles from "./multiplayer.module.css";

type MultiplayerProps = {
  roomId: string;
};

export const Multiplayer = ({ roomId }: MultiplayerProps) => {
  const { userId, users } = useUserChannel({ roomId });

  const cursors = Object.entries(users)
    .filter(([_, { x, y }]) => !!x && !!y)
    .map(([userId, { x, y, color, hue }]) => (
      <Cursor key={userId} x={x} y={y} color={color} hue={hue} />
    ));

  return (
    <>
      <div className={styles.avatarsContainer}>
        <AvatarGroup currentUserId={userId} users={users} />
      </div>
      {cursors}
    </>
  );
};
