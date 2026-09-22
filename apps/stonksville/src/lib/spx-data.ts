/** One trading day of the S&P 500. Loaded from `public/spx-daily.csv` (see `scripts/fetch-spx.ts`). */
export interface DailyBar {
  /** Trading date — UTC midnight, unix ms */
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /**
   * Whether high/low come from the source data. Rows before 1962 report only a
   * close; their open is the previous close and the range spans open → close.
   */
  hasRange: boolean;
}

export const SPX_DATA_URL = "/spx-daily.csv";

const parseRow = (fields: string[], previousClose: number | null): DailyBar | null => {
  const date = Date.parse(`${fields[0]}T00:00:00Z`);
  const numbers = fields.slice(1).map(Number);
  if (Number.isNaN(date) || numbers.some((n) => !Number.isFinite(n) || n <= 0)) {
    return null;
  }
  if (numbers.length === 1) {
    const [close] = numbers;
    const open = previousClose ?? close;
    return {
      close,
      date,
      hasRange: false,
      high: Math.max(open, close),
      low: Math.min(open, close),
      open,
    };
  }
  if (numbers.length === 4) {
    const [open, high, low, close] = numbers;
    return { close, date, hasRange: high > low, high, low, open };
  }
  return null;
};

/** Parse the `date,open,high,low,close` / `date,close` CSV into bars, oldest first. */
export const parseSpxCsv = (text: string): DailyBar[] => {
  const bars: DailyBar[] = [];
  let previousClose: number | null = null;
  for (const line of text.split("\n")) {
    const row = line.trim();
    if (row === "" || row.startsWith("date")) {
      continue;
    }
    const bar = parseRow(row.split(","), previousClose);
    if (bar) {
      bars.push(bar);
      previousClose = bar.close;
    }
  }
  return bars;
};

export const loadSpxHistory = async (signal?: AbortSignal): Promise<DailyBar[]> => {
  const response = await fetch(SPX_DATA_URL, { signal });
  if (!response.ok) {
    throw new Error(`S&P history: HTTP ${response.status}`);
  }
  const bars = parseSpxCsv(await response.text());
  if (bars.length < 2) {
    throw new Error("S&P history: no rows");
  }
  return bars;
};

/** Index of the first bar on or after `isoDate` (YYYY-MM-DD), or null if unparseable / past the end. */
export const findBarIndex = (bars: DailyBar[], isoDate: string): number | null => {
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(target)) {
    return null;
  }
  let lo = 0;
  let hi = bars.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (bars[mid].date < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo < bars.length ? lo : null;
};

export const formatTradingDate = (date: number, style: "short" | "long" = "long"): string =>
  new Date(date).toLocaleDateString(
    "en-US",
    style === "long"
      ? { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" }
      : { day: "numeric", month: "short", timeZone: "UTC" },
  );
