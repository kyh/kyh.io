"use client";

import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { Cursor } from "@/components/cursor";
import { useRealtime } from "@/lib/use-realtime";

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
      return !!player.state.x && !!player.state.y && player.state.pathname === pathname;
    })
    .map(([id, player]) => (
      <Cursor
        key={id}
        x={player.state.x as number | undefined}
        y={player.state.y as number | undefined}
        color={player.color}
        hue={player.hue}
        windowDimensions={windowDimensions}
      />
    ));

  return (
    <>
      <div className="fixed top-6 right-6 z-[1]">
        <AvatarGroup others={players} />
      </div>
      {cursors}
    </>
  );
};
