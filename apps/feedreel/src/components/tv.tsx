"use client";

import { useEffect, useRef, useState } from "react";

import type { Clip, SessionPayload, UserSummary } from "@/lib/api-contract";
import { channelPayloadSchema, errorPayloadSchema } from "@/lib/api-contract";
import type { ChannelPayload } from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";

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

const TvScreen = (props: ScreenProps) => {
  const [current, setCurrent] = useState<Playable | undefined>(undefined);
  const [buffered, setBuffered] = useState<Playable | undefined>(undefined);
  const [offAir, setOffAir] = useState<string | undefined>(undefined);
  const [staticOn, setStaticOn] = useState(true);
  const [osdOn, setOsdOn] = useState(true);
  const [playCount, setPlayCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fetchingRef = useRef(false);
  const seenRef = useRef<string[]>([]);
  const osdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fillRef = useRef<() => void>(() => undefined);
  const currentRef = useRef<Playable | undefined>(undefined);
  const bufferedRef = useRef<Playable | undefined>(undefined);

  const markSeen = (clip: Clip) => {
    seenRef.current = [...seenRef.current.filter((id) => id !== clip.postId), clip.postId].slice(
      -SEEN_LIMIT,
    );
  };

  const tuneIn = (program: Playable) => {
    setStaticOn(true);
    setOffAir(undefined);
    window.setTimeout(() => {
      markSeen(program.clip);
      setCurrent(program);
      setPlayCount((count) => count + 1);
      window.setTimeout(() => setStaticOn(false), STATIC_SWAP_MS);
    }, 150);
  };

  const fillBuffer = async () => {
    if (fetchingRef.current || document.hidden) return;
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
    fillRef.current = () => {
      void fillBuffer();
    };
  });

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
    const video = videoRef.current;
    if (video !== null) video.muted = props.muted;
  }, [props.muted]);

  const advance = () => {
    const next = bufferedRef.current;
    if (next !== undefined) {
      // The refs only catch up after a commit, but fillBuffer below reads them
      // this tick — leave the buffer stale and it declines to refetch.
      bufferedRef.current = undefined;
      setBuffered(undefined);
      tuneIn(next);
    } else {
      const video = videoRef.current;
      if (video !== null) {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      }
    }
    fillRef.current();
  };

  const wakeOsd = () => {
    setOsdOn(true);
    if (osdTimerRef.current !== undefined) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => setOsdOn(false), OSD_HIDE_MS);
  };

  useEffect(() => {
    osdTimerRef.current = setTimeout(() => setOsdOn(false), OSD_HIDE_MS);
    return () => {
      if (osdTimerRef.current !== undefined) clearTimeout(osdTimerRef.current);
    };
  }, []);

  return (
    <main
      className={`relative h-dvh overflow-hidden bg-black font-mono text-white ${osdOn ? "" : "cursor-none"}`}
      onPointerMove={wakeOsd}
      onPointerDown={wakeOsd}
    >
      {current !== undefined && (
        <video
          key={`${current.clip.postId}:${playCount}`}
          ref={(el) => {
            videoRef.current = el;
            if (el !== null) el.muted = props.muted;
          }}
          src={current.clip.videoUrl}
          autoPlay
          playsInline
          muted={props.muted}
          onEnded={advance}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

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
                <p className="text-white/60">missing from apps/feedreel/.env:</p>
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
            <p className="font-bold">FEEDREEL·TV</p>
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
