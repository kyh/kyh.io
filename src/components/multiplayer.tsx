"use client";

import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { Cursor } from "@/components/cursor";
import { useRealtime } from "@/lib/use-realtime";
import { useTrackWindow } from "@/lib/use-track-window";
import styles from "./multiplayer.module.css";

const HOST = "https://kyh-partyserver.kyh.workers.dev";
const PARTY = "kyh-server";
const ROOM = "kyh";

export const Multiplayer = () => {
  const pathname = usePathname();
  const { others } = useRealtime({
    host: HOST,
    party: PARTY,
    room: ROOM,
  });
  const windowDimensions = useTrackWindow();

  const cursors = Object.entries(others)
    .filter(
      ([_, cursor]) => !!cursor.x && !!cursor.y && cursor.pathname === pathname,
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
