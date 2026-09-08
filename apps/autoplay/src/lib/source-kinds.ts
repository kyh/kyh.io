import { z } from "zod";

// The kinds of source a channel can be, and what the client and the server
// both know about them — small enough to reach the browser bundle untouched.
// The adapters (src/lib/sources) and the lineup (src/lib/lineup.ts) hold the
// rest.
export const SOURCE_KINDS = ["x", "gmail", "rss", "youtube"] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const sourceKindSchema = z.enum(SOURCE_KINDS);

/** The service each kind pulls from, as the chrome names it. */
export const SOURCE_KIND_NAMES = {
  gmail: "Gmail",
  rss: "RSS",
  x: "X",
  youtube: "YouTube",
} satisfies Record<SourceKind, string>;

/** The public channel, CH 01: the owner's X, with no `source` row behind it. */
export const OWNER_SOURCE_ID = "owner";

/**
 * The sources a Google grant creates, one per scope it carries: the sources
 * dialog asks for the scope, and the lineup turns the granted scope into a
 * channel with this label.
 */
export const GOOGLE_SOURCES = [
  {
    kind: "gmail",
    label: "Newsletters",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  },
  {
    kind: "youtube",
    label: "Subscriptions",
    scope: "https://www.googleapis.com/auth/youtube.readonly",
  },
] as const satisfies readonly { kind: SourceKind; scope: string; label: string }[];
