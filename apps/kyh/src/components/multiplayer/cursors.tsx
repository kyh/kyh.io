"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { AvatarGroup } from "@/components/avatar-group";
import { ChatBubble } from "@/components/chat-bubble";
import { Cursor } from "@/components/cursor";
import type { PagePoint } from "@/lib/page-point";
import type { Player } from "@/lib/player";
import type { Line } from "@/lib/chat";
import { lineOf, readChat } from "@/lib/chat";
import { lastPointer, subscribeToPointer } from "@/lib/pointer";
import { asFinite } from "@/lib/wire";
import { useChat, usePlayers, useRoomClock, useSelf } from "./provider";

const pagePointOf = (state: Player["state"]): PagePoint | null => {
  const fromCenter = asFinite(state.fromCenter);
  const fromTop = asFinite(state.fromTop);
  return fromCenter === null || fromTop === null ? null : { fromCenter, fromTop };
};

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
  useEffect(
    () =>
      subscribeToPointer(() => {
        const at = lastPointer();
        if (at?.kind === "mouse") {
          ref.current?.style.setProperty("transform", `translate(${at.x + 6}px, ${at.y + 10}px)`);
        }
      }),
    [],
  );
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

/** Everyone's pointers and chat: redrawn as often as anyone's pointer moves. */
const Cursors = () => {
  const pathname = usePathname();
  const ownsCursors = OWN_CURSORS.has(pathname);
  const players = usePlayers();
  const me = useSelf();
  const now = useRoomClock();
  const { draft, said } = useChat(!ownsCursors);

  const others = Object.entries(ownsCursors ? {} : players);
  // Read the clock only when something is up: the prerender has nobody, and no clock.
  const at = others.length > 0 || said ? now() : 0;
  const visible = others.flatMap(([id, player]) => {
    const point = pagePointOf(player.state);
    return point && player.state.pathname === pathname
      ? [{ chat: readChat(player.state, at), id, player, point }]
      : [];
  });
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
      {visible.map(({ chat, id, player, point }) => (
        <Cursor
          key={id}
          at={point}
          // A visitor on an older page sends no stamp: take theirs as it arrives.
          t={asFinite(player.state.t) ?? now()}
          color={player.color}
          hue={player.hue}
          chat={chat}
        />
      ))}
      {me && !ownsCursors && (
        <OwnChat line={lineOf({ said: ownSaid, typing: draft })} color={me.color} hue={me.hue} />
      )}
    </>
  );
};

// The avatars sit outside the cursors so the pointers' traffic never reaches them.
export const Multiplayer = () => (
  <>
    <div className="fixed top-6 right-6 z-[1]">
      <AvatarGroup />
    </div>
    <Cursors />
  </>
);
