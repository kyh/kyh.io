import { eq } from "drizzle-orm";

import { db } from "../src/db/drizzle-client";
import { company, puzzle } from "../src/db/drizzle-schema";
import { puzzleDataSchema } from "../src/db/zod-schema";

const FMP_BASE = "https://financialmodelingprep.com/stable";

// ── FMP types ───────────────────────────────────────────────────────────────

type FmpProfile = {
  symbol: string;
  companyName: string;
  sector: string;
  marketCap: number;
  fullTimeEmployees: string;
  ipoDate: string;
};

type FmpSegmentEntry = {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string;
  data: Record<string, number>;
};

// ── FMP fetchers ────────────────────────────────────────────────────────────

async function fetchProfile(
  ticker: string,
  apiKey: string,
): Promise<{
  name: string;
  sector: string;
  marketCap: number;
  employees: number;
  ipoYear: number;
} | null> {
  const url = `${FMP_BASE}/profile?symbol=${ticker}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  FMP profile ${res.status} for ${ticker}`);
    return null;
  }

  const data = (await res.json()) as FmpProfile[];
  const profile = data[0];
  if (!profile) {
    console.warn(`  No profile for ${ticker}`);
    return null;
  }

  const ipoYear = profile.ipoDate ? new Date(profile.ipoDate).getFullYear() : 0;

  return {
    name: profile.companyName,
    sector: profile.sector || "Unknown",
    marketCap: Math.round(profile.marketCap / 1_000_000_000),
    employees: parseInt(profile.fullTimeEmployees, 10) || 0,
    ipoYear,
  };
}

async function fetchRevenueSegments(
  ticker: string,
  apiKey: string,
): Promise<{ label: string; value: number }[] | null> {
  const url = `${FMP_BASE}/revenue-product-segmentation?symbol=${ticker}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  FMP segments ${res.status} for ${ticker}`);
    return null;
  }

  const data = (await res.json()) as FmpSegmentEntry[];
  const latest = data[0];
  if (!latest?.data) {
    console.warn(`  No segment data for ${ticker}`);
    return null;
  }

  const entries = Object.entries(latest.data)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length < 2) {
    console.warn(
      `  Only ${entries.length} segment(s) for ${ticker}, skipping puzzle`,
    );
    return null;
  }

  return entries.map(([label, value]) => ({
    label,
    value: Math.round(value / 1_000_000),
  }));
}

// ── Tickers to seed ─────────────────────────────────────────────────────────
// Order is stable — each ticker gets a deterministic date offset by index.

const SEED_TICKERS = [
  // Technology
  "AAPL",
  "MSFT",
  "NVDA",
  "AVGO",
  "ORCL",
  "CRM",
  "AMD",
  "ADBE",
  "CSCO",
  "INTC",
  "IBM",
  "INTU",
  "TXN",
  "QCOM",
  "NOW",
  "AMAT",
  "PANW",
  "MU",
  // Communication Services
  "GOOGL",
  "META",
  "NFLX",
  "DIS",
  "CMCSA",
  "T",
  "VZ",
  "TMUS",
  // Consumer Discretionary
  "AMZN",
  "TSLA",
  "HD",
  "MCD",
  "NKE",
  "LOW",
  "SBUX",
  "TJX",
  "BKNG",
  // Financials
  "JPM",
  "V",
  "MA",
  "BAC",
  "WFC",
  "GS",
  "MS",
  "AXP",
  "BLK",
  "C",
  // Healthcare
  "LLY",
  "UNH",
  "JNJ",
  "ABBV",
  "MRK",
  "TMO",
  "ABT",
  "PFE",
  "AMGN",
  "DHR",
  // Energy
  "XOM",
  "CVX",
  "COP",
  "SLB",
  "EOG",
  "MPC",
  "PSX",
  "VLO",
  // Industrials
  "GE",
  "CAT",
  "UNP",
  "RTX",
  "HON",
  "UPS",
  "BA",
  "LMT",
  "DE",
  // Consumer Staples
  "WMT",
  "PG",
  "COST",
  "KO",
  "PEP",
  "PM",
  "CL",
  // Utilities
  "NEE",
  "SO",
  "DUK",
  // Real Estate
  "PLD",
  "AMT",
  "EQIX",
  // Materials
  "LIN",
  "SHW",
  "FCX",
];

const BASE_DATE = new Date("2026-02-21");

function dateForIndex(i: number): string {
  const d = new Date(BASE_DATE);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.error("Missing FMP_API_KEY env var");
    process.exit(1);
  }

  // 1. Seed companies — upsert by ticker
  console.log("=== Seeding companies ===\n");
  const tickerToCompanyId = new Map<string, string>();
  let companiesCreated = 0;
  let companiesUpdated = 0;

  for (const ticker of SEED_TICKERS) {
    // Check if already exists
    const existing = await db.query.company.findFirst({
      where: eq(company.ticker, ticker),
      columns: { id: true },
    });

    if (existing) {
      tickerToCompanyId.set(ticker, existing.id);
    }

    const profile = await fetchProfile(ticker, apiKey);
    if (!profile) continue;

    if (existing) {
      await db.update(company).set(profile).where(eq(company.id, existing.id));
      tickerToCompanyId.set(ticker, existing.id);
      companiesUpdated++;
      console.log(`  ${ticker}: updated`);
    } else {
      const id = crypto.randomUUID();
      await db.insert(company).values({ id, ticker, ...profile });
      tickerToCompanyId.set(ticker, id);
      companiesCreated++;
      console.log(`  ${ticker}: created`);
    }
  }

  console.log(
    `\nCompanies: ${companiesCreated} created, ${companiesUpdated} updated\n`,
  );

  // 2. Seed puzzles — deterministic date per ticker index, skip existing
  console.log("=== Seeding puzzles ===\n");
  let puzzlesCreated = 0;
  let puzzlesSkipped = 0;

  for (let i = 0; i < SEED_TICKERS.length; i++) {
    const ticker = SEED_TICKERS[i]!;
    const companyId = tickerToCompanyId.get(ticker);
    if (!companyId) continue;

    const dateStr = dateForIndex(i);

    // Skip if puzzle already exists for this date with this company
    const existing = await db.query.puzzle.findFirst({
      where: eq(puzzle.date, dateStr),
      columns: { answerCompanyId: true },
    });

    if (existing?.answerCompanyId === companyId) {
      puzzlesSkipped++;
      console.log(`  ${dateStr}: ${ticker} (exists, skipped)`);
      continue;
    }

    const segments = await fetchRevenueSegments(ticker, apiKey);
    if (!segments) continue;

    const payload = puzzleDataSchema.parse({
      type: "revenue_treemap" as const,
      data: { segments },
    });

    await db
      .insert(puzzle)
      .values({
        date: dateStr,
        type: "revenue_treemap",
        answerCompanyId: companyId,
        puzzleData: JSON.stringify(payload),
      })
      .onConflictDoUpdate({
        target: puzzle.date,
        set: {
          answerCompanyId: companyId,
          puzzleData: JSON.stringify(payload),
          type: "revenue_treemap",
        },
      });

    puzzlesCreated++;
    console.log(`  ${dateStr}: ${ticker} (${segments.length} segments)`);
  }

  console.log(
    `\nPuzzles: ${puzzlesCreated} created, ${puzzlesSkipped} skipped`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
