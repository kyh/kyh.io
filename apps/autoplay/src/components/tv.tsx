"use client";

import { useEffect, useRef, useState } from "react";

import type { Clip, SessionPayload, UserSummary } from "@/lib/api-contract";
import { channelPayloadSchema, errorPayloadSchema } from "@/lib/api-contract";
import type { ChannelPayload } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { ProgramsPanel } from "@/components/programs-panel";

// The TV. One full-bleed screen, an auto-hiding on-screen display, and static
// between programs. The client keeps exactly one clip buffered ahead of the
// one playing; every advance asks the channel for the next program, so
// generation only ever happens while somebody is actually watching.

type Playable = {
  kind: "fresh" | "rerun";
  clip: Clip;
};

const OSD_HIDE_MS = 4_000;
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
  const [osdOn, setOsdOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // Which of the two stacked players is on screen. The other one holds the
  // buffered program, already loaded, so a swap is a crossfade and not a load.
  const [activeSlot, setActiveSlot] = useState<Slot>(0);

  const videoRefs = useRef<Record<Slot, HTMLVideoElement | null>>({ 0: null, 1: null });
  const fetchingRef = useRef(false);
  const seenRef = useRef<string[]>([]);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fillRef = useRef<() => void>(() => undefined);
  const wakeOsdRef = useRef<() => void>(() => undefined);
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
  const wakeOsd = () => {
    setOsdOn(true);
    if (osdTimerRef.current !== undefined) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => setOsdOn(false), OSD_HIDE_MS);
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
    wakeOsdRef.current = wakeOsd;
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
    osdTimerRef.current = setTimeout(() => setOsdOn(false), OSD_HIDE_MS);
    return () => {
      if (osdTimerRef.current !== undefined) clearTimeout(osdTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== "k") return;
      event.preventDefault();
      setPaused((value) => !value);
      wakeOsdRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main
      className={`relative h-dvh overflow-hidden bg-black font-mono text-white ${osdOn ? "" : "cursor-none"}`}
      onPointerMove={wakeOsd}
      onPointerDown={wakeOsd}
    >
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
            // Nothing queued behind it: loop instead of ending, so the wait
            // reads as the picture continuing rather than the same clip
            // starting over. Once a program buffers, the pass finishes and
            // `onEnded` hands over.
            loop={slot === activeSlot && buffered === undefined}
            onEnded={slot === activeSlot ? advance : undefined}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
              slot === activeSlot ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      {guideOpen && <ProgramsPanel personal={props.personal} onClose={() => setGuideOpen(false)} />}

      {/* CRT dressing */}
      <div className="tv-scanlines pointer-events-none absolute inset-0" />
      {(staticOn || offAir !== undefined) && (
        <div className="tv-static pointer-events-none absolute inset-0 opacity-90" />
      )}

      {offAir !== undefined && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="max-w-md space-y-4 px-6 text-center [text-shadow:0_0_12px_rgba(0,0,0,0.9)]">
            <p className="text-3xl font-bold tracking-[0.3em]">OFF AIR</p>
            <p className="text-sm text-white/80">{offAir}</p>
            {props.missingKeys.length > 0 && (
              <div className="space-y-1 text-left text-xs text-amber-300">
                <p className="text-white/60">missing from apps/autoplay/.env:</p>
                {props.missingKeys.map((key) => (
                  <p key={key}>· {key}</p>
                ))}
              </div>
            )}
            {props.user === null && props.loginReady && (
              <button
                type="button"
                onClick={login}
                className="cursor-pointer rounded-sm border border-white/40 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10"
              >
                Sign in with X
              </button>
            )}
          </div>
        </div>
      )}

      {current === undefined && offAir === undefined && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="animate-pulse text-sm tracking-[0.4em] [text-shadow:0_0_12px_rgba(0,0,0,0.9)]">
            TUNING…
          </p>
        </div>
      )}

      {/* On-screen display */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${osdOn ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute top-0 right-0 left-0 flex items-start justify-between p-4 text-xs tracking-widest [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
          <div className="space-y-1">
            <p className="font-bold">AUTOPLAY·TV</p>
            <p className="text-white/70">{props.channelLabel}</p>
            {props.urlError !== undefined && <p className="text-red-400">{props.urlError}</p>}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {current !== undefined &&
              (current.kind === "fresh" ? (
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="size-2 animate-pulse rounded-full bg-red-500" />
                  LIVE
                </span>
              ) : (
                <span className="text-white/60">RERUN</span>
              ))}
            {current !== undefined && (
              <button
                type="button"
                onClick={() => setPaused((value) => !value)}
                className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
              >
                {paused ? "play" : "pause"}
              </button>
            )}
            <button
              type="button"
              onClick={props.onToggleMute}
              className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
            >
              {props.muted ? "unmute" : "mute"}
            </button>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between gap-6 p-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
          {current !== undefined ? (
            <div className="min-w-0 space-y-1">
              <p className="line-clamp-2 max-w-xl text-sm leading-relaxed normal-case">
                {current.clip.text}
              </p>
              <p className="text-xs text-white/60">@{current.clip.authorUsername}</p>
            </div>
          ) : (
            <div />
          )}
          <div className="pointer-events-auto flex shrink-0 items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
            >
              guide
            </button>
            {props.canSwitch && (
              <button
                type="button"
                onClick={props.onSwitch}
                className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
              >
                ch +
              </button>
            )}
            {props.user === null ? (
              props.loginReady && (
                <button
                  type="button"
                  onClick={login}
                  className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
                >
                  sign in
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => void logout()}
                className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
              >
                sign out
              </button>
            )}
          </div>
        </div>
      </div>
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
      <main className="relative h-dvh overflow-hidden bg-black font-mono text-white">
        <div className="tv-static absolute inset-0 opacity-90" />
        <div className="tv-scanlines pointer-events-none absolute inset-0" />
        <div className="absolute inset-0 grid place-items-center">
          <p className="animate-pulse text-sm tracking-[0.4em] [text-shadow:0_0_12px_rgba(0,0,0,0.9)]">
            TUNING…
          </p>
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
