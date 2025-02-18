"use client";

import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { Cursor } from "@/components/cursor";
import { useRealtime } from "@/lib/use-realtime";
import styles from "./multiplayer.module.css";

// const HOST = "http://localhost:8787";
const HOST = "https://kyh-partyserver.kyh.workers.dev";
const PARTY = "kyh-server";
const ROOM = "kyh";

export const Multiplayer = () => {
  const pathname = usePathname();
  const { players, windowDimensions } = useRealtime({
    host: HOST,
    party: PARTY,
    room: ROOM,
  });

  const cursors = Object.entries(players)
    .filter(([_, player]) => {
      return (
        !!player.position?.x &&
        !!player.position.y &&
        player.position.pathname === pathname
      );
    })
    .map(([id, player]) => (
      <Cursor
        key={id}
        x={player.position?.x}
        y={player.position?.y}
        color={player.color}
        hue={player.hue}
        windowDimensions={windowDimensions}
      />
    ));

  return (
    <>
      <div className={styles.avatarsContainer}>
        <AvatarGroup others={players} />
      </div>
      {cursors}
    </>
  );
};
