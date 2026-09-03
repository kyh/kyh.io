import { z } from "zod";

import { bestOf, decodeEntities } from "./types";
import type { AccessOf, Item } from "./types";

// Gmail as a source: newsletters only. What counts is decided by the list
// headers every newsletter platform sets, not by the search query — the query
// just bounds how much recent mail is looked at. Mail has no engagement
// signal, so the newest newsletter airs first and unread ones jump the queue.

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const LIST_QUERY = "newer_than:7d -in:chats -category:social";
const MAX_MESSAGES = 40;
/** The Gmail API is free within quota; this just spares a watching owner a re-read per program. */
const CACHE_TTL_MS = 3_600_000;
/** An unread newsletter outranks a read one by this much: a day. */
const UNREAD_BONUS_MINUTES = 24 * 60;
const METADATA_HEADERS = ["From", "Subject", "List-Id", "List-Unsubscribe"];

const listSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
});

const messageSchema = z.object({
  id: z.string(),
  snippet: z.string().optional(),
  internalDate: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  payload: z
    .object({
      headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    })
    .optional(),
});

type Header = { name: string; value: string };

type Sender = { name: string; address: string };

const caches = new Map<string, { items: Item[]; expiresAt: number }>();

const gmailFetch = async <T>(
  accessToken: string,
  path: string,
  params: [string, string][],
  schema: z.ZodType<T>,
): Promise<T> => {
  const url = new URL(`${GMAIL_BASE}/${path}`);
  for (const [key, value] of params) url.searchParams.append(key, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Gmail request failed (${response.status})`);
  return schema.parse(await response.json());
};

const header = (headers: Header[], name: string): string | undefined =>
  headers.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value;

/** `"Name" <addr>`, `Name <addr>`, or a bare address. */
export const parseFrom = (value: string): Sender => {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (match === null) return { name: value.trim(), address: value.trim() };
  const address = (match[2] ?? value).trim();
  const name = (match[1] ?? "").trim();
  return { name: name === "" ? address : name, address };
};

export const isNewsletter = (headers: Header[]): boolean =>
  header(headers, "List-Id") !== undefined || header(headers, "List-Unsubscribe") !== undefined;

const fetchNewsletters = async (access: AccessOf<"gmail">): Promise<Item[]> => {
  const list = await gmailFetch(
    access.accessToken,
    "messages",
    [
      ["q", LIST_QUERY],
      ["maxResults", String(MAX_MESSAGES)],
    ],
    listSchema,
  );
  const messages = await Promise.all(
    (list.messages ?? []).map((entry) =>
      gmailFetch(
        access.accessToken,
        `messages/${entry.id}`,
        [
          ["format", "metadata"],
          ...METADATA_HEADERS.map((name): [string, string] => ["metadataHeaders", name]),
        ],
        messageSchema,
      ),
    ),
  );

  const items: Item[] = [];
  for (const message of messages) {
    const headers = message.payload?.headers ?? [];
    if (!isNewsletter(headers)) continue;
    const subject = header(headers, "Subject") ?? "(no subject)";
    const from = parseFrom(header(headers, "From") ?? "");
    const receivedMs = Number(message.internalDate ?? 0);
    const unread = (message.labelIds ?? []).includes("UNREAD");
    const item: Item = {
      id: `gmail:${message.id}`,
      kind: "gmail",
      text: `${subject}. ${decodeEntities(message.snippet ?? "")}`.trim(),
      score: Math.round(receivedMs / 60_000) + (unread ? UNREAD_BONUS_MINUTES : 0),
      author: { name: from.name, username: from.address },
    };
    if (receivedMs > 0) item.createdAt = new Date(receivedMs).toISOString();
    items.push(item);
  }
  return items;
};

export const pickGmailCandidate = async (
  access: AccessOf<"gmail">,
  sourceId: string,
  aired: Set<string>,
): Promise<Item | undefined> => {
  const cached = caches.get(sourceId);
  let items: Item[];
  if (cached !== undefined && cached.expiresAt > Date.now()) {
    items = cached.items;
  } else {
    items = await fetchNewsletters(access);
    caches.set(sourceId, { items, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return bestOf(items.filter((item) => !aired.has(item.id)));
};
