"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";

import type { ChannelSummary, LiveProgram, SessionPayload } from "@/lib/api-contract";
import { PUBLIC_CHANNEL } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { displayPostText } from "@/lib/post-text";
import { screenState, surfaceOf } from "@/lib/screen-state";
import type { LiveState, ReplayState } from "@/lib/screen-state";
import { OWNER_SOURCE_ID, SOURCE_KIND_NAMES } from "@/lib/source-kinds";
import { testStreamRequested } from "@/lib/test-stream";
import { Glyph } from "@/components/glyph";
import { InviteDialog } from "@/components/invite-dialog";
import { LiveScreen } from "@/components/live-screen";
import { ReplayScreen } from "@/components/replay-screen";
import { SourcesDialog } from "@/components/sources-dialog";

// The TV. One full-bleed screen, static while it tunes, a status bar with the
// program on air. A channel the viewer owns is a live session in this browser;
// the public channel, for anyone but its owner — and for the owner once the
// day's budget is spent — is the replay of what it recorded while live.

const login = () => {
  void authClient.signIn.social({ provider: "twitter", callbackURL: "/" });
};

const logout = async () => {
  await authClient.signOut();
  window.location.reload();
};

type ScreenProps = {
  session: SessionPayload;
  channel: ChannelSummary;
  channels: ChannelSummary[];
  onPrev: () => void;
  onNext: () => void;
  onLineup: (channels: ChannelSummary[]) => void;
  muted: boolean;
  onToggleMute: () => void;
  urlError?: string;
};

/** Pixels the ticker travels per second — a readable walking pace. */
const MARQUEE_SPEED = 45;
/** Rough character width at the status bar's 11px monospace. */
const CHAR_WIDTH = 6.6;
/** How long a caption takes to roll off as the next rolls on. */
const ROLL_MS = 400;

/** What the ticker shows: the program or recording on air. */
type OnAir = Pick<
  LiveProgram,
  "itemId" | "kind" | "text" | "link" | "authorName" | "authorUsername"
>;

/** The account behind a program: an @handle on X, a sender address, a feed host, a channel name. */
const handle = (program: OnAir): string =>
  program.kind === "x" ? `@${program.authorUsername}` : program.authorUsername;

/** How the ticker credits a program; the @handle convention is X's alone. */
const attribution = (program: OnAir): string =>
  program.kind === "x" ? handle(program) : program.authorName;

const caption = (program: OnAir): string =>
  `${displayPostText(program.text)} — ${attribution(program)}`;

/**
 * One caption, scrolling. Duration is derived from the text's length rather
 * than fixed, or a long post would race past while a short one crawled.
 */
const MarqueeCopy = (props: { text: string; roll: "on" | "off" }) => {
  const seconds = Math.max(8, (props.text.length * CHAR_WIDTH) / MARQUEE_SPEED);
  return (
    <div
      className="marquee-copy"
      data-roll={props.roll}
      style={{ animationDuration: `${ROLL_MS}ms` }}
    >
      <div className="marquee-track" style={{ animationDuration: `${seconds}s` }}>
        <span>{props.text}</span>
        <span aria-hidden>{props.text}</span>
      </div>
    </div>
  );
};

/**
 * The status bar cannot show a whole post, so it scrolls one — and is the
 * link to it. A change of program rolls the caption over rather than cutting,
 * since the picture it captions never cuts either: the old caption keeps
 * scrolling as it rolls off, and the new one rolls on beneath it. Hovering
 * pauses the scroll, which is how you read the end of a sentence you just
 * missed, and opens the whole post as a card.
 */
const Ticker = (props: { program: OnAir }) => {
  const { program } = props;
  const [seen, setSeen] = useState(program);
  const [leaving, setLeaving] = useState<OnAir | undefined>(undefined);
  if (seen.itemId !== program.itemId) {
    setSeen(program);
    setLeaving(seen);
  }
  useEffect(() => {
    if (leaving === undefined) return;
    const timer = window.setTimeout(() => setLeaving(undefined), ROLL_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  const host = program.link === undefined ? undefined : URL.parse(program.link)?.host;

  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger href={program.link} target="_blank" rel="noreferrer" className="marquee">
        {leaving !== undefined && (
          <MarqueeCopy key={leaving.itemId} text={caption(leaving)} roll="off" />
        )}
        <MarqueeCopy key={program.itemId} text={caption(program)} roll="on" />
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-30"
        >
          <PreviewCard.Popup className="win w-72 font-mono text-[11px] outline-none transition-[opacity,translate] duration-150 ease-out data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:translate-y-1 data-ending-style:opacity-0">
            <div className="win-title px-2 py-1">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
                {SOURCE_KIND_NAMES[program.kind]}
              </p>
            </div>
            <div className="space-y-1.5 p-3">
              <p className="truncate font-bold">{program.authorName}</p>
              {handle(program) !== program.authorName && (
                <p className="truncate opacity-60">{handle(program)}</p>
              )}
              <p className="leading-relaxed break-words">{displayPostText(program.text)}</p>
              {program.link !== undefined && (
                <a
                  href={program.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 pt-1 text-[10px] tracking-widest uppercase hover:underline"
                >
                  <Glyph name="open" size={9} />
                  {host}
                </a>
              )}
            </div>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
};

const channelNumber = (channel: ChannelSummary): string =>
  `CH ${String(channel.number).padStart(2, "0")}`;

const TvScreen = (props: ScreenProps) => {
  const { session, channel } = props;
  const [live, setLive] = useState<LiveState>({ status: "connecting" });
  const [replay, setReplay] = useState<ReplayState>({ status: "loading" });
  const [program, setProgram] = useState<OnAir | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // The test stream stands in for fal, so it counts as fal being there. It
  // is read off the URL, which the server render cannot see.
  const testStream = useSyncExternalStore(
    () => () => undefined,
    testStreamRequested,
    () => false,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== "k") return;
      event.preventDefault();
      setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const liveReady = session.liveReady || testStream;
  const surface = surfaceOf(channel, liveReady, live);
  const screen = screenState(surface, liveReady, live, replay);
  const playing = screen.status === "live" || screen.status === "replay";
  const liveDown = screen.status === "replay" ? screen.liveDown : undefined;
  const canSignIn = session.user === null && session.loginReady;

  return (
    <main className="flex h-dvh flex-col bg-chrome font-mono">
      <div className="win-title flex shrink-0 items-center justify-between gap-3 px-3 py-1.5">
        <p className="truncate text-xs font-bold tracking-[0.2em] uppercase">
          autoplay — {channelNumber(channel)} · {SOURCE_KIND_NAMES[channel.kind]} · {channel.label}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="title-btn">
            <Glyph name="minimize" size={8} />
          </span>
          <span className="title-btn">
            <Glyph name="maximize" size={8} />
          </span>
          <span className="title-btn">
            <Glyph name="close" size={8} />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-1">
        {/* The screen itself: a sunken well in the plastic. */}
        <div className="bevel-in relative min-h-0 w-full flex-1 overflow-hidden bg-screen">
          {surface === "live" && liveReady && (
            <LiveScreen
              sourceId={channel.sourceId}
              record={channel.sourceId === OWNER_SOURCE_ID && session.recordReady}
              muted={props.muted}
              paused={paused}
              onProgram={setProgram}
              onState={setLive}
            />
          )}
          {surface === "replay" && (
            <ReplayScreen
              sourceId={channel.sourceId}
              muted={props.muted}
              paused={paused}
              onProgram={setProgram}
              onState={setReplay}
            />
          )}

          <div className="tv-scanlines pointer-events-none absolute inset-0" />
          {!playing && (
            <div className="tv-static pointer-events-none absolute inset-0 opacity-90" />
          )}

          {screen.status === "off-air" && (
            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="win w-full max-w-sm">
                <div className="win-title flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Off air</p>
                  <span className="title-btn">
                    <Glyph name="close" size={8} />
                  </span>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-outline bg-accent text-white">
                    <Glyph name="close" size={12} />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs leading-relaxed">{screen.reason}</p>
                    {session.missingKeys.length > 0 && (
                      <div className="bevel-in bg-white/70 p-2 text-[10px] leading-relaxed">
                        <p>missing from apps/autoplay/.env:</p>
                        {session.missingKeys.map((key) => (
                          <p key={key}>· {key}</p>
                        ))}
                      </div>
                    )}
                    {canSignIn && (
                      <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase"
                      >
                        Sign in with X
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {screen.status === "tuning" && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="animate-pulse text-xs tracking-[0.4em] text-white [text-shadow:0_0_12px_rgba(0,0,0,0.9)]">
                TUNING…
              </p>
            </div>
          )}
        </div>

        {/* Status bar: caption and controls in one strip, browser-style. */}
        <div className="status-bar mt-1 flex shrink-0 items-center gap-px px-1 pt-1 pb-0.5">
          <button
            type="button"
            disabled={!playing}
            onClick={() => setPaused((value) => !value)}
            className="y2k-btn status-btn cursor-pointer disabled:cursor-default"
            aria-label={paused ? "Play" : "Pause"}
          >
            <Glyph name={paused ? "play" : "pause"} />
          </button>
          <button
            type="button"
            onClick={props.onToggleMute}
            className="y2k-btn status-btn cursor-pointer"
            aria-label={props.muted ? "Unmute" : "Mute"}
          >
            <Glyph name={props.muted ? "sound-off" : "sound-on"} />
          </button>

          <div className="status-field ml-px flex-1">
            {program === undefined ? (
              <span className="truncate">
                {props.urlError ?? (screen.status === "tuning" ? "Tuning in…" : "No signal")}
              </span>
            ) : (
              <Ticker program={program} />
            )}
          </div>

          {screen.status === "live" && (
            <div className="status-field min-w-16 shrink-0 justify-center whitespace-nowrap tracking-widest uppercase">
              <span className="text-accent">● live</span>
            </div>
          )}
          {screen.status === "replay" && (
            <div
              className="status-field min-w-16 shrink-0 justify-center whitespace-nowrap tracking-widest uppercase"
              title={liveDown}
            >
              <span className={liveDown === undefined ? undefined : "text-red-700"}>
                {liveDown === undefined ? "replay" : "off air"}
              </span>
            </div>
          )}

          {session.user !== null && (
            <button
              type="button"
              onClick={() => setSourcesOpen(true)}
              className="y2k-btn status-btn ml-px cursor-pointer"
            >
              sources
            </button>
          )}
          {props.channels.length > 1 && (
            <>
              <button
                type="button"
                onClick={props.onPrev}
                aria-label="Previous channel"
                className="y2k-btn status-btn cursor-pointer"
              >
                ch−
              </button>
              <button
                type="button"
                onClick={props.onNext}
                aria-label="Next channel"
                className="y2k-btn status-btn cursor-pointer"
              >
                ch+
              </button>
            </>
          )}
          {canSignIn && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="y2k-btn status-btn cursor-pointer"
            >
              sign in
            </button>
          )}
          {session.user !== null && (
            <button
              type="button"
              onClick={() => void logout()}
              className="y2k-btn status-btn cursor-pointer"
            >
              sign out
            </button>
          )}
        </div>
      </div>

      {inviteOpen && <InviteDialog onInvited={login} onClose={() => setInviteOpen(false)} />}
      {session.user !== null && sourcesOpen && (
        <SourcesDialog
          channels={props.channels}
          google={session.google}
          onLineup={props.onLineup}
          onClose={() => setSourcesOpen(false)}
        />
      )}
    </main>
  );
};

export type TvProps = {
  session?: SessionPayload;
  urlError?: string;
};

/** Wraps in both directions: ch− on CH 01 lands on the last channel. */
const channelAt = (channels: ChannelSummary[], tuned: number): ChannelSummary => {
  const count = channels.length;
  return channels[((tuned % count) + count) % count] ?? PUBLIC_CHANNEL;
};

export const Tv = (props: TvProps) => {
  const [tuned, setTuned] = useState(0);
  const [muted, setMuted] = useState(true);
  // The lineup as last told by the station; the sources dialog updates it
  // without a reload.
  const [lineup, setLineup] = useState<ChannelSummary[] | undefined>(undefined);

  if (props.session === undefined) {
    return (
      <main className="grid h-dvh place-items-center bg-chrome p-6 font-mono">
        <div className="win w-full max-w-sm">
          <div className="win-title px-3 py-1.5">
            <p className="text-xs font-bold tracking-[0.2em] uppercase">autoplay</p>
          </div>
          <div className="space-y-2 p-4">
            <p className="text-[11px] tracking-widest uppercase">Tuning…</p>
            <div className="bevel-in h-4 bg-white/70 p-0.5">
              <div className="h-full w-1/3 animate-pulse bg-accent" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const channels = lineup ?? props.session.channels;
  const channel = channelAt(channels, tuned);

  // A channel change remounts the screen: the session, the players and the
  // ticker are all bound to the channel they were opened for.
  return (
    <TvScreen
      key={channel.sourceId}
      session={props.session}
      channel={channel}
      channels={channels}
      onPrev={() => setTuned((value) => value - 1)}
      onNext={() => setTuned((value) => value + 1)}
      onLineup={setLineup}
      muted={muted}
      onToggleMute={() => setMuted((value) => !value)}
      urlError={props.urlError}
    />
  );
};
