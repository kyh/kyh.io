"use client";

import { Cursor } from "~/components/cursor";
import { AvatarGroup } from "~/components/avatar-group";
import styles from "./multiplayer.module.css";
import { useRealtime } from "~/lib/use-realtime";
import { useTrackWindow } from "~/lib/use-track-window";
import { usePathname } from "next/navigation";

export const Multiplayer = () => {
  const pathname = usePathname();
  const { others } = useRealtime({
    host: "https://kyh-party.kaiyu.partykit.dev",
    room: "kyh",
  });
  const windowDimensions = useTrackWindow();

  const cursors = Object.entries(others)
    .filter(
      ([_, cursor]) => !!cursor.x && !!cursor.y && cursor.pathname === pathname
    )
    .map(([id, cursor]) => (
      <Cursor
        key={id}
        x={cursor.x}
        y={cursor.y}
        color={cursor.color}
        hue={cursor.hue}
        windowDimensions={windowDimensions}
      />
    ));

  return (
    <>
      <div className={styles.avatarsContainer}>
        <AvatarGroup others={others} />
      </div>
      {cursors}
    </>
  );
};
