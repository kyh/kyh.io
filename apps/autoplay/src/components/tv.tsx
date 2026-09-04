"use client";

import { useEffect, useState } from "react";

import type {
  ChannelSummary,
  LiveProgram,
  Recording,
  SessionPayload,
  UserSummary,
} from "@/lib/api-contract";
import { PUBLIC_CHANNEL } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { displayPostText } from "@/lib/post-text";
import { Glyph } from "@/components/glyph";
import { LiveScreen } from "@/components/live-screen";
import type { LiveState } from "@/components/live-screen";
import { ReplayScreen } from "@/components/replay-screen";
import type { ReplayState } from "@/components/replay-screen";
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
  channel: ChannelSummary;
  channelLabel: string;
  channels: ChannelSummary[];
  onPrev: () => void;
  onNext: () => void;
  onLineup: (channels: ChannelSummary[]) => void;
  googleReady: boolean;
  liveReady: boolean;
  recordReady: boolean;
  muted: boolean;
  onToggleMute: () => void;
  user: UserSummary | null;
  loginReady: boolean;
  missingKeys: string[];
  urlError?: string;
};

/** Pixels the ticker travels per second — a readable walking pace. */
const MARQUEE_SPEED = 45;
/** Rough character width at the status bar's 11px monospace. */
const CHAR_WIDTH = 6.6;

/**
 * The status bar cannot show a whole post, so it scrolls one. Duration is
 * derived from the text's length rather than fixed, or a long post would race
 * past while a short one crawled. Hovering pauses it, which is how you read
 * the end of a sentence you just missed.
 */
const Marquee = (props: { text: string }) => {
  const seconds = Math.max(8, (props.text.length * CHAR_WIDTH) / MARQUEE_SPEED);
  return (
    <div className="marquee" title={props.text}>
      <div className="marquee-track" style={{ animationDuration: `${seconds}s` }}>
        <span>{props.text}</span>
        <span aria-hidden>{props.text}</span>
      </div>
    </div>
  );
};

/** What the ticker shows: the program or recording on air. */
type OnAir = Pick<LiveProgram, "kind" | "text" | "authorName" | "authorUsername">;

/** How the ticker credits a program; the @handle convention is X's alone. */
const attribution = (program: OnAir): string =>
  program.kind === "x" ? `@${program.authorUsername}` : program.authorName;

const TvScreen = (props: ScreenProps) => {
  const [live, setLive] = useState<LiveState>({ status: "connecting" });
  const [replay, setReplay] = useState<ReplayState>({ status: "loading" });
  const [program, setProgram] = useState<OnAir | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== "k") return;
      event.preventDefault();
      setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isLive = props.channel.mode === "live" && props.liveReady;
  // The public channel falls back to its replay when its owner can't be live
  // — budget spent, grant expired — rather than going dark on them.
  const isReplay = props.channel.sourceId === "owner" && (!isLive || live.status === "off-air");
  const replayEmpty = isReplay && replay.status === "empty" ? replay.reason : undefined;
  const liveDown = live.status === "off-air" ? live.reason : undefined;
  let offAir: string | undefined;
  if (isReplay) {
    if (replayEmpty !== undefined) {
      offAir = liveDown === undefined ? replayEmpty : `${liveDown} ${replayEmpty}`;
    }
  } else if (!props.liveReady) {
    offAir = "The station can't go on air without fal.";
  } else {
    offAir = liveDown;
  }
  const tuning = isReplay ? replay.status === "loading" : isLive && live.status === "connecting";
  const onAir = !isReplay && isLive && live.status === "live";
  const replaying = isReplay && replay.status === "playing";

  return (
    <main className="flex h-dvh flex-col bg-chrome font-mono">
      <div className="win-title flex shrink-0 items-center justify-between gap-3 px-3 py-1.5">
        <p className="truncate text-xs font-bold tracking-[0.2em] uppercase">
          AUTOPLAY.TV — {props.channelLabel}
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
          {isLive && !isReplay && (
            <LiveScreen
              sourceId={props.channel.sourceId}
              record={props.channel.sourceId === "owner" && props.recordReady}
              muted={props.muted}
              paused={paused}
              onProgram={setProgram}
              onState={setLive}
            />
          )}
          {isReplay && (
            <ReplayScreen
              sourceId={props.channel.sourceId}
              muted={props.muted}
              paused={paused}
              onProgram={(recording: Recording | undefined) => setProgram(recording)}
              onState={setReplay}
            />
          )}

          <div className="tv-scanlines pointer-events-none absolute inset-0" />
          {!onAir && !replaying && (
            <div className="tv-static pointer-events-none absolute inset-0 opacity-90" />
          )}

          {offAir !== undefined && (
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
                    <p className="text-xs leading-relaxed">{offAir}</p>
                    {props.missingKeys.length > 0 && (
                      <div className="bevel-in bg-white/70 p-2 text-[10px] leading-relaxed">
                        <p>missing from apps/autoplay/.env:</p>
                        {props.missingKeys.map((key) => (
                          <p key={key}>· {key}</p>
                        ))}
                      </div>
                    )}
                    {props.user === null && props.loginReady && (
                      <button
                        type="button"
                        onClick={login}
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

          {tuning && (
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
            disabled={!onAir && !replaying}
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
              <span className="truncate">{props.urlError ?? "No signal"}</span>
            ) : (
              <Marquee text={`${displayPostText(program.text)} — ${attribution(program)}`} />
            )}
          </div>

          {onAir && (
            <div className="status-field w-16 shrink-0 justify-center tracking-widest uppercase">
              <span className="text-accent">● live</span>
            </div>
          )}
          {replaying && (
            <div className="status-field w-16 shrink-0 justify-center tracking-widest uppercase">
              <span>replay</span>
            </div>
          )}

          {props.user !== null && (
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
          {props.user === null ? (
            props.loginReady && (
              <button type="button" onClick={login} className="y2k-btn status-btn cursor-pointer">
                sign in
              </button>
            )
          ) : (
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

      {props.user !== null && sourcesOpen && (
        <SourcesDialog
          channels={props.channels}
          googleReady={props.googleReady}
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

const channelNumber = (channel: ChannelSummary): string =>
  `CH ${String(channel.number).padStart(2, "0")}`;

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
            <p className="text-xs font-bold tracking-[0.2em] uppercase">AUTOPLAY.TV</p>
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

  const session = props.session;
  const channels = lineup ?? session.channels;
  const channel = channelAt(channels, tuned);
  // Sign-in runs through better-auth, which needs the X app, a secret, and
  // the database to store users in.
  const loginReady = !session.missingKeys.some((key) =>
    ["X_CLIENT_ID", "X_CLIENT_SECRET", "BETTER_AUTH_SECRET", "TURSO_DATABASE_URL"].includes(key),
  );

  const screenProps: ScreenProps = {
    channel,
    channelLabel: `${channelNumber(channel)} · ${channel.label}`,
    channels,
    onPrev: () => setTuned((value) => value - 1),
    onNext: () => setTuned((value) => value + 1),
    onLineup: setLineup,
    googleReady: session.googleReady,
    liveReady: session.liveReady,
    recordReady: session.recordReady,
    muted,
    onToggleMute: () => setMuted((value) => !value),
    user: session.user,
    loginReady,
    missingKeys: session.missingKeys,
  };
  if (props.urlError !== undefined) screenProps.urlError = props.urlError;

  return <TvScreen key={channel.sourceId} {...screenProps} />;
};
