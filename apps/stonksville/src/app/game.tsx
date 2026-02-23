"use client";

import { useReducer, useCallback, useEffect, useRef } from "react";

import type { GuessFeedback } from "@/db/zod-schema";
import type { PuzzleData, GameState, GameStatus } from "@/lib/puzzle-query";
import type { CompanyPickerItem } from "@/lib/companies-query";
import { authClient } from "@/lib/auth-client";
import { submitGuess } from "@/lib/puzzle-action";
import { recordResult } from "@/lib/stats-action";

import { Treemap } from "./treemap";
import { GuessInput } from "./guess-input";
import { GuessList } from "./guess-list";
import { ResultModal } from "./result-modal";

const MAX_GUESSES = 6;

type Action = { type: "GUESS"; feedback: GuessFeedback };

const reducer = (state: GameState, action: Action): GameState => {
  const guesses = [...state.guesses, action.feedback];
  let status: GameStatus = "playing";
  if (action.feedback.isCorrect) status = "won";
  else if (guesses.length >= MAX_GUESSES) status = "lost";
  return { ...state, guesses, status };
};

const createInitialState = (puzzleId: string): GameState => {
  return { puzzleId, guesses: [], status: "playing" };
};

type GameProps = {
  puzzle: PuzzleData;
  companies: CompanyPickerItem[];
  initialState: GameState | null;
};

export const Game = ({ puzzle, companies, initialState }: GameProps) => {
  const [state, dispatch] = useReducer(
    reducer,
    initialState ?? createInitialState(puzzle.id),
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const gameOver = state.status !== "playing";

  const handleSelect = useCallback(
    async (companyId: string) => {
      const current = stateRef.current;
      if (current.status !== "playing") return;
      if (current.guesses.some((g) => g.guessedCompanyId === companyId)) return;

      // Ensure user has a session (creates anonymous if needed)
      const session = await authClient.getSession();
      if (!session.data) {
        await authClient.signIn.anonymous();
      }

      const result = await submitGuess(
        puzzle.id,
        companyId,
        current.guesses.length + 1,
      );

      if ("error" in result) return;

      dispatch({ type: "GUESS", feedback: result });

      const newGuessCount = current.guesses.length + 1;
      if (result.isCorrect) {
        void recordResult(true, newGuessCount);
      } else if (newGuessCount >= MAX_GUESSES) {
        void recordResult(false, newGuessCount);
      }
    },
    [puzzle.id],
  );

  const segments = puzzle.puzzleData.data.segments;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Puzzle #{puzzle.puzzleNumber} &middot; {puzzle.date}
        </p>
        <p className="mt-1 text-sm">
          Guess the company from its revenue breakdown
        </p>
      </div>

      <Treemap segments={segments} />

      <GuessInput
        companies={companies}
        onSelect={handleSelect}
        disabled={gameOver}
      />

      <GuessList guesses={state.guesses} />

      {gameOver ? (
        <ResultModal
          state={state}
          puzzleNumber={puzzle.puzzleNumber}
        />
      ) : null}
    </div>
  );
};
