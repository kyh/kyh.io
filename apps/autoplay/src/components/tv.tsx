"use client";

import { useEffect, useRef, useState } from "react";

import type { Clip, SessionPayload, UserSummary } from "@/lib/api-contract";
import { channelPayloadSchema, errorPayloadSchema } from "@/lib/api-contract";
import type { ChannelPayload } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { displayPostText } from "@/lib/post-text";
import { ProgramsPanel } from "@/components/programs-panel";

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

const requestClip = async (personal: boolean, exclude: string[]): Promise<ChannelPayload> => {
  try {
    const response = await fetch("/api/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclude, personal }),
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
  personal: boolean;
  channelLabel: string;
  canSwitch: boolean;
  onSwitch: () => void;
  muted: boolean;
  onToggleMute: () => void;
  user: UserSummary | null;
  loginReady: boolean;
  missingKeys: string[];
  urlError?: string;
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
    seenRef.current = [...seenRef.current.filter((id) => id !== clip.postId), clip.postId].slice(
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
      const result = await requestClip(props.personal, seenRef.current);
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
      } else {
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
          <span className="title-btn">▁</span>
          <span className="title-btn">▢</span>
          <span className="title-btn">✕</span>
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
                  <span className="title-btn">✕</span>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-outline bg-accent text-sm font-bold text-white">
                    ✕
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
            {paused ? "▶" : "❚❚"}
          </button>
          <button
            type="button"
            onClick={props.onToggleMute}
            className="y2k-btn status-btn cursor-pointer"
            aria-label={props.muted ? "Unmute" : "Mute"}
          >
            {props.muted ? "🔇" : "🔊"}
          </button>

          <div className="status-field ml-px flex-1">
            <span className="truncate">
              {current === undefined
                ? props.urlError !== undefined
                  ? props.urlError
                  : "No signal"
                : `${displayPostText(current.clip.text)} — @${current.clip.authorUsername}`}
            </span>
          </div>

          {current !== undefined && (
            <div className="status-field w-16 shrink-0 justify-center tracking-widest uppercase">
              {live ? <span className="text-accent">● live</span> : <span>rerun</span>}
            </div>
          )}

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="y2k-btn status-btn ml-px cursor-pointer"
          >
            guide
          </button>
          {props.canSwitch && (
            <button
              type="button"
              onClick={props.onSwitch}
              className="y2k-btn status-btn cursor-pointer"
            >
              ch+
            </button>
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

      {guideOpen && <ProgramsPanel personal={props.personal} onClose={() => setGuideOpen(false)} />}
    </main>
  );
};

export type TvProps = {
  session?: SessionPayload;
  urlError?: string;
};

export const Tv = (props: TvProps) => {
  const [personal, setPersonal] = useState(false);
  const [muted, setMuted] = useState(true);

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
  const canSwitch = session.user !== null;
  const showPersonal = personal && canSwitch;
  const ownerLabel =
    session.ownerHandle !== null ? `CH 01 · @${session.ownerHandle}` : "CH 01 · public access";
  const channelLabel = showPersonal ? `CH 02 · @${session.user?.username}` : ownerLabel;
  // Sign-in runs through better-auth, which needs the X app, a secret, and
  // the database to store users in.
  const loginReady = !session.missingKeys.some((key) =>
    ["X_CLIENT_ID", "X_CLIENT_SECRET", "BETTER_AUTH_SECRET", "TURSO_DATABASE_URL"].includes(key),
  );

  const screenProps: ScreenProps = {
    personal: showPersonal,
    channelLabel,
    canSwitch,
    onSwitch: () => setPersonal((value) => !value),
    muted,
    onToggleMute: () => setMuted((value) => !value),
    user: session.user,
    loginReady,
    missingKeys: session.missingKeys,
  };
  if (props.urlError !== undefined) screenProps.urlError = props.urlError;

  return <TvScreen key={showPersonal ? "personal" : "owner"} {...screenProps} />;
};
