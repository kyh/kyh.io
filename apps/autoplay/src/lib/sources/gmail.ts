import { z } from "zod";

import { cachedPick, decodeEntities, fetchJson } from "./types";
import type { AccessOf, Item, SourceContext } from "./types";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const LIST_QUERY = "newer_than:7d -in:chats -category:social";
const MAX_MESSAGES = 40;
const UNREAD_BONUS_MINUTES = 24 * 60;
const METADATA_HEADERS = ["From", "Subject", "List-Id", "List-Unsubscribe"];

const listSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).optional(),
});

const messageSchema = z.object({
  id: z.string(),
  internalDate: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  payload: z
    .object({
      headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    })
    .optional(),
  snippet: z.string().optional(),
});

interface Header {
  name: string;
  value: string;
}

const gmailFetch = <T>(
  accessToken: string,
  path: string,
  params: [string, string][],
  schema: z.ZodType<T>,
) => {
  const url = new URL(`${GMAIL_BASE}/${path}`);

  for (const [key, value] of params) {
    url.searchParams.append(key, value);
  }

  return fetchJson("Gmail", url, accessToken, schema);
};

const header = (headers: Header[], name: string) =>
  headers.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value;

interface Sender {
  name: string;
  address: string;
}

export const parseFrom = (value: string) => {
  const match = /^\s*"?(?<name>[^"<]*?)"?\s*<(?<address>[^>]+)>\s*$/u.exec(value);

  if (match === null) {
    return { address: value.trim(), name: value.trim() } satisfies Sender;
  }

  const address = (match.groups?.address ?? value).trim();
  const name = (match.groups?.name ?? "").trim();

  return { address, name: name === "" ? address : name } satisfies Sender;
};

export const isNewsletter = (headers: Header[]) =>
  header(headers, "List-Id") !== undefined || header(headers, "List-Unsubscribe") !== undefined;

const fetchNewsletters = async (access: AccessOf<"gmail">) => {
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
          ...METADATA_HEADERS.map((name) => ["metadataHeaders", name] satisfies [string, string]),
        ],
        messageSchema,
      ),
    ),
  );

  const items: Item[] = [];

  for (const message of messages) {
    const headers = message.payload?.headers ?? [];

    if (!isNewsletter(headers)) {
      continue;
    }

    const subject = header(headers, "Subject") ?? "(no subject)";
    const from = parseFrom(header(headers, "From") ?? "");
    const receivedMs = Number(message.internalDate ?? 0);
    const unread = (message.labelIds ?? []).includes("UNREAD");
    items.push({
      author: { name: from.name, username: from.address },
      createdAt: receivedMs > 0 ? new Date(receivedMs).toISOString() : undefined,
      id: `gmail:${message.id}`,
      kind: "gmail",
      link: `https://mail.google.com/mail/u/0/#all/${message.id}`,
      score: Math.round(receivedMs / 60_000) + (unread ? UNREAD_BONUS_MINUTES : 0),
      text: `${subject}. ${decodeEntities(message.snippet ?? "")}`.trim(),
    });
  }

  return items;
};

export const pickGmailCandidate = (
  access: AccessOf<"gmail">,
  sourceId: string,
  context: SourceContext,
) => cachedPick(context, `gmail:${sourceId}`, () => fetchNewsletters(access));
