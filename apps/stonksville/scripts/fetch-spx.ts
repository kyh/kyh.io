// Refresh public/spx-daily.csv — the S&P 500 daily history the game replays.
//
//   pnpm -F @repo/stonksville data:spx
//
// Pulls ^GSPC from Yahoo Finance's chart endpoint (1927-12-30 → today) and
// writes one row per trading day, prices to the cent:
//
//   date,open,high,low,close      a real intraday range (1962 onwards)
//   date,close                    close only — Yahoo reports open=high=low=close
//                                 before 1962, so the game synthesizes a range
import { writeFile } from "node:fs/promises";
import path from "node:path";

const SYMBOL = "^GSPC";
/** 1900-01-01 — well before the index's first print */
const PERIOD_START = -2_208_988_800;
const OUT_FILE = path.resolve(import.meta.dirname, "../public/spx-daily.csv");

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

const main = async () => {
  const response = await fetch(chartUrl(), { headers: { "user-agent": "Mozilla/5.0" } });
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

  await writeFile(OUT_FILE, `${lines.join("\n")}\n`);
  process.stdout.write(
    `${lines.length - 1} trading days → ${path.relative(process.cwd(), OUT_FILE)} (${lines[1]} … ${lines.at(-1)})\n`,
  );
};

await main();
