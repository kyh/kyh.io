"use client";

import * as stylex from "@stylexjs/stylex";

import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { Cursor } from "@/components/cursor";
import type { JsonValue } from "@/lib/player";
import { useRealtime } from "@/lib/use-realtime";

const asCoordinate = (value: JsonValue | undefined) =>
  Number.isFinite(value) ? Number(value) : undefined;

// const HOST = "http://localhost:8787";
const HOST = "https://kyh-party.kyh.workers.dev";
const PARTY = "kyh-server";
const ROOM = "kyh";

const styles = stylex.create({
  root: { position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 1 },
});

export const Multiplayer = () => {
  const pathname = usePathname();
  const { players, windowDimensions } = useRealtime({
    host: HOST,
    party: PARTY,
    room: ROOM,
  });

  // Only surface players that have announced themselves (sent a pathname). A
  // just-connected or mid-reconnect socket sits at empty state for a beat; the
  // server reaps genuinely dead ones, but this keeps those blips off the UI.
  const present = Object.fromEntries(
    Object.entries(players).filter(([, player]) => !!player.state.pathname),
  );

  const cursors = Object.entries(present)
    .filter(([, player]) => {
      return !!player.state.x && !!player.state.y && player.state.pathname === pathname;
    })
    .map(([id, player]) => (
      <Cursor
        key={id}
        x={asCoordinate(player.state.x)}
        y={asCoordinate(player.state.y)}
        color={player.color}
        hue={player.hue}
        windowDimensions={windowDimensions}
      />
    ));

  return (
    <>
      <div {...stylex.props(styles.root)}>
        <AvatarGroup others={present} />
      </div>
      {cursors}
    </>
  );
};
