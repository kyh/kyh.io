import { connection } from "next/server";

import { fetchSpxCsv, hasBlobStore, readStoredCsv, storeCsv } from "@/lib/spx-source";

const CACHE_HEADERS = {
  "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  "content-type": "text/csv; charset=utf-8",
};

let devCache: { csv: string; at: number } | null = null;
const DEV_CACHE_MS = 6 * 60 * 60 * 1000;

const fromYahoo = async () => {
  if (devCache && Date.now() - devCache.at < DEV_CACHE_MS) {
    return devCache.csv;
  }

  const { csv } = await fetchSpxCsv();
  devCache = { at: Date.now(), csv };

  return csv;
};

/** S&P 500 daily history as CSV — from Blob, seeding it from Yahoo on the first request. */
export const GET = async () => {
  await connection();

  try {
    if (!hasBlobStore()) {
      return new Response(await fromYahoo(), { headers: CACHE_HEADERS });
    }

    const stored = await readStoredCsv();

    if (stored) {
      return new Response(stored, { headers: CACHE_HEADERS });
    }

    const { csv } = await fetchSpxCsv();
    await storeCsv(csv);

    return new Response(csv, { headers: CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";

    return new Response(`S&P history unavailable: ${message}`, {
      headers: { "cache-control": "no-store" },
      status: 502,
    });
  }
};
