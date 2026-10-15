// Chat between visitors, carried in each one's player state: what they're
// typing and the last line they sent, with when. A visitor holds one draft and
// one line, each replaced by the next and gone when they leave, so nothing
// piles up; a line shows for SHOW_MS after it was sent, by the room's clock.
import type { JsonRecord } from "@vibedgames/multiplayer";
import { asText } from "@/lib/wire";

/** The longest line, in characters. */
export const MAX_CHARS = 120;
/** How long a sent line stays up (ms). */
export const SHOW_MS = 6000;

/** A sent line, and when it comes down. */
export interface Said {
  text: string;
  until: number;
}

/** What a visitor is saying, as everyone else draws it. */
export interface Chat {
  /** Their draft while they type; null when they aren't. */
  typing: string | null;
  /** Their last line, while it's still up. */
  said: Said | null;
}

/** A line to draw beside a pointer: the draft while there is one, else the line still up. */
export interface Line {
  text: string;
  typing: boolean;
}

export const lineOf = ({ typing, said }: Chat): Line | null => {
  if (typing !== null) {
    return { text: typing, typing: true };
  }
  return said ? { text: said.text, typing: false } : null;
};

/** The keys a press carries that chat cares about. */
export interface ChatKey {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export type ChatEdit =
  | { kind: "draft"; draft: string }
  | { kind: "send"; text: string }
  | { kind: "cancel" };

const characters = (text: string) => [...text];

/** One line of plain text: no control characters, spaces collapsed, at most MAX_CHARS. */
export const cleanLine = (text: string) =>
  characters(
    text
      .replaceAll(/\p{Cc}/gu, " ")
      .replaceAll(/\s+/gu, " ")
      .trimStart(),
  )
    .slice(0, MAX_CHARS)
    .join("");

/**
 * What a key press does to the draft (null while not typing). Any printable
 * key the page doesn't `claim` for itself starts one; once typing, every key
 * is the draft's: Enter sends, Escape drops it. Null means the key isn't chat's.
 */
export const editDraft = (
  draft: string | null,
  press: ChatKey,
  claims: (key: string) => boolean = () => false,
): ChatEdit | null => {
  if (press.altKey || press.ctrlKey || press.metaKey) {
    return null;
  }
  const printable = characters(press.key).length === 1;
  if (draft === null) {
    return printable && press.key !== " " && !claims(press.key)
      ? { draft: cleanLine(press.key), kind: "draft" }
      : null;
  }
  if (press.key === "Enter") {
    const text = cleanLine(draft).trimEnd();
    return text ? { kind: "send", text } : { kind: "cancel" };
  }
  if (press.key === "Escape") {
    return { kind: "cancel" };
  }
  if (press.key === "Backspace") {
    return { draft: characters(draft).slice(0, -1).join(""), kind: "draft" };
  }
  return { draft: printable ? cleanLine(draft + press.key) : draft, kind: "draft" };
};

/** The state that says a visitor is typing `draft`, or has stopped. */
export const draftState = (draft: string | null): JsonRecord => ({ typing: draft ?? "" });

/** The state that sends `text` at `now` on the room's clock. */
export const sayState = (text: string, now: number): JsonRecord => ({
  said: text,
  saidAt: Math.round(now),
  typing: "",
});

/** A state's chat fields, cleaned once per state object: state is replaced, never changed, on each update. */
const parsed = new WeakMap<
  JsonRecord,
  { typing: string | null; said: string; saidAt: number | null }
>();

const parse = (state: JsonRecord) => {
  const cached = parsed.get(state);
  if (cached) {
    return cached;
  }
  const typing = cleanLine(asText(state.typing));
  const fields = {
    said: cleanLine(asText(state.said)),
    saidAt: Number.isFinite(state.saidAt) ? Number(state.saidAt) : null,
    typing: typing === "" ? null : typing,
  };
  parsed.set(state, fields);
  return fields;
};

/** A visitor's chat from their state at `now` on the room's clock; anything off the wire is cleaned. */
export const readChat = (state: JsonRecord, now: number): Chat => {
  const { typing, said, saidAt } = parse(state);
  const up = said !== "" && saidAt !== null && now >= saidAt - 1000 && now < saidAt + SHOW_MS;
  return { said: up && saidAt !== null ? { text: said, until: saidAt + SHOW_MS } : null, typing };
};
