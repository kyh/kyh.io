"use client";

import { useState } from "react";

import type { z } from "zod";

import type { ChannelSummary } from "@/lib/api-contract";
import {
  addSourceRequestSchema,
  channelsPayloadSchema,
  errorPayloadSchema,
  removeSourceRequestSchema,
  reorderSourcesRequestSchema,
} from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import type { SourceKind } from "@/lib/source-kinds";
import { Glyph } from "@/components/glyph";
import { WindowDialog } from "@/components/window-dialog";

// The lineup, edited. Connecting a Google scope or adding a feed creates its
// channel with no further step; CH 01 is the station's and cannot be removed.

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

const KIND_LABEL = {
  x: "X",
  gmail: "Newsletters",
  rss: "Feed",
  youtube: "YouTube",
} satisfies Record<SourceKind, string>;

type SourcesDialogProps = {
  channels: ChannelSummary[];
  googleReady: boolean;
  onLineup: (channels: ChannelSummary[]) => void;
  onClose: () => void;
};

/** One change to the lineup, as the sources route accepts it. */
type LineupEdit =
  | { method: "POST"; body: z.infer<typeof addSourceRequestSchema> }
  | { method: "DELETE"; body: z.infer<typeof removeSourceRequestSchema> }
  | { method: "PATCH"; body: z.infer<typeof reorderSourcesRequestSchema> };

const connectGoogle = (scope: string) => {
  void authClient.linkSocial({ provider: "google", scopes: [scope], callbackURL: "/" });
};

const editLineup = async (
  edit: LineupEdit,
): Promise<{ channels: ChannelSummary[] } | { error: string }> => {
  const response = await fetch("/api/sources", {
    method: edit.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edit.body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorPayloadSchema.safeParse(json);
    return { error: parsed.success ? parsed.data.error : "Couldn't change the lineup" };
  }
  const parsed = channelsPayloadSchema.safeParse(json);
  return parsed.success ? parsed.data : { error: "Couldn't read the lineup" };
};

export const SourcesDialog = (props: SourcesDialogProps) => {
  const [feedUrl, setFeedUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const own = props.channels.filter((channel) => channel.number > 1);
  const has = (kind: SourceKind) => own.some((channel) => channel.kind === kind);

  const apply = async (edit: LineupEdit) => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await editLineup(edit);
      if ("error" in result) {
        setError(result.error);
        return false;
      }
      props.onLineup(result.channels);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: number) => {
    const order = own.map((channel) => channel.sourceId);
    const target = index + delta;
    const moving = order[index];
    const displaced = order[target];
    if (moving === undefined || displaced === undefined) return;
    order[index] = displaced;
    order[target] = moving;
    void apply({ method: "PATCH", body: { order } });
  };

  return (
    <WindowDialog open onClose={props.onClose} title="Sources" tone="cyan">
      <div className="bevel-in m-3 min-h-0 flex-1 space-y-3 overflow-y-auto bg-white/70 p-2 text-[11px]">
        <ul className="space-y-1">
          {props.channels.map((channel, index) => (
            <li
              key={channel.sourceId}
              className="flex items-center gap-2 border-2 border-outline bg-chrome px-2 py-1"
            >
              <span className="w-12 shrink-0 tracking-widest uppercase">
                CH {String(channel.number).padStart(2, "0")}
              </span>
              <span className="w-20 shrink-0 text-[10px] tracking-widest uppercase opacity-60">
                {KIND_LABEL[channel.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate">{channel.label}</span>
              {channel.number > 1 && (
                <>
                  <button
                    type="button"
                    disabled={busy || index <= 1}
                    onClick={() => move(index - 1, -1)}
                    aria-label="Move up"
                    className="y2k-btn status-btn cursor-pointer disabled:cursor-default"
                  >
                    <Glyph name="up" size={8} />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index >= props.channels.length - 1}
                    onClick={() => move(index - 1, 1)}
                    aria-label="Move down"
                    className="y2k-btn status-btn cursor-pointer disabled:cursor-default"
                  >
                    <Glyph name="down" size={8} />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void apply({ method: "DELETE", body: { sourceId: channel.sourceId } })
                    }
                    className="y2k-btn status-btn cursor-pointer disabled:cursor-default"
                  >
                    remove
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t-2 border-outline pt-2">
          <p className="text-[10px] tracking-[0.3em] uppercase opacity-60">Connect</p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              disabled={!props.googleReady || has("gmail")}
              onClick={() => connectGoogle(GMAIL_SCOPE)}
              className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase disabled:cursor-default"
            >
              {has("gmail") ? "newsletters ✓" : "gmail newsletters"}
            </button>
            <button
              type="button"
              disabled={!props.googleReady || has("youtube")}
              onClick={() => connectGoogle(YOUTUBE_SCOPE)}
              className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase disabled:cursor-default"
            >
              {has("youtube") ? "youtube ✓" : "youtube"}
            </button>
          </div>
          {!props.googleReady && (
            <p className="text-[10px] opacity-60">
              Google isn't configured on this station — GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
            </p>
          )}
          <form
            className="flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              const url = feedUrl.trim();
              if (url === "") return;
              const body = addSourceRequestSchema.safeParse({ kind: "rss", url });
              if (!body.success) {
                setError("That doesn't look like a URL");
                return;
              }
              void apply({ method: "POST", body: body.data }).then((ok) => {
                if (ok) setFeedUrl("");
                return ok;
              });
            }}
          >
            <input
              type="url"
              required
              value={feedUrl}
              onChange={(event) => setFeedUrl(event.target.value)}
              placeholder="https://example.com/feed.xml"
              aria-label="Feed URL"
              className="bevel-in min-w-0 flex-1 bg-white px-2 py-1 text-[11px] outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase disabled:cursor-default"
            >
              add feed
            </button>
          </form>
          {error !== undefined && <p className="text-[10px] text-red-700">{error}</p>}
        </div>
      </div>
    </WindowDialog>
  );
};
