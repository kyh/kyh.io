import { z } from "zod";

import { SOURCE_KINDS } from "@/lib/source-kinds";
import type { SourceKind } from "@/lib/source-kinds";

// What every source has in common. A channel is a source; the scheduler in
// channel.ts only ever sees items and access, never a post, a message, or a
// feed entry, so a new kind is a new adapter and nothing else.

export const sourceKindSchema = z.enum(SOURCE_KINDS);

/**
 * One thing a source can turn into a program. Stored as JSON on the pending
 * job while its video generates, hence the schema rather than a plain type.
 */
export const itemSchema = z.object({
  /** Unique across kinds: `{kind}:{id inside the source}`. */
  id: z.string(),
  kind: sourceKindSchema,
  /** What the prompt and the status-bar ticker are built from. */
  text: z.string(),
  createdAt: z.string().optional(),
  /** Higher airs first — engagement on X, recency or views elsewhere. */
  score: z.number(),
  author: z.object({
    name: z.string(),
    /** An X handle, a sender address, a feed host, a channel name. */
    username: z.string(),
    profileImageUrl: z.string().optional(),
  }),
});

export type Item = z.infer<typeof itemSchema>;

/** What reading a source takes: a grant for an API, a URL for a feed. */
export type SourceAccess =
  | { kind: "x"; accessToken: string; xUserId: string }
  | { kind: "gmail"; accessToken: string }
  | { kind: "youtube"; accessToken: string }
  | { kind: "rss"; url: string };

export type AccessOf<K extends SourceKind> = Extract<SourceAccess, { kind: K }>;

/**
 * The kind an item id carries as its prefix. Ids written before there were
 * other kinds are bare X post ids, so no prefix means X.
 */
export const itemKind = (itemId: string): SourceKind => {
  const prefix = itemId.slice(0, itemId.indexOf(":"));
  const parsed = sourceKindSchema.safeParse(prefix);
  return parsed.success ? parsed.data : "x";
};

export const bestOf = (items: Item[]): Item | undefined => {
  let best: Item | undefined;
  for (const item of items) {
    if (best === undefined || item.score > best.score) best = item;
  }
  return best;
};

/** Minutes since the epoch: a recency score that stays comparable across kinds. */
export const recencyScore = (iso: string | undefined): number => {
  if (iso === undefined) return 0;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : Math.round(ms / 60_000);
};

const NAMED_ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
  ["nbsp", " "],
]);

/** APIs hand back HTML-escaped snippets; a prompt should not read "&#39;". */
export const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return NAMED_ENTITIES.get(entity.toLowerCase()) ?? whole;
  });

/** Markup stripped, entities decoded, whitespace collapsed, length bounded. */
export const plainText = (html: string, maxLength: number): string => {
  const text = decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
};
