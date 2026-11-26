import { setTimeout as sleep } from "node:timers/promises";
import { styleText } from "node:util";

const BASE_URL = (process.env.SMOKE_URL ?? "http://localhost:3000").replace(/\/$/u, "");

const deadline = () => AbortSignal.timeout(15_000);

const BOOT_BUDGET_MS = 90_000;

class SmokeError extends Error {
  override name = "SmokeError";
}

const fail: (message: string) => never = (message) => {
  throw new SmokeError(message);
};

const get = async (route: string, accept?: string) =>
  await fetch(`${BASE_URL}${route}`, {
    headers: accept === undefined ? {} : { accept },
    redirect: "manual",
    signal: deadline(),
  });

const describeResponse = async (response: Response) => {
  const body = await response.text().catch(() => "<unreadable body>");
  const trimmed = body.replaceAll(/\s+/gu, " ").trim();

  return `HTTP ${response.status} — ${trimmed.slice(0, 400) || "<empty body>"}`;
};

const probeHome = async () => {
  try {
    const response = await get("/", "text/html");

    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const pollHome: (startedAt: number, attempts: number, lastSeen: string) => Promise<void> = async (
  startedAt,
  attempts,
  lastSeen,
) => {
  if (performance.now() - startedAt >= BOOT_BUDGET_MS) {
    fail(
      `server never answered / at ${BASE_URL} within ${BOOT_BUDGET_MS / 1000}s ` +
        `(${attempts} attempts) — last saw: ${lastSeen}`,
    );
  }

  const seen = await probeHome();

  if (seen === null) {
    return;
  }

  await sleep(250);
  await pollHome(startedAt, attempts + 1, seen);
};

const expectType = async (route: string, type: string, accept?: string) => {
  const response = await get(route, accept);
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status !== 200 || !contentType.startsWith(type)) {
    fail(`${route} answered ${contentType || "no type"}: ${await describeResponse(response)}`);
  }

  return response;
};

const step = async <T>(label: string, run: () => Promise<T>) => {
  const startedAt = performance.now();
  let result: T;

  try {
    result = await run();
  } catch (error) {
    if (error instanceof SmokeError) {
      throw error;
    }

    return fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const elapsed = styleText("dim", `${Math.round(performance.now() - startedAt)}ms`);
  console.log(`  ${styleText("green", "✓")} ${label} ${elapsed}`);

  return result;
};

const main = async () => {
  console.log(`\n  Smoke test → ${BASE_URL}\n`);

  await step("the site answers / in HTML when asked by name", async () => {
    await pollHome(performance.now(), 0, "no response at all");
    await expectType("/", "text/html", "text/html");
  });

  await step("/ answers Markdown when asked for it, varying on Accept", async () => {
    const response = await expectType("/", "text/markdown", "text/markdown");
    const vary = response.headers.get("vary") ?? "";

    if (!vary.toLowerCase().includes("accept")) {
      fail(`/ answered Markdown under Vary "${vary || "none"}"`);
    }
  });

  await step("/markdown is Markdown", async () => {
    await expectType("/markdown", "text/markdown");
  });

  await step("/llms.txt is text", async () => {
    await expectType("/llms.txt", "text/plain");
  });

  await step("/openapi.json is an OpenAPI document", async () => {
    const response = await expectType("/openapi.json", "application/json");
    const document = await response.text();

    if (!/"openapi"\s*:\s*"3\./u.test(document)) {
      fail("/openapi.json carries no openapi version");
    }
  });

  await step("/sitemap.xml lists the site", async () => {
    const response = await expectType("/sitemap.xml", "application/xml");

    const sitemap = await response.text();

    if (!sitemap.includes("<urlset")) {
      fail("/sitemap.xml has no <urlset>");
    }
  });

  await step("/showcase renders", async () => {
    await expectType("/showcase", "text/html", "text/html");
  });

  await step("an unknown page is a real 404", async () => {
    const response = await get("/no-such-page", "*/*");

    if (response.status !== 404) {
      fail(`/no-such-page answered ${await describeResponse(response)}`);
    }
  });

  await step("an unknown API path is a problem document", async () => {
    const response = await get("/api/no-such-route");
    const contentType = response.headers.get("content-type") ?? "";

    if (response.status !== 404 || !contentType.startsWith("application/problem+json")) {
      fail(`/api/no-such-route answered ${contentType}: ${await describeResponse(response)}`);
    }
  });

  console.log(`\n  ${styleText("green", "Smoke test passed.")}\n`);
};

const run = async () => {
  try {
    await main();
  } catch (error) {
    console.error(
      `\n  ${styleText("red", "✗ Smoke test failed:")} ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
};

void run();
