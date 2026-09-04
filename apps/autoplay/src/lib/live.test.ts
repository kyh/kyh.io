import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { MAX_PROGRAMS_PER_USER_PER_DAY, createProgramming, memoryAiredStore } from "./live";

// The programming rules on an in-memory store, with a feed served from a
// stub: never twice, and the two daily budgets that stand between a viewer
// and the meter. The RSS adapter reads a feed's newest 30 entries, so the
// stub serves exactly that many and the budget test spreads over channels.

const feed = (n: number): string =>
  `<rss><channel><title>Stub</title>${Array.from(
    { length: n },
    (_, i) =>
      `<item><guid>e${i}</guid><title>Entry ${i}</title><pubDate>${new Date(
        Date.UTC(2026, 0, 1 + i),
      ).toUTCString()}</pubDate></item>`,
  ).join("")}</channel></rss>`;

const access = { kind: "rss" as const, url: "https://stub.test/feed.xml" };

let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(feed(30), { status: 200, headers: { "Content-Type": "application/xml" } });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("programming", () => {
  it("airs the newest entry first and never the same one twice", async () => {
    const { nextProgram } = createProgramming(memoryAiredStore());
    const owner = { userId: "u1", owner: true };
    const first = await nextProgram("test:never-twice", access, owner, true);
    const second = await nextProgram("test:never-twice", access, owner, false);
    assert.equal(first.kind, "program");
    assert.equal(second.kind, "program");
    if (first.kind !== "program" || second.kind !== "program") return;
    assert.equal(first.program.itemId, "rss:e29");
    assert.equal(second.program.itemId, "rss:e28");
    assert.match(first.program.prompt, /Entry 29/);
    assert.ok(first.world !== undefined, "an opening program carries the world");
    assert.equal(second.world, undefined);
  });

  it("cuts a signed-in viewer off at their daily slice, not the owner", async () => {
    const { nextProgram, withinBudget } = createProgramming(memoryAiredStore());
    const guest = { userId: "u2", owner: false };
    for (let i = 0; i < MAX_PROGRAMS_PER_USER_PER_DAY; i += 1) {
      const channel = `test:budget:${i % 2}`;
      assert.equal((await nextProgram(channel, access, guest, i === 0)).kind, "program", `#${i}`);
    }
    assert.equal(await withinBudget(guest), false);
    assert.equal((await nextProgram("test:budget:2", access, guest, false)).kind, "off-air");
    assert.equal(await withinBudget({ userId: "u3", owner: false }), true);
    assert.equal(await withinBudget({ userId: "u1", owner: true }), true);
  });

  it("puts a source that can't be read on the screen as the reason", async () => {
    globalThis.fetch = async () => new Response("nope", { status: 403 });
    const { nextProgram } = createProgramming(memoryAiredStore());
    const result = await nextProgram("test:dead", access, { userId: "u1", owner: true }, true);
    assert.equal(result.kind, "off-air");
    if (result.kind === "off-air") assert.match(result.reason, /403/);
  });
});
