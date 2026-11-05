import assert from "node:assert/strict";
import test from "node:test";

import { createEmotes, say, stepEmotes } from "./emote";

/** Steps it `seconds` at 60 frames a second. */
const run = (emotes: ReturnType<typeof createEmotes>, seconds: number) => {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    stepEmotes(emotes, 1 / 60);
  }
};

test("it waits out its quiet before speaking unprompted, and a prompt cuts in", () => {
  const emotes = createEmotes(1);
  assert.equal(say(emotes, ["hi"]), false);
  run(emotes, 1.1);
  assert.equal(say(emotes, ["hi"]), true);
  assert.equal(emotes.line, "hi");
  // Saying something already, it won't chatter over it, but a click is answered.
  assert.equal(say(emotes, ["again"]), false);
  assert.equal(say(emotes, ["ouch"], true), true);
  assert.equal(emotes.line, "ouch");
});

test("a line shows long enough to read, then goes, and it keeps quiet a while", () => {
  const emotes = createEmotes(2);
  say(emotes, ["Gobble gobble!"], true);
  run(emotes, 1);
  assert.equal(emotes.line, "Gobble gobble!");
  run(emotes, 1.5);
  assert.equal(emotes.line, null);
  assert.equal(say(emotes, ["more"]), false);
  run(emotes, 8);
  assert.equal(say(emotes, ["more"]), true);
});

test("it never says the same line twice running when it has another", () => {
  const emotes = createEmotes(3);
  for (let turn = 0; turn < 20; turn += 1) {
    const before = emotes.line;
    say(emotes, ["a", "b"], true);
    assert.notEqual(emotes.line, before);
  }
});
