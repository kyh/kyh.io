"use client";

import { useEffect, useRef, useState } from "react";

import type { ChannelSummary, Clip, SessionPayload, UserSummary } from "@/lib/api-contract";
import { PUBLIC_CHANNEL, channelPayloadSchema, errorPayloadSchema } from "@/lib/api-contract";
import type { ChannelPayload } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { displayPostText } from "@/lib/post-text";
import { Glyph } from "@/components/glyph";
import { GuideDialog } from "@/components/guide-dialog";
import { SourcesDialog } from "@/components/sources-dialog";

// The TV. One full-bleed screen, an auto-hiding on-screen display, and static
// between programs. The client keeps exactly one clip buffered ahead of the
// one playing; every advance asks the channel for the next program, so
// generation only ever happens while somebody is actually watching.

type Playable = {
  kind: "fresh" | "rerun";
  clip: Clip;
};

const STATIC_SWAP_MS = 350;
const RETRY_MS = 30_000;
const SEEN_LIMIT = 16;

const requestClip = async (sourceId: string, exclude: string[]): Promise<ChannelPayload> => {
  try {
    const response = await fetch("/api/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, exclude }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const parsed = errorPayloadSchema.safeParse(body);
      return {
        kind: "off-air",
        reason: parsed.success ? parsed.data.error : "Signal lost — try again",
      };
    }
    return channelPayloadSchema.parse(body);
  } catch {
    return { kind: "off-air", reason: "Signal lost — try again" };
  }
};

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

type Slot = 0 | 1;

const other = (slot: Slot): Slot => (slot === 0 ? 1 : 0);

const TvScreen = (props: ScreenProps) => {
  const [current, setCurrent] = useState<Playable | undefined>(undefined);
  const [buffered, setBuffered] = useState<Playable | undefined>(undefined);
  const [offAir, setOffAir] = useState<string | undefined>(undefined);
  const [staticOn, setStaticOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  // Which of the two stacked players is on screen. The other one holds the
  // buffered program, already loaded, so a swap is a crossfade and not a load.
  const [activeSlot, setActiveSlot] = useState<Slot>(0);

  const videoRefs = useRef<Record<Slot, HTMLVideoElement | null>>({ 0: null, 1: null });
  const fetchingRef = useRef(false);
  const seenRef = useRef<string[]>([]);
  const fillRef = useRef<() => void>(() => undefined);
  const currentRef = useRef<Playable | undefined>(undefined);
  const bufferedRef = useRef<Playable | undefined>(undefined);
  const activeSlotRef = useRef<Slot>(0);
  const pausedRef = useRef(false);

  const markSeen = (clip: Clip) => {
    seenRef.current = [...seenRef.current.filter((id) => id !== clip.itemId), clip.itemId].slice(
      -SEEN_LIMIT,
    );
  };

  /** First program of the session: nothing to crossfade from, so cut through static. */
  const tuneIn = (program: Playable) => {
    setStaticOn(true);
    setOffAir(undefined);
    window.setTimeout(() => {
      markSeen(program.clip);
      setCurrent(program);
      window.setTimeout(() => setStaticOn(false), STATIC_SWAP_MS);
    }, 150);
  };

  const fillBuffer = async () => {
    if (fetchingRef.current || document.hidden || pausedRef.current) return;
    if (currentRef.current !== undefined && bufferedRef.current !== undefined) return;
    fetchingRef.current = true;
    try {
      const result = await requestClip(props.channel.sourceId, seenRef.current);
      if (result.kind === "off-air") {
        if (currentRef.current === undefined) {
          setOffAir(result.reason);
          setStaticOn(true);
        }
        return;
      }
      const program: Playable = { kind: result.kind, clip: result.clip };
      if (currentRef.current === undefined) {
        tuneIn(program);
        // Start buffering the next program right away so the first clip
        // doesn't have to loop while the pipeline warms up.
        window.setTimeout(() => fillRef.current(), 500);
      } else if (bufferedRef.current === undefined) {
        // The guide may have lined something up while this was in flight;
        // the viewer's pick wins over the channel's.
        setBuffered(program);
      }
    } finally {
      fetchingRef.current = false;
    }
  };
  // Refs mirror the latest render so the interval and event handlers below
  // always see current state without re-subscribing.
  useEffect(() => {
    currentRef.current = current;
    bufferedRef.current = buffered;
    activeSlotRef.current = activeSlot;
    pausedRef.current = paused;
    fillRef.current = () => {
      void fillBuffer();
    };
  });

  useEffect(() => {
    const video = videoRefs.current[activeSlot];
    if (video === null) return;
    if (paused) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [paused, activeSlot]);

  useEffect(() => {
    fillRef.current();
    const retry = setInterval(() => fillRef.current(), RETRY_MS);
    // fillBuffer declines to run while the tab is hidden, so a returning
    // viewer would otherwise wait out the retry interval.
    const onVisible = () => {
      if (!document.hidden) fillRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    for (const video of Object.values(videoRefs.current)) {
      if (video !== null) video.muted = props.muted;
    }
  }, [props.muted]);

  /**
   * Hand over to the buffered program by crossfading to the player that
   * already holds it. Nothing reloads, so there is no black frame between
   * programs. With no buffer the clip is looping already and there is nothing
   * to do but keep asking for the next one.
   */
  const advance = () => {
    const next = bufferedRef.current;
    if (next !== undefined) {
      const incoming = other(activeSlotRef.current);
      const video = videoRefs.current[incoming];
      if (video !== null) {
        video.currentTime = 0;
        if (!pausedRef.current) void video.play().catch(() => undefined);
      }
      // The refs only catch up after a commit, but fillBuffer below reads them
      // this tick — leave the buffer stale and it declines to refetch.
      bufferedRef.current = undefined;
      activeSlotRef.current = incoming;
      markSeen(next.clip);
      setBuffered(undefined);
      setCurrent(next);
      setActiveSlot(incoming);
    }
    fillRef.current();
  };

  /**
   * Line up a program of the viewer's choosing. It goes into the buffer, so
   * the clip on air plays out and the usual handover brings it in; with
   * nothing on air yet it is simply the first program.
   */
  const queueNext = (clip: Clip) => {
    const program: Playable = { kind: "rerun", clip };
    setGuideOpen(false);
    if (currentRef.current === undefined) {
      tuneIn(program);
      return;
    }
    bufferedRef.current = program;
    markSeen(clip);
    setBuffered(program);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== "k") return;
      event.preventDefault();
      setPaused((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const live = current !== undefined && current.kind === "fresh";

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
          {([0, 1] as const).map((slot) => {
            const program = slot === activeSlot ? current : buffered;
            if (program === undefined) return null;
            return (
              <video
                key={slot}
                ref={(el) => {
                  videoRefs.current[slot] = el;
                  if (el !== null) el.muted = props.muted;
                }}
                src={program.clip.videoUrl}
                autoPlay={slot === activeSlot}
                playsInline
                preload="auto"
                muted={props.muted}
                // Nothing queued behind it: loop instead of ending, so the
                // wait reads as the picture continuing rather than the same
                // clip starting over. Once a program buffers, the pass
                // finishes and `onEnded` hands over.
                loop={slot === activeSlot && buffered === undefined}
                onTimeUpdate={
                  slot === activeSlot
                    ? (event) => {
                        const el = event.currentTarget;
                        setProgress(el.duration > 0 ? el.currentTime / el.duration : 0);
                      }
                    : undefined
                }
                onEnded={slot === activeSlot ? advance : undefined}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
                  slot === activeSlot ? "opacity-100" : "opacity-0"
                }`}
              />
            );
          })}

          <div className="tv-scanlines pointer-events-none absolute inset-0" />
          {(staticOn || offAir !== undefined) && (
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

          {current === undefined && offAir === undefined && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="animate-pulse text-xs tracking-[0.4em] text-white [text-shadow:0_0_12px_rgba(0,0,0,0.9)]">
                TUNING…
              </p>
            </div>
          )}
        </div>

        {/* Seek */}
        <div
          className="seek mt-1 shrink-0"
          onPointerDown={(event) => {
            const video = videoRefs.current[activeSlot];
            if (video === null || !(video.duration > 0)) return;
            const box = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
            video.currentTime = ratio * video.duration;
            setProgress(ratio);
          }}
        >
          <div className="seek-groove" />
          <div className="seek-fill" style={{ width: `calc(${progress * 100}% - 4px)` }} />
          <div className="seek-handle" style={{ left: `calc(${progress * 100}% - 1px)` }} />
        </div>

        {/* Status bar: caption and controls in one strip, browser-style. */}
        <div className="status-bar flex shrink-0 items-center gap-px px-1 pt-1 pb-0.5">
          <button
            type="button"
            disabled={current === undefined}
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
            {current === undefined ? (
              <span className="truncate">{props.urlError ?? "No signal"}</span>
            ) : (
              <Marquee
                text={`${displayPostText(current.clip.text)} — ${attribution(current.clip)}`}
              />
            )}
          </div>

          {live && (
            <div className="status-field w-16 shrink-0 justify-center tracking-widest uppercase">
              <span className="text-accent">● live</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="y2k-btn status-btn ml-px cursor-pointer"
          >
            guide
          </button>
          {props.user !== null && (
            <button
              type="button"
              onClick={() => setSourcesOpen(true)}
              className="y2k-btn status-btn cursor-pointer"
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

      {guideOpen && (
        <GuideDialog
          sourceId={props.channel.sourceId}
          {...(buffered === undefined ? {} : { queuedItemId: buffered.clip.itemId })}
          onQueue={queueNext}
          onClose={() => setGuideOpen(false)}
        />
      )}
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

/** How the ticker credits a program; the @handle convention is X's alone. */
const attribution = (clip: Clip): string =>
  clip.kind === "x" ? `@${clip.authorUsername}` : clip.authorName;

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
    muted,
    onToggleMute: () => setMuted((value) => !value),
    user: session.user,
    loginReady,
    missingKeys: session.missingKeys,
  };
  if (props.urlError !== undefined) screenProps.urlError = props.urlError;

  return <TvScreen key={channel.sourceId} {...screenProps} />;
};
