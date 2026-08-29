"use client";

import { useEffect, useState } from "react";

import type { FeedPayload, UserSummary } from "@/lib/api-contract";
import { errorPayloadSchema, feedPayloadSchema, sessionPayloadSchema } from "@/lib/api-contract";
import { Reel } from "@/components/reel";

type Phase =
  | { kind: "loading" }
  | { kind: "signed-out"; missingKeys: string[]; error?: string }
  | { kind: "loading-feed"; user: UserSummary }
  | { kind: "feed-error"; user: UserSummary; error: string }
  | { kind: "reel"; user: UserSummary; feed: FeedPayload; falConfigured: boolean };

/** The ?error= query left behind by a failed OAuth redirect, then cleared. */
const takeUrlError = (): string | undefined => {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error === null) return undefined;
  window.history.replaceState(null, "", window.location.pathname);
  return error;
};

const X_KEYS = new Set(["X_CLIENT_ID", "X_CLIENT_SECRET", "SESSION_SECRET"]);

const logout = async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.reload();
};

export const FeedreelApp = () => {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const urlError = takeUrlError();
      try {
        const sessionResponse = await fetch("/api/session");
        const session = sessionPayloadSchema.parse(await sessionResponse.json());
        if (cancelled) return;

        if (session.user === null) {
          const signedOut: Phase = { kind: "signed-out", missingKeys: session.missingKeys };
          if (urlError !== undefined) signedOut.error = urlError;
          setPhase(signedOut);
          return;
        }

        const user = session.user;
        setPhase({ kind: "loading-feed", user });
        const feedResponse = await fetch("/api/feed");
        if (cancelled) return;
        if (!feedResponse.ok) {
          const body = errorPayloadSchema.safeParse(await feedResponse.json().catch(() => null));
          const error = body.success ? body.data.error : "Failed to load the feed";
          if (feedResponse.status === 401) {
            setPhase({ kind: "signed-out", missingKeys: session.missingKeys, error });
          } else {
            setPhase({ kind: "feed-error", user, error });
          }
          return;
        }
        const feed = feedPayloadSchema.parse(await feedResponse.json());
        if (cancelled) return;
        setPhase({
          kind: "reel",
          user,
          feed,
          falConfigured: !session.missingKeys.includes("FAL_KEY"),
        });
      } catch {
        if (!cancelled) {
          setPhase({ kind: "signed-out", missingKeys: [], error: "Something went wrong — reload" });
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading" || phase.kind === "loading-feed") {
    const label = phase.kind === "loading" ? "loading" : "pulling your feed";
    return (
      <main className="grid h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm text-white/60">{label}…</p>
      </main>
    );
  }

  if (phase.kind === "feed-error") {
    return (
      <main className="grid h-dvh place-items-center px-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="font-mono text-lg">feedreel</h1>
          <p className="text-sm text-red-400">{phase.error}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full px-4 py-2 text-sm text-white/60 hover:bg-white/10"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase.kind === "reel") {
    return (
      <Reel
        user={phase.user}
        feed={phase.feed}
        falConfigured={phase.falConfigured}
        onLogout={() => void logout()}
      />
    );
  }

  const missingXKeys = phase.missingKeys.filter((key) => X_KEYS.has(key));
  const loginReady = missingXKeys.length === 0;

  return (
    <main className="grid h-dvh place-items-center px-6">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <h1 className="font-mono text-3xl tracking-tight">feedreel</h1>
          <p className="text-sm text-white/60">
            Your X feed as an endless AI-generated video reel. Log in, pull your latest posts, and
            watch each one become a short clip — generated one at a time, faster than you can watch.
          </p>
        </header>

        {phase.error !== undefined && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-center text-sm text-red-300">
            {phase.error}
          </p>
        )}

        {phase.missingKeys.length > 0 && (
          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
            <p className="font-mono text-xs tracking-wide text-white/50 uppercase">Setup needed</p>
            <p className="text-sm text-white/70">
              Add these to <code className="font-mono text-white/90">apps/feedreel/.env</code> (see{" "}
              <code className="font-mono text-white/90">.env.example</code>):
            </p>
            <ul className="space-y-1">
              {phase.missingKeys.map((key) => (
                <li key={key} className="font-mono text-sm text-amber-300">
                  {key}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          {loginReady ? (
            <button
              type="button"
              onClick={() => window.location.assign("/api/auth/login")}
              className="inline-block cursor-pointer rounded-full bg-white px-6 py-3 font-mono text-sm font-semibold text-black transition hover:bg-white/85"
            >
              Continue with X
            </button>
          ) : (
            <span className="inline-block cursor-not-allowed rounded-full bg-white/15 px-6 py-3 font-mono text-sm text-white/40">
              Continue with X
            </span>
          )}
        </div>
      </div>
    </main>
  );
};
