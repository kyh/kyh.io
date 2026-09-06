"use client";

import { useState } from "react";

import type { z } from "zod";

import type { ChannelSummary, SessionPayload } from "@/lib/api-contract";
import {
  addSourceRequestSchema,
  channelsPayloadSchema,
  jsonRequest,
  removeSourceRequestSchema,
  reorderSourcesRequestSchema,
  requestJson,
} from "@/lib/api-contract";
import { authClient } from "@/lib/auth-client";
import { GOOGLE_SOURCES, SOURCE_KIND_NAMES } from "@/lib/source-kinds";
import type { SourceKind } from "@/lib/source-kinds";
import { Glyph } from "@/components/glyph";
import { WindowDialog } from "@/components/window-dialog";

// The lineup, edited. Connecting a Google scope or adding a feed creates its
// channel with no further step; CH 01 is the station's and cannot be removed.

type SourcesDialogProps = {
  channels: ChannelSummary[];
  google: SessionPayload["google"];
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

const editLineup = (edit: LineupEdit) =>
  requestJson(
    "/api/sources",
    channelsPayloadSchema,
    "Couldn't change the lineup",
    jsonRequest(edit.method, edit.body),
  );

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
      props.onLineup(result.data.channels);
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
                {SOURCE_KIND_NAMES[channel.kind]}
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
          {props.google === "ready" && (
            <div className="flex flex-wrap gap-1">
              {GOOGLE_SOURCES.map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  disabled={has(entry.kind)}
                  onClick={() => connectGoogle(entry.scope)}
                  className="y2k-btn cursor-pointer px-3 py-1 text-[10px] tracking-widest uppercase disabled:cursor-default"
                >
                  {has(entry.kind)
                    ? `${entry.label} ✓`
                    : `${SOURCE_KIND_NAMES[entry.kind]} ${entry.label}`}
                </button>
              ))}
            </div>
          )}
          {props.google === "owner-only" && (
            <p className="text-[10px] opacity-60">
              Gmail and YouTube open to everyone once Google has verified the app.
            </p>
          )}
          {props.google === "unconfigured" && (
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
