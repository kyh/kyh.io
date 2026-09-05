import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  DAILY_BUDGET_USD_PER_VIEWER,
  MIN_BILLED_SECONDS,
  createProgramming,
  memoryAiredStore,
  memorySessionStore,
  usdPerSecond,
} from "./live";

// The programming rules on in-memory stores, with a feed served from a stub:
// never twice, and the daily dollars that stand between a viewer and the
// meter. The RSS adapter reads a feed's newest 30 entries, so the stub serves
// exactly that many.

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
    const { nextProgram } = createProgramming(memoryAiredStore(), memorySessionStore());
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

  it("bills the promotional rate through its last day and list after", () => {
    assert.equal(usdPerSecond("2026-09-14"), 0.02);
    assert.equal(usdPerSecond("2026-09-15"), 0.08);
  });

  it("cuts a signed-in viewer off at their daily dollars, not the owner", async () => {
    const { nextProgram, mayOpen, mayContinue, sessionOpened, sessionSeen } = createProgramming(
      memoryAiredStore(),
      memorySessionStore(),
    );
    const guest = { userId: "u2", owner: false };
    const owner = { userId: "u1", owner: true };
    const openedAt = Date.now();
    assert.equal(await mayOpen(guest), true);
    await sessionOpened("s1", guest, openedAt);
    // Open and not yet heard from: a minute's worth, spent.
    assert.equal(await mayOpen(guest), true);
    assert.equal((await nextProgram("test:budget", access, guest, true)).kind, "program");
    // Heartbeats carry it to the cap.
    const capSeconds = DAILY_BUDGET_USD_PER_VIEWER / usdPerSecond();
    await sessionSeen("s1", guest, openedAt + capSeconds * 1000);
    assert.equal(await mayOpen(guest), false);
    assert.equal((await nextProgram("test:budget", access, guest, false)).kind, "off-air");
    // A little over, the session may still be heard from; well over, not.
    assert.equal(await mayContinue(guest), true);
    await sessionSeen("s1", guest, openedAt + (capSeconds + MIN_BILLED_SECONDS + 1) * 1000);
    assert.equal(await mayContinue(guest), false);
    // Someone else's heartbeat for it counts for nothing.
    await sessionSeen("s1", { userId: "u3", owner: false }, openedAt + 10 * capSeconds * 1000);
    assert.equal(await mayOpen({ userId: "u3", owner: false }), true);
    assert.equal(await mayOpen(owner), true);
  });

  it("puts a source that can't be read on the screen as the reason", async () => {
    globalThis.fetch = async () => new Response("nope", { status: 403 });
    const { nextProgram } = createProgramming(memoryAiredStore(), memorySessionStore());
    const result = await nextProgram("test:dead", access, { userId: "u1", owner: true }, true);
    assert.equal(result.kind, "off-air");
    if (result.kind === "off-air") assert.match(result.reason, /403/);
  });
});
