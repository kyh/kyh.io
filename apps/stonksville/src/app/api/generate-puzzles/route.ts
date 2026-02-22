import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/drizzle-client";
import { company, puzzle } from "@/db/drizzle-schema";
import { puzzleDataSchema } from "@/db/zod-schema";

const FMP_BASE = "https://financialmodelingprep.com/stable";

type FmpSegmentEntry = {
  symbol: string;
  fiscalYear: number;
  period: string;
  date: string;
  data: Record<string, number>;
};

async function fetchRevenueSegments(
  ticker: string,
  apiKey: string,
): Promise<{ label: string; value: number }[] | null> {
  const url = `${FMP_BASE}/revenue-product-segmentation?symbol=${ticker}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as FmpSegmentEntry[];
  const latest = data[0];
  if (!latest?.data) return null;

  const entries = Object.entries(latest.data)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length < 2) return null;

  return entries.map(([label, value]) => ({
    label,
    value: Math.round(value / 1_000_000),
  }));
}

/** Use an LLM to generalize segment labels so they don't give away the company. */
async function generalizeLabels(
  segments: { label: string; value: number }[],
): Promise<{ label: string; value: number }[]> {
  const { output } = await generateText({
    model: "openai/gpt-5-mini",
    output: Output.object({
      schema: z.object({
        labels: z.array(z.string()).describe("Generalized segment labels"),
      }),
    }),
    prompt: [
      "You are helping create a guessing game where players see a company's revenue segments and must guess the company.",
      "Make the following segment labels more generic so they don't immediately reveal the company.",
      "Keep them informative enough that a knowledgeable player could still reason about the industry.",
      "Examples: 'iPhone' → 'Smartphones', 'AWS' → 'Cloud Services', 'Google Search' → 'Search Advertising', 'Xbox' → 'Gaming Consoles'",
      "",
      "Segments:",
      ...segments.map((s) => `- ${s.label}`),
      "",
      `Return exactly ${segments.length} labels in the same order.`,
    ].join("\n"),
  });

  if (output.labels.length !== segments.length) return segments;

  return segments.map((s, i) => ({
    ...s,
    label: output.labels[i] ?? s.label,
  }));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing FMP_API_KEY" },
      { status: 500 },
    );
  }

  // Get all companies with tickers from DB
  const allCompanies = await db
    .select({ id: company.id, ticker: company.ticker })
    .from(company);

  const withTickers = allCompanies.filter(
    (c): c is typeof c & { ticker: string } => c.ticker !== null,
  );

  // Find next 7 dates that don't have puzzles
  const existingPuzzles = await db.query.puzzle.findMany({
    columns: { date: true },
  });
  const existingDates = new Set(existingPuzzles.map((p) => p.date));

  const today = new Date();
  const datesToFill: string[] = [];
  for (let i = 0; datesToFill.length < 7 && i < 30; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (!existingDates.has(dateStr)) {
      datesToFill.push(dateStr);
    }
  }

  if (datesToFill.length === 0) {
    return NextResponse.json({ message: "All dates filled" });
  }

  // Shuffle and try to fill dates
  const shuffled = [...withTickers].sort(() => Math.random() - 0.5);
  const results: string[] = [];

  for (const date of datesToFill) {
    const c = shuffled.pop();
    if (!c) break;

    const rawSegments = await fetchRevenueSegments(c.ticker, apiKey);
    if (!rawSegments) continue;

    const segments = await generalizeLabels(rawSegments);

    const payload = puzzleDataSchema.parse({
      type: "revenue_treemap" as const,
      data: { segments },
    });

    await db.insert(puzzle).values({
      date,
      type: "revenue_treemap",
      answerCompanyId: c.id,
      puzzleData: JSON.stringify(payload),
    });

    results.push(`${date}: ${c.ticker}`);
  }

  return NextResponse.json({ generated: results });
}
