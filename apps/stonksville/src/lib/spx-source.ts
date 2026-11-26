import { get, put } from "@vercel/blob";
import { z } from "zod";

const SYMBOL = "^GSPC";
const PERIOD_START = -2_208_988_800;
const BLOB_PATH = "stonksville/spx-daily.csv";
const BLOB_CACHE_SECONDS = 3600;

const bars = z.array(z.number().nullable());

const chartResponseSchema = z.object({
  chart: z.object({
    error: z.object({ code: z.string(), description: z.string() }).nullable(),
    result: z
      .array(
        z.object({
          indicators: z.object({
            quote: z.array(z.object({ close: bars, high: bars, low: bars, open: bars })),
          }),
          timestamp: z.array(z.number()).optional(),
        }),
      )
      .nullable(),
  }),
});

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
export const fetchSpxCsv = async () => {
  const response = await fetch(chartUrl(), {
    cache: "no-store",
    headers: { "user-agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance responded ${response.status} ${response.statusText}`);
  }

  const body = chartResponseSchema.parse(await response.json());
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

  return { csv: `${lines.join("\n")}\n`, rows: lines.length - 1 } satisfies {
    csv: string;
    rows: number;
  };
};

/** Whether a Blob store is connected (it is on Vercel; usually not in local dev). */
export const hasBlobStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** The stored CSV as a stream, or null if nothing has been stored yet. */
export const readStoredCsv = async () => {
  const stored = await get(BLOB_PATH, { access: "public", useCache: false });

  return stored?.statusCode === 200 ? stored.stream : null;
};

export const storeCsv = async (csv: string) => {
  await put(BLOB_PATH, csv, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: BLOB_CACHE_SECONDS,
    contentType: "text/csv; charset=utf-8",
  });
};
