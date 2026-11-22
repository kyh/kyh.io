import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import type { ServerResponse } from "node:http";
import { after, describe, it } from "node:test";

const feed = (n: number) =>
  `<rss><channel><title>Stub</title>${Array.from(
    { length: n },
    (_, i) =>
      `<item><guid>e${i}</guid><title>Entry ${i}</title><pubDate>${new Date(
        Date.UTC(2026, 0, 1 + i),
      ).toUTCString()}</pubDate></item>`,
  ).join("")}</channel></rss>`;

const xCalls: string[] = [];

const sendJson = <Body extends object>(response: ServerResponse, body: Body) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");

  if (pathname === "/feed.xml") {
    response.writeHead(200, { "Content-Type": "application/xml" });
    response.end(feed(30));

    return;
  }

  if (pathname.startsWith("/x/")) {
    xCalls.push(pathname);
  }

  if (pathname === "/x/2/users/personalized_trends") {
    sendJson(response, { data: [{ trend_name: "Vercel" }] });

    return;
  }

  if (pathname === "/x/2/tweets/search/recent") {
    sendJson(response, {
      data: Array.from({ length: 10 }, (_, i) => ({
        author_id: "a1",
        id: `p${i}`,
        public_metrics: { like_count: 1000 - i },
        text: `post ${i}`,
      })),
      includes: { users: [{ id: "a1", name: "Ada", username: "ada" }] },
    });

    return;
  }

  response.writeHead(pathname === "/dead.xml" ? 403 : 404);
  response.end("nope");
});

server.listen(0, "127.0.0.1");

await once(server, "listening");

after(() => {
  server.close();
});

const address = server.address();

assert.ok(address instanceof Object);

const { port } = address;
const origin = `http://127.0.0.1:${port}`;

process.env.X_API_URL = `${origin}/x/2`;

const {
  DAILY_BUDGET_USD_PER_VIEWER,
  MIN_BILLED_SECONDS,
  createProgramming,
  memoryAiredStore,
  memorySessionStore,
  usdPerSecond,
} = await import("./live");

const { DAILY_READ_BUDGET_USD, memoryReads } = await import("./reads");

const access = { kind: "rss" as const, url: `${origin}/feed.xml` };

describe("programming", () => {
  it("airs the newest entry first and never the same one twice", async () => {
    const { nextProgram } = createProgramming(
      memoryAiredStore(),
      memorySessionStore(),
      memoryReads(),
    );

    const owner = { owner: true, userId: "u1" };
    const first = await nextProgram("test:never-twice", access, owner, true);
    const second = await nextProgram("test:never-twice", access, owner, false);
    assert.equal(first.kind, "program");
    assert.equal(second.kind, "program");

    if (first.kind !== "program" || second.kind !== "program") {
      return;
    }

    assert.equal(first.program.itemId, "rss:e29");
    assert.equal(second.program.itemId, "rss:e28");
    assert.match(first.program.prompt, /Entry 29/u);
    assert.ok(first.formatLabel !== undefined, "an opening program names its format");
    assert.match(
      first.program.prompt,
      /^A continuous .*\n\nNext segment/su,
      "and opens on the world",
    );
    assert.equal(second.formatLabel, undefined);
    assert.match(second.program.prompt, /^Next segment/u);
  });

  it("bills the promotional rate through its last day and list after", () => {
    assert.equal(usdPerSecond("2026-09-14"), 0.02);
    assert.equal(usdPerSecond("2026-09-15"), 0.08);
  });

  it("cuts a signed-in viewer off at their daily dollars, not the owner", async () => {
    const { nextProgram, mayOpen, mayContinue, sessionOpened, sessionSeen } = createProgramming(
      memoryAiredStore(),
      memorySessionStore(),
      memoryReads(),
    );

    const guest = { owner: false, userId: "u2" };
    const owner = { owner: true, userId: "u1" };
    const openedAt = Date.now();
    assert.equal(await mayOpen(guest), true);
    await sessionOpened("s1", guest, openedAt);
    assert.equal(await mayOpen(guest), true);
    const withinBudget = await nextProgram("test:budget", access, guest, true);
    assert.equal(withinBudget.kind, "program");
    const capSeconds = DAILY_BUDGET_USD_PER_VIEWER / usdPerSecond();
    await sessionSeen("s1", guest, openedAt + capSeconds * 1000);
    assert.equal(await mayOpen(guest), false);
    const overBudget = await nextProgram("test:budget", access, guest, false);
    assert.equal(overBudget.kind, "off-air");
    assert.equal(await mayContinue(guest), true);
    await sessionSeen("s1", guest, openedAt + (capSeconds + MIN_BILLED_SECONDS + 1) * 1000);
    assert.equal(await mayContinue(guest), false);
    await sessionSeen("s1", { owner: false, userId: "u3" }, openedAt + 10 * capSeconds * 1000);
    assert.equal(await mayOpen({ owner: false, userId: "u3" }), true);
    assert.equal(await mayOpen(owner), true);
  });

  it("puts a source that can't be read on the screen as the reason", async () => {
    const { nextProgram } = createProgramming(
      memoryAiredStore(),
      memorySessionStore(),
      memoryReads(),
    );

    const dead = { kind: "rss" as const, url: `${origin}/dead.xml` };
    const result = await nextProgram("test:dead", dead, { owner: true, userId: "u1" }, true);
    assert.equal(result.kind, "off-air");

    if (result.kind === "off-air") {
      assert.match(result.reason, /403/u);
    }
  });
});

const xAccess = { accessToken: "token", kind: "x" as const, xUserId: "42" };

describe("X reads", () => {
  it("are priced into the ledger, served from the cache for the hour, and stopped at the day's cap", async () => {
    const reads = memoryReads();
    const { nextProgram } = createProgramming(memoryAiredStore(), memorySessionStore(), reads);
    const owner = { owner: true, userId: "u1" };

    const first = await nextProgram("x:test", xAccess, owner, true);
    assert.equal(first.kind, "program");

    if (first.kind === "program") {
      assert.equal(first.program.itemId, "x:p0");
    }

    const spent = await reads.spend.spent("x", 0);
    assert.ok(Math.abs(spent - 0.06) < 1e-9, `spent ${spent}`);
    assert.equal(xCalls.length, 2);

    const second = await nextProgram("x:test", xAccess, owner, false);
    assert.equal(second.kind, "program");

    if (second.kind === "program") {
      assert.equal(second.program.itemId, "x:p1");
    }

    assert.equal(xCalls.length, 2);
    assert.equal(await reads.spend.spent("x", 0), spent);

    await reads.spend.record("x", "x:test", DAILY_READ_BUDGET_USD.x);
    const third = await nextProgram("x:test", xAccess, owner, false);
    assert.equal(third.kind, "off-air");

    if (third.kind === "off-air") {
      assert.match(third.reason, /X read budget/u);
    }

    assert.equal(xCalls.length, 2);
  });
});
