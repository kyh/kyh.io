"use server";

import { eq } from "@/db";
import { db } from "@/db/drizzle-client";
import { puzzle, guess, company } from "@/db/drizzle-schema";

import { getSession } from "@/lib/auth";
import type { GuessFeedback, Direction } from "@/db/zod-schema";

function compareDirection(guessed: number, answer: number): Direction {
  if (guessed === answer) return "correct";
  return guessed < answer ? "higher" : "lower";
}

export async function submitGuess(
  puzzleId: string,
  companyId: string,
  guessNumber: number,
): Promise<GuessFeedback | { error: string }> {
  if (guessNumber < 1 || guessNumber > 6) {
    return { error: "Invalid guess number" };
  }

  // async-parallel: all 3 queries are independent
  const [row, guessedCompany] = await Promise.all([
    db.query.puzzle.findFirst({ where: eq(puzzle.id, puzzleId) }),
    db.query.company.findFirst({ where: eq(company.id, companyId) }),
  ]);

  if (!row) return { error: "Puzzle not found" };
  if (!guessedCompany) return { error: "Unknown company" };

  // answer company depends on row.answerCompanyId
  const answerCompany = await db.query.company.findFirst({
    where: eq(company.id, row.answerCompanyId),
  });
  if (!answerCompany) return { error: "Puzzle data error" };

  const isCorrect = companyId === row.answerCompanyId;

  const feedback: GuessFeedback = {
    guessedCompanyId: companyId,
    guessedTicker: guessedCompany.ticker,
    guessedName: guessedCompany.name,
    sectorMatch: guessedCompany.sector === answerCompany.sector,
    marketCapDirection: compareDirection(
      guessedCompany.marketCap,
      answerCompany.marketCap,
    ),
    employeeDirection: compareDirection(
      guessedCompany.employees,
      answerCompany.employees,
    ),
    ipoYearDirection: compareDirection(
      guessedCompany.ipoYear,
      answerCompany.ipoYear,
    ),
    isCorrect,
  };

  const session = await getSession();
  if (!session?.user) return { error: "Not authenticated" };
  const userId = session.user.id;

  await db.insert(guess).values({
    puzzleId,
    userId,
    guessedCompanyId: companyId,
    guessNumber,
    feedback: JSON.stringify(feedback),
  });

  return feedback;
}
