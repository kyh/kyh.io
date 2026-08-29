"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { FeedPayload, FeedPostPayload, UserSummary } from "@/lib/api-contract";
import { errorPayloadSchema, generatePayloadSchema } from "@/lib/api-contract";
import type { GeneratePayload } from "@/lib/api-contract";
import { buildVideoPrompt } from "@/lib/prompt";

type ClipStatus = "waiting" | "generating" | "ready" | "failed";

type Clip = {
  post: FeedPostPayload;
  prompt: string;
  status: ClipStatus;
  videoUrl?: string;
  error?: string;
};

type ReelProps = {
  user: UserSummary;
  feed: FeedPayload;
  falConfigured: boolean;
  onLogout: () => void;
};

// Generation (~3s/clip on the default model) outpaces watching (5s clips), so
// keeping this many clips ahead of the viewer makes the reel feel infinite.
const LOOKAHEAD = 2;

const POLL_INTERVAL_MS = 1_500;
const POLL_DEADLINE_MS = 4 * 60_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const parseGenerateResponse = async (response: Response): Promise<GeneratePayload> => {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorPayloadSchema.safeParse(body);
    throw new Error(parsed.success ? parsed.data.error : "Video generation failed");
  }
  return generatePayloadSchema.parse(body);
};

/** Submit a prompt and wait for the finished clip's URL. */
const generateClip = async (prompt: string): Promise<string> => {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  let payload = await parseGenerateResponse(response);
  const deadline = Date.now() + POLL_DEADLINE_MS;
  while (payload.status !== "done") {
    if (Date.now() > deadline) throw new Error("Video generation timed out");
    await sleep(POLL_INTERVAL_MS);
    const poll = await fetch(`/api/generate?requestId=${encodeURIComponent(payload.requestId)}`);
    payload = await parseGenerateResponse(poll);
  }
  if (payload.videoUrl === undefined) throw new Error("Video finished without a URL");
  return payload.videoUrl;
};

const timeAgo = (iso: string): string => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const Avatar = (props: { author: UserSummary }) => {
  if (props.author.profileImageUrl === undefined) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 font-mono text-sm">
        {props.author.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={props.author.profileImageUrl}
      alt={props.author.name}
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-full"
      unoptimized
    />
  );
};

export const Reel = (props: ReelProps) => {
  const [clips, setClips] = useState<Clip[]>(() =>
    props.feed.posts.map((post) => ({
      post,
      prompt: buildVideoPrompt(post.text, post.author.name),
      status: "waiting",
    })),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const inFlightRef = useRef(false);

  const patchClip = (index: number, patch: Partial<Clip>) => {
    setClips((prev) => prev.map((clip, i) => (i === index ? { ...clip, ...patch } : clip)));
  };

  // The pipeline: one generation in flight at a time, strictly in feed order,
  // and only while the buffer of ready clips is within LOOKAHEAD of playback.
  // The clip patches re-render `clips`, which re-runs the effect for the next
  // clip once the in-flight guard clears.
  useEffect(() => {
    if (!props.falConfigured || inFlightRef.current) return;
    const nextIndex = clips.findIndex((clip) => clip.status === "waiting");
    if (nextIndex === -1 || nextIndex > activeIndex + LOOKAHEAD) return;
    const clip = clips[nextIndex];
    if (clip === undefined) return;

    inFlightRef.current = true;
    const patch = (update: Partial<Clip>) => {
      setClips((prev) => prev.map((c, i) => (i === nextIndex ? { ...c, ...update } : c)));
    };
    const run = async () => {
      patch({ status: "generating" });
      try {
        const videoUrl = await generateClip(clip.prompt);
        patch({ status: "ready", videoUrl });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Video generation failed";
        patch({ status: "failed", error: message });
      } finally {
        inFlightRef.current = false;
      }
    };
    void run();
  }, [clips, activeIndex, props.falConfigured]);

  // Track which clip fills the viewport. The clip count is fixed for the life
  // of this component, so the sections only need observing once.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute("data-index"));
          if (Number.isInteger(index)) setActiveIndex(index);
        }
      },
      { root: container, threshold: 0.6 },
    );
    for (const section of sectionRefs.current) {
      if (section !== null) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  // Only the active clip plays; React's `muted` prop alone doesn't reliably
  // reach the DOM, so mirror it here. A clip that becomes ready while active
  // starts itself via its autoPlay attribute.
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video === null) return;
      video.muted = muted;
      if (index === activeIndex) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeIndex, muted]);

  const advanceFrom = (index: number) => {
    const nextSection = sectionRefs.current[index + 1];
    const nextClip = clips[index + 1];
    if (nextSection !== null && nextSection !== undefined && nextClip?.status === "ready") {
      nextSection.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // Next clip isn't ready (or this is the end) — loop the current one.
    const video = videoRefs.current[index];
    if (video !== null && video !== undefined) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    }
  };

  const readyCount = clips.filter((clip) => clip.status === "ready").length;

  if (clips.length === 0) {
    return (
      <main className="grid h-dvh place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="text-sm text-white/60">Your feed came back empty — nothing to reel.</p>
          <button
            type="button"
            onClick={props.onLogout}
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth"
      >
        {clips.map((clip, index) => (
          <section
            key={clip.post.id}
            data-index={index}
            ref={(el) => {
              sectionRefs.current[index] = el;
            }}
            className="relative flex h-dvh w-full snap-start items-center justify-center"
          >
            <div className="relative h-full max-h-dvh w-full max-w-[calc(100dvh*9/16)]">
              {clip.status === "ready" && clip.videoUrl !== undefined ? (
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  src={clip.videoUrl}
                  playsInline
                  muted={muted}
                  autoPlay={index === activeIndex}
                  onEnded={() => advanceFrom(index)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
                  <p className="max-h-[50dvh] overflow-hidden text-lg leading-relaxed text-white/85">
                    {clip.post.text}
                  </p>
                  {clip.status === "failed" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-red-400">{clip.error}</p>
                      <button
                        type="button"
                        onClick={() => patchClip(index, { status: "waiting" })}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-sm hover:bg-white/10"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <p className="animate-pulse font-mono text-xs tracking-wide text-white/50 uppercase">
                      {clip.status === "generating" ? "generating clip…" : "waiting in line…"}
                    </p>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pt-16 pb-6">
                <div className="flex items-center gap-2.5">
                  <Avatar author={clip.post.author} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{clip.post.author.name}</p>
                    <p className="truncate font-mono text-xs text-white/60">
                      @{clip.post.author.username}
                      {clip.post.createdAt !== undefined && ` · ${timeAgo(clip.post.createdAt)}`}
                    </p>
                  </div>
                </div>
                {clip.status === "ready" && (
                  <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-white/85">
                    {clip.post.text}
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-10">
        <div className="space-y-0.5">
          <p className="font-mono text-sm font-semibold">feedreel</p>
          <p className="font-mono text-[11px] text-white/50">
            {props.feed.source === "home" ? "home feed" : "your posts"} · {readyCount}/
            {clips.length} clips · @{props.user.username}
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs backdrop-blur hover:bg-white/20"
          >
            {muted ? "unmute" : "mute"}
          </button>
          <button
            type="button"
            onClick={props.onLogout}
            className="rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs backdrop-blur hover:bg-white/20"
          >
            log out
          </button>
        </div>
      </header>

      {!props.falConfigured && (
        <p className="absolute inset-x-0 bottom-0 z-10 bg-amber-400/90 px-4 py-2 text-center font-mono text-xs text-black">
          FAL_KEY is not set — showing your feed, but clips can't generate. See .env.example.
        </p>
      )}
    </main>
  );
};
