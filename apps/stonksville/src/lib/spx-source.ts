// Server side of the S&P 500 history: pulls ^GSPC daily bars from Yahoo
// Finance and keeps the result in Vercel Blob, so the game never depends on
// Yahoo being up when someone opens it. The client parses the CSV in
// `spx-data.ts`:
//
//   date,open,high,low,close      a real intraday range (1962 onwards)
//   date,close                    close only — Yahoo reports open=high=low=close
//                                 before 1962, so the game synthesizes a range
import { get, put } from "@vercel/blob";

const SYMBOL = "^GSPC";
/** 1900-01-01 — well before the index's first print */
const PERIOD_START = -2_208_988_800;
/** Where the CSV lives in the Blob store */
const BLOB_PATH = "stonksville/spx-daily.csv";
/** Blob CDN TTL — short so the daily overwrite shows up the same day */
const BLOB_CACHE_SECONDS = 3600;

interface ChartResponse {
  chart: {
    error: { code: string; description: string } | null;
    result:
      | {
          timestamp?: number[];
          indicators: {
            quote: {
              open: (number | null)[];
              high: (number | null)[];
              low: (number | null)[];
              close: (number | null)[];
            }[];
          };
        }[]
      | null;
  };
}

const chartUrl = () => {
  const url = new URL(
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(SYMBOL)}`,
  );
  url.searchParams.set("period1", String(PERIOD_START));
  url.searchParams.set("period2", String(Math.floor(Date.now() / 1000)));
  url.searchParams.set("interval", "1d");
  return url;
};

const cents = (value: number) => value.toFixed(2);

const isoDate = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString().slice(0, 10);

/** Fetch the full daily history from Yahoo Finance and render it as CSV. */
export const fetchSpxCsv = async (): Promise<{ csv: string; rows: number }> => {
  const response = await fetch(chartUrl(), {
    cache: "no-store",
    headers: { "user-agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    throw new Error(`Yahoo Finance responded ${response.status} ${response.statusText}`);
  }
  // SAFETY: Yahoo's chart payload shape; the fields used are null-checked before use below
  const body = (await response.json()) as ChartResponse;
  const result = body.chart.result?.[0];
  if (!result?.timestamp) {
    throw new Error(body.chart.error?.description ?? "Yahoo Finance returned no bars");
  }

  const [quote] = result.indicators.quote;
  const lines = ["date,open,high,low,close"];
  let previousDate = "";
  for (const [i, ts] of result.timestamp.entries()) {
    const open = quote.open[i];
    const high = quote.high[i];
    const low = quote.low[i];
    const close = quote.close[i];
    if (open === null || high === null || low === null || close === null) {
      continue;
    }
    const date = isoDate(ts);
    // Yahoo occasionally repeats the live session as an extra bar
    if (date === previousDate) {
      lines.pop();
    }
    previousDate = date;
    const closeOnly = open === high && high === low && low === close;
    lines.push(
      closeOnly
        ? `${date},${cents(close)}`
        : `${date},${cents(open)},${cents(high)},${cents(low)},${cents(close)}`,
    );
  }
  return { csv: `${lines.join("\n")}\n`, rows: lines.length - 1 };
};

/** Whether a Blob store is connected (it is on Vercel; usually not in local dev). */
export const hasBlobStore = (): boolean => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** The stored CSV as a stream, or null if nothing has been stored yet. */
export const readStoredCsv = async (): Promise<ReadableStream<Uint8Array> | null> => {
  const stored = await get(BLOB_PATH, { access: "public", useCache: false });
  return stored?.statusCode === 200 ? stored.stream : null;
};

export const storeCsv = async (csv: string): Promise<void> => {
  await put(BLOB_PATH, csv, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: BLOB_CACHE_SECONDS,
    contentType: "text/csv; charset=utf-8",
  });
};
