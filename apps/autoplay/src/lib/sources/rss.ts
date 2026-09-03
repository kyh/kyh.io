import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

import { bestOf, plainText, recencyScore } from "./types";
import type { AccessOf, Item } from "./types";

// A feed URL as a source. RSS 2.0 and Atom, newest entry first. The only
// source with no grant behind it, so the URL is checked at add time and every
// fetch is bounded: http(s) only, a timeout, and a cap on entries read.

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 3_600_000;
const MAX_ENTRIES = 30;
const MAX_BODY_LENGTH = 400;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Repeated tags come back as arrays only when repeated; force the ones the
  // schema below indexes so one-entry feeds parse the same as long ones.
  isArray: (name) => name === "item" || name === "entry" || name === "link",
});

// Text nodes arrive as a string, a number, or an object when the tag carries
// attributes (Atom's <title type="html">). Both shapes parse to one: the text
// plus whichever attributes matter, which is only <link>'s href and rel.
const scalarSchema = z.union([z.string(), z.number()]).transform(String);

const textNodeSchema = z.union([
  scalarSchema.transform((text) => ({ text })),
  z
    .object({
      "#text": scalarSchema.optional(),
      "@_href": z.string().optional(),
      "@_rel": z.string().optional(),
    })
    .transform((node) => ({ text: node["#text"], href: node["@_href"], rel: node["@_rel"] })),
]);

type TextNode = z.infer<typeof textNodeSchema>;

// A field that fails to parse is dropped rather than failing the entry: one
// odd tag must not take a whole feed off the air.
const textField = textNodeSchema.optional().catch(undefined);
const linkField = z
  .union([textNodeSchema, z.array(textNodeSchema)])
  .optional()
  .catch(undefined);

const textOf = (node: TextNode | undefined): string | undefined => node?.text;

/** The entry's page: RSS puts it in text, Atom in an href, possibly one of several. */
const linkOf = (value: TextNode | TextNode[] | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const links = Array.isArray(value) ? value : [value];
  let fallback: string | undefined;
  for (const node of links) {
    if (!("href" in node)) return node.text;
    if (node.href === undefined) continue;
    if (node.rel === undefined || node.rel === "alternate") return node.href;
    fallback ??= node.href;
  }
  return fallback;
};

const entrySchema = z.object({
  title: textField,
  link: linkField,
  guid: textField,
  id: textField,
  description: textField,
  summary: textField,
  content: textField,
  "content:encoded": textField,
  pubDate: textField,
  published: textField,
  updated: textField,
});

const feedSchema = z.object({
  rss: z
    .object({
      channel: z.object({
        title: textField,
        item: z.array(entrySchema).optional(),
      }),
    })
    .optional(),
  feed: z
    .object({
      title: textField,
      entry: z.array(entrySchema).optional(),
    })
    .optional(),
});

type Feed = { title: string; entries: z.infer<typeof entrySchema>[] };

const caches = new Map<string, { items: Item[]; expiresAt: number }>();

const isHttp = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export const fetchFeed = async (url: string): Promise<Feed> => {
  if (!isHttp(url)) throw new Error("Feed URLs must start with http:// or https://");
  const response = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
  const parsed = feedSchema.safeParse(parser.parse(await response.text()));
  if (!parsed.success) throw new Error("Not an RSS or Atom feed");
  const host = new URL(url).host;
  if (parsed.data.rss !== undefined) {
    const channel = parsed.data.rss.channel;
    return { title: textOf(channel.title) ?? host, entries: channel.item ?? [] };
  }
  if (parsed.data.feed !== undefined) {
    return { title: textOf(parsed.data.feed.title) ?? host, entries: parsed.data.feed.entry ?? [] };
  }
  throw new Error("Not an RSS or Atom feed");
};

const toItems = (url: string, feed: Feed): Item[] => {
  const host = new URL(url).host;
  const items: Item[] = [];
  for (const entry of feed.entries.slice(0, MAX_ENTRIES)) {
    const link = linkOf(entry.link);
    const id = textOf(entry.guid) ?? textOf(entry.id) ?? link;
    if (id === undefined) continue;
    const title = textOf(entry.title) ?? "";
    const body =
      textOf(entry["content:encoded"]) ??
      textOf(entry.content) ??
      textOf(entry.description) ??
      textOf(entry.summary) ??
      "";
    const published = textOf(entry.pubDate) ?? textOf(entry.published) ?? textOf(entry.updated);
    const item: Item = {
      id: `rss:${id}`,
      kind: "rss",
      text: `${plainText(title, 200)}. ${plainText(body, MAX_BODY_LENGTH)}`.trim(),
      score: recencyScore(published),
      author: { name: feed.title, username: host },
    };
    if (published !== undefined && !Number.isNaN(Date.parse(published))) {
      item.createdAt = new Date(published).toISOString();
    }
    items.push(item);
  }
  return items;
};

export const pickRssCandidate = async (
  access: AccessOf<"rss">,
  sourceId: string,
  aired: Set<string>,
): Promise<Item | undefined> => {
  const cached = caches.get(sourceId);
  let items: Item[];
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    items = cached.items;
  } else {
    items = toItems(access.url, await fetchFeed(access.url));
    caches.set(sourceId, { items, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return bestOf(items.filter((item) => !aired.has(item.id)));
};
