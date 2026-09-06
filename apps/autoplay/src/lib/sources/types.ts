import { z } from "zod";

import type { CacheStore, SpendStore } from "@/lib/reads";
import { sourceKindSchema } from "@/lib/source-kinds";
import type { SourceKind } from "@/lib/source-kinds";

// What every source has in common. A channel is a source; the programming in
// src/lib/live.ts only ever sees items and access, never a post, a message, or
// a feed entry, so a new kind is a new adapter and nothing else.

/** One thing a source can turn into a program. A schema, since items come back out of the shared cache as data. */
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

/** What every adapter gets besides its access: what has aired, the shared cache, and the ledger of paid reads. */
export type SourceContext = {
  aired: Set<string>;
  cache: CacheStore;
  spend: SpendStore;
};

/** What reading a source takes: a grant for an API, a URL for a feed. */
export type SourceAccess =
  | { kind: "x"; accessToken: string; xUserId: string }
  | { kind: "gmail"; accessToken: string }
  | { kind: "youtube"; accessToken: string }
  | { kind: "rss"; url: string };

export type AccessOf<K extends SourceKind> = Extract<SourceAccess, { kind: K }>;

/**
 * The kind an item id carries as its prefix. Every adapter writes one; the
 * fallback to X only makes the function total.
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

/**
 * How long a source's items are kept before it is read again. An hour: a
 * program is seconds long, and a watching owner must not re-read the source
 * per program — on Google that is a slice of the day's quota, on X a paid page.
 */
export const SOURCE_CACHE_TTL_MS = 3_600_000;

const itemsSchema = z.array(itemSchema);

/** A source's items, read through `load` at most once a TTL, and the best un-aired one among them. */
export const cachedPick = async (
  context: SourceContext,
  key: string,
  load: () => Promise<Item[]>,
): Promise<Item | undefined> => {
  let items = await context.cache.get(key, itemsSchema);
  if (items === undefined) {
    items = await load();
    await context.cache.set(key, items, SOURCE_CACHE_TTL_MS);
  }
  return bestOf(items.filter((item) => !context.aired.has(item.id)));
};

/** A bearer-authenticated GET, parsed; `service` names the API in the error a viewer reads. */
export const fetchJson = async <T>(
  service: string,
  url: URL,
  accessToken: string,
  schema: z.ZodType<T>,
): Promise<T> => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`${service} request failed (${response.status})`);
  return schema.parse(await response.json());
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
