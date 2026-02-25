import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { and, asc, eq, sql } from "@/db";
import { db } from "@/db/drizzle-client";
import { guess, puzzle } from "@/db/drizzle-schema";
import {
  puzzleDataSchema,
  guessFeedbackSchema,
  type GuessFeedback,
  type PuzzleDataPayload,
} from "@/db/zod-schema";

import { getSession } from "@/lib/auth";

/** Puzzle data sent to client - no answer! */
export type PuzzleData = {
  id: string;
  date: string;
  type: PuzzleDataPayload["type"];
  puzzleNumber: number;
  puzzleData: PuzzleDataPayload;
};

export type GameStatus = "playing" | "won" | "lost";

export type GameState = {
  puzzleId: string;
  guesses: GuessFeedback[];
  status: GameStatus;
};

export async function getTodayDateString(): Promise<string> {
  await connection();
  return new Date().toISOString().slice(0, 10);
}

export async function getPuzzleByDate(
  date: string,
): Promise<PuzzleData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("puzzle", `puzzle-${date}`);

  const row = await db.query.puzzle.findFirst({
    where: eq(puzzle.date, date),
  });

  if (!row) return null;

  const parsed = puzzleDataSchema.parse(JSON.parse(row.puzzleData));

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(puzzle)
    .where(sql`${puzzle.date} <= ${date}`);

  const puzzleNumber = countResult[0]?.count ?? 1;

  return {
    id: row.id,
    date: row.date,
    type: parsed.type,
    puzzleNumber,
    puzzleData: parsed,
  } satisfies PuzzleData;
}

export async function getLatestAvailablePuzzle(): Promise<PuzzleData | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("puzzle", "puzzle-latest");

  const today = new Date().toISOString().slice(0, 10);
  const row = await db.query.puzzle.findFirst({
    where: sql`${puzzle.date} <= ${today}`,
    orderBy: sql`${puzzle.date} desc`,
  });

  if (!row) return null;

  const parsed = puzzleDataSchema.parse(JSON.parse(row.puzzleData));

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(puzzle)
    .where(sql`${puzzle.date} <= ${row.date}`);

  const puzzleNumber = countResult[0]?.count ?? 1;

  return {
    id: row.id,
    date: row.date,
    type: parsed.type,
    puzzleNumber,
    puzzleData: parsed,
  } satisfies PuzzleData;
}

export async function getTodaysPuzzle(): Promise<PuzzleData | null> {
  const today = await getTodayDateString();
  return (await getPuzzleByDate(today)) ?? (await getLatestAvailablePuzzle());
}

const MAX_GUESSES = 6;

export async function getGameState(
  puzzleId: string,
): Promise<GameState | null> {
  await connection();

  const session = await getSession();
  if (!session?.user) return null;

  const rows = await db
    .select({ feedback: guess.feedback })
    .from(guess)
    .where(and(eq(guess.puzzleId, puzzleId), eq(guess.userId, session.user.id)))
    .orderBy(asc(guess.guessNumber));

  if (rows.length === 0) return null;

  const guesses = rows.flatMap((row) => {
    if (!row.feedback) return [];
    const parsed = guessFeedbackSchema.safeParse(JSON.parse(row.feedback));
    return parsed.success ? [parsed.data] : [];
  });

  const won = guesses.some((g) => g.isCorrect);
  const status = won ? "won" : guesses.length >= MAX_GUESSES ? "lost" : "playing";

  return { puzzleId, guesses, status };
}
