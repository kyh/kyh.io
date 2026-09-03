"use client";

import { useEffect, useState } from "react";

import type { Clip, Program } from "@/lib/api-contract";
import { programsPayloadSchema } from "@/lib/api-contract";
import { displayPostText } from "@/lib/post-text";
import { WindowDialog } from "@/components/window-dialog";

// The programme guide: everything this channel has aired. Pick one and it
// airs next — the current program plays out first, so the guide never cuts a
// clip off mid-shot. The channel's own account can also take a clip off the
// air; that does not delete it, the item stays marked as already generated,
// so retiring a bad clip never invites paying for the same item twice.

type GuideDialogProps = {
  sourceId: string;
  /** The program already lined up, so the guide can say so instead of offering it again. */
  queuedItemId?: string;
  onQueue: (clip: Clip) => void;
  onClose: () => void;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; programs: Program[]; editable: boolean };

const airedAt = (generatedAt: number): string =>
  new Date(generatedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const credit = (clip: Clip): string =>
  clip.kind === "x" ? `@${clip.authorUsername}` : clip.authorName;

export const GuideDialog = (props: GuideDialogProps) => {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [pending, setPending] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          `/api/programs?sourceId=${encodeURIComponent(props.sourceId)}`,
        );
        const payload = programsPayloadSchema.parse(await response.json());
        if (!cancelled) {
          setState({ status: "ready", programs: payload.programs, editable: payload.editable });
        }
      } catch {
        if (!cancelled) setState({ status: "error", message: "Couldn't load the guide" });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [props.sourceId]);

  const toggle = async (program: Program) => {
    if (state.status !== "ready") return;
    const next = !program.hidden;
    setPending(program.clip.itemId);
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: program.clip.itemId,
          sourceId: props.sourceId,
          hidden: next,
        }),
      });
      if (!response.ok) return;
      setState({
        ...state,
        programs: state.programs.map((entry) =>
          entry.clip.itemId === program.clip.itemId ? { ...entry, hidden: next } : entry,
        ),
      });
    } finally {
      setPending(undefined);
    }
  };

  return (
    <WindowDialog open onClose={props.onClose} title="Programme guide">
      <div className="bevel-in m-3 min-h-0 flex-1 overflow-y-auto bg-white/70 p-2">
        {state.status === "loading" && (
          <p className="animate-pulse text-[11px] tracking-[0.3em] uppercase">Loading…</p>
        )}
        {state.status === "error" && <p className="text-[11px] text-red-700">{state.message}</p>}
        {state.status === "ready" && state.programs.length === 0 && (
          <p className="text-[11px] opacity-60">Nothing has aired on this channel yet.</p>
        )}
        {state.status === "ready" && (
          <ul className="space-y-2">
            {state.programs.map((program) => {
              const queued = props.queuedItemId === program.clip.itemId;
              return (
                <li
                  key={program.clip.itemId}
                  className={`flex items-start gap-3 border-2 border-outline bg-chrome p-2 ${
                    program.hidden ? "opacity-50" : ""
                  }`}
                >
                  <button
                    type="button"
                    disabled={queued}
                    onClick={() => props.onQueue(program.clip)}
                    aria-label={`Play next: ${displayPostText(program.clip.text)}`}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left disabled:cursor-default"
                  >
                    <video
                      src={program.clip.videoUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="bevel-in h-14 w-24 shrink-0 bg-screen object-cover"
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="line-clamp-2 block text-[11px] leading-relaxed">
                        {displayPostText(program.clip.text)}
                      </span>
                      <span className="block text-[10px] opacity-60">
                        {credit(program.clip)} · {airedAt(program.clip.generatedAt)}
                        {program.hidden ? " · off air" : ""}
                      </span>
                      {queued && (
                        <span className="block text-[10px] tracking-widest text-accent uppercase">
                          ▶ up next
                        </span>
                      )}
                    </span>
                  </button>
                  {state.editable && (
                    <button
                      type="button"
                      disabled={pending === program.clip.itemId}
                      onClick={() => void toggle(program)}
                      className="y2k-btn shrink-0 cursor-pointer px-2 py-1 text-[10px] tracking-widest uppercase"
                    >
                      {program.hidden ? "restore" : "archive"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WindowDialog>
  );
};
