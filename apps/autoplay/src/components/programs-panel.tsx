"use client";

import { useEffect, useState } from "react";

import type { Program } from "@/lib/api-contract";
import { programsPayloadSchema } from "@/lib/api-contract";

// The programme guide: everything this channel has aired, with the ability to
// take a clip off the air. Pulling one does not delete it — the post stays
// marked as already generated, so retiring a bad clip never invites paying for
// the same post twice.

type PanelProps = {
  personal: boolean;
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

export const ProgramsPanel = (props: PanelProps) => {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [pending, setPending] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/programs?personal=${String(props.personal)}`);
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
  }, [props.personal]);

  const toggle = async (program: Program) => {
    if (state.status !== "ready") return;
    const next = !program.hidden;
    setPending(program.clip.postId);
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: program.clip.postId,
          personal: props.personal,
          hidden: next,
        }),
      });
      if (!response.ok) return;
      setState({
        ...state,
        programs: state.programs.map((entry) =>
          entry.clip.postId === program.clip.postId ? { ...entry, hidden: next } : entry,
        ),
      });
    } finally {
      setPending(undefined);
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black/85 font-mono text-white backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-3 text-xs tracking-widest uppercase">
        <p className="font-bold">Programme guide</p>
        <button
          type="button"
          onClick={props.onClose}
          className="cursor-pointer rounded-sm border border-white/30 px-2 py-1 uppercase hover:bg-white/10"
        >
          close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state.status === "loading" && (
          <p className="animate-pulse text-xs tracking-[0.3em]">LOADING…</p>
        )}
        {state.status === "error" && <p className="text-xs text-red-400">{state.message}</p>}
        {state.status === "ready" && state.programs.length === 0 && (
          <p className="text-xs text-white/60">Nothing has aired on this channel yet.</p>
        )}
        {state.status === "ready" && (
          <ul className="space-y-2">
            {state.programs.map((program) => (
              <li
                key={program.clip.postId}
                className={`flex items-start gap-3 rounded-sm border border-white/10 p-2 ${
                  program.hidden ? "opacity-40" : ""
                }`}
              >
                <video
                  src={program.clip.videoUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-14 w-24 shrink-0 rounded-sm bg-black object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-xs leading-relaxed">{program.clip.text}</p>
                  <p className="text-[10px] text-white/50">
                    @{program.clip.authorUsername} · {airedAt(program.clip.generatedAt)}
                    {program.hidden ? " · off air" : ""}
                  </p>
                </div>
                {state.editable && (
                  <button
                    type="button"
                    disabled={pending === program.clip.postId}
                    onClick={() => void toggle(program)}
                    className="shrink-0 cursor-pointer rounded-sm border border-white/30 px-2 py-1 text-[10px] tracking-widest uppercase hover:bg-white/10 disabled:opacity-50"
                  >
                    {program.hidden ? "restore" : "archive"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
