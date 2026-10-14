import assert from "node:assert/strict";
import test from "node:test";

import { cleanLine, editDraft, lineOf, MAX_CHARS, readChat, sayState, SHOW_MS } from "./chat";

const press = (
  key: string,
  mods: Partial<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean }> = {},
) => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  ...mods,
});

const NONE = new Set<string>();

test("a printable key starts a draft; space, shortcuts and reserved keys don't", () => {
  assert.deepEqual(editDraft(null, press("h"), NONE), { draft: "h", kind: "draft" });
  assert.equal(editDraft(null, press(" "), NONE), null);
  assert.equal(editDraft(null, press("ArrowLeft"), NONE), null);
  assert.equal(editDraft(null, press("c", { metaKey: true }), NONE), null);
  assert.equal(editDraft(null, press("]"), new Set(["]"])), null);
});

test("once typing, every key belongs to the draft", () => {
  assert.deepEqual(editDraft("hi", press(" "), NONE), { draft: "hi ", kind: "draft" });
  assert.deepEqual(editDraft("hi", press("]"), new Set(["]"])), { draft: "hi]", kind: "draft" });
  assert.deepEqual(editDraft("hi", press("ArrowLeft"), NONE), { draft: "hi", kind: "draft" });
  assert.deepEqual(editDraft("hi👋", press("Backspace"), NONE), { draft: "hi", kind: "draft" });
  assert.deepEqual(editDraft("hi", press("Escape"), NONE), { kind: "cancel" });
});

test("enter sends the line, or drops a blank one", () => {
  assert.deepEqual(editDraft("hello  ", press("Enter"), NONE), { kind: "send", text: "hello" });
  assert.deepEqual(editDraft("   ", press("Enter"), NONE), { kind: "cancel" });
});

test("a line is one line of at most MAX_CHARS", () => {
  assert.equal(cleanLine("a\n\tb\u0000c"), "a b c");
  assert.equal([...cleanLine("x".repeat(500))].length, MAX_CHARS);
  assert.equal(editDraft("x".repeat(MAX_CHARS), press("y"), NONE)?.kind, "draft");
});

test("a sent line shows for SHOW_MS by the room's clock, then it's gone", () => {
  const state = sayState("hello", 10_000);
  assert.deepEqual(readChat(state, 10_000), {
    said: { text: "hello", until: 10_000 + SHOW_MS },
    typing: null,
  });
  assert.equal(readChat(state, 10_000 + SHOW_MS).said, null);
  assert.equal(readChat({ typing: "hel" }, 0).typing, "hel");
});

test("whatever arrives off the wire is cleaned or ignored", () => {
  assert.deepEqual(readChat({ said: 42, saidAt: "soon", typing: ["x"] }, 0), {
    said: null,
    typing: null,
  });
  assert.equal(readChat({ said: "a\nb", saidAt: 0 }, 1).said?.text, "a b");
});

test("a draft shows over a sent line", () => {
  assert.deepEqual(lineOf({ said: { text: "sent", until: 1 }, typing: "draft" }), {
    text: "draft",
    typing: true,
  });
  assert.deepEqual(lineOf({ said: { text: "sent", until: 1 }, typing: null }), {
    text: "sent",
    typing: false,
  });
  assert.equal(lineOf({ said: null, typing: null }), null);
});
