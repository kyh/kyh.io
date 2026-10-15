"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { ChatBubble } from "@/components/chat-bubble";
import { Cursor } from "@/components/cursor";
import type { JsonValue } from "@/lib/player";
import type { Line } from "@/lib/chat";
import { lineOf, readChat } from "@/lib/chat";
import { SITE_ROOM } from "@/lib/party";
import { useRealtime } from "@/lib/use-realtime";

const asCoordinate = (value: JsonValue | undefined) =>
  Number.isFinite(value) ? Number(value) : undefined;

/** Pages that draw visitors themselves: the city puts pointers in the town, not on the screen. */
const OWN_CURSORS = new Set(["/showcase"]);

interface OwnChatProps {
  line: Line | null;
  color: string;
  hue: string;
}

/** This visitor's own line, following their mouse so they see what everyone else sees. */
const OwnChat = ({ line, color, hue }: OwnChatProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const place = (event: MouseEvent) => {
      ref.current?.style.setProperty(
        "transform",
        `translate(${event.clientX + 6}px, ${event.clientY + 10}px)`,
      );
    };
    window.addEventListener("mousemove", place);
    return () => window.removeEventListener("mousemove", place);
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed top-0 left-0 z-[2]"
      style={{ transform: "translate(50vw, 50vh)" }}
      aria-live="polite"
    >
      {line && <ChatBubble line={line} color={color} hue={hue} />}
    </div>
  );
};

export const Multiplayer = () => {
  const pathname = usePathname();
  const ownsCursors = OWN_CURSORS.has(pathname);
  const { draft, me, now, players, said, windowDimensions } = useRealtime({
    chat: !ownsCursors,
    room: SITE_ROOM,
  });

  // Only surface players that have announced themselves (sent a pathname). A
  // just-connected or mid-reconnect socket sits at empty state for a beat; the
  // server reaps genuinely dead ones, but this keeps those blips off the UI.
  const present = Object.fromEntries(
    Object.entries(players).filter(([, player]) => !!player.state.pathname),
  );

  const at = now();
  const visible = Object.entries(ownsCursors ? {} : present)
    .filter(
      ([, player]) => !!player.state.x && !!player.state.y && player.state.pathname === pathname,
    )
    .map(([id, player]) => ({ chat: readChat(player.state, at), id, player }));
  const ownSaid = said && said.until > at ? said : null;

  // A line comes down by the clock, not by a change in the room: wake for the next one.
  const [, setWoken] = useState(0);
  let nextUntil = ownSaid?.until ?? Infinity;
  for (const { chat } of visible) {
    nextUntil = Math.min(nextUntil, chat.said?.until ?? Infinity);
  }
  useEffect(() => {
    if (!Number.isFinite(nextUntil)) {
      return;
    }
    const timer = window.setTimeout(() => setWoken((count) => count + 1), nextUntil - now() + 50);
    return () => window.clearTimeout(timer);
  }, [nextUntil, now]);

  return (
    <>
      <div className="fixed top-6 right-6 z-[1]">
        <AvatarGroup others={present} />
      </div>
      {visible.map(({ chat, id, player }) => (
        <Cursor
          key={id}
          x={asCoordinate(player.state.x)}
          y={asCoordinate(player.state.y)}
          color={player.color}
          hue={player.hue}
          chat={chat}
          windowDimensions={windowDimensions}
        />
      ))}
      {me && !ownsCursors && (
        <OwnChat line={lineOf({ said: ownSaid, typing: draft })} color={me.color} hue={me.hue} />
      )}
    </>
  );
};
