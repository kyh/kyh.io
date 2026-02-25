"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { ArrowDown, ArrowUp, Check, Moon, Sun, X } from "lucide-react";

import type { Direction, GuessFeedback } from "@/db/zod-schema";
import type { CompanyPickerItem } from "@/lib/companies-query";
import type { GameState, GameStatus, PuzzleData } from "@/lib/puzzle-query";
import { useTheme } from "@/components/theme";
import { cn } from "@/components/utils";
import { authClient } from "@/lib/auth-client";
import { submitGuess } from "@/lib/puzzle-action";
import { recordResult } from "@/lib/stats-action";
import { GuessInput } from "./guess-input";
import { HelpDialog } from "./help-dialog";
import { ResultModal } from "./result-modal";
import { Treemap } from "./treemap";

const MAX_GUESSES = 6;

type Action = { type: "GUESS"; feedback: GuessFeedback };

const reducer = (state: GameState, action: Action): GameState => {
  const guesses = [...state.guesses, action.feedback];
  let status: GameStatus = "playing";
  if (action.feedback.isCorrect) status = "won";
  else if (guesses.length >= MAX_GUESSES) status = "lost";
  return { ...state, guesses, status };
};

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="hover:bg-accent hover:text-accent-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-md"
    >
      {mounted ? (
        resolvedTheme === "dark" ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}

const createInitialState = (puzzleId: string): GameState => {
  return { puzzleId, guesses: [], status: "playing" };
};

const tooltipPopupClass =
  "bg-popover text-popover-foreground z-50 rounded-md border px-2 py-1 text-xs shadow-md";

function directionLabel(direction: Direction): string {
  if (direction === "correct") return "Correct";
  if (direction === "higher") return "Higher";
  return "Lower";
}

const IndicatorCell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger className="cursor-default" render={<span />}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={6} className="z-50">
          <Tooltip.Popup className={tooltipPopupClass}>{label}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const DirectionIndicator = ({
  guessName,
  label,
  direction,
}: {
  guessName: string;
  label: string;
  direction: Direction;
}) => {
  return (
    <IndicatorCell
      label={`${guessName} · ${label}: ${directionLabel(direction)}`}
    >
      <div
        className={cn(
          "flex size-5 items-center justify-center rounded-sm",
          direction === "correct"
            ? "bg-green-900 text-green-400"
            : "bg-amber-900 text-amber-400",
        )}
      >
        {direction === "correct" ? (
          <Check className="size-3" strokeWidth={3} />
        ) : direction === "higher" ? (
          <ArrowUp className="size-3" strokeWidth={3} />
        ) : (
          <ArrowDown className="size-3" strokeWidth={3} />
        )}
      </div>
    </IndicatorCell>
  );
}

const SectorIndicator = ({
  guessName,
  match,
}: {
  guessName: string;
  match: boolean;
}) => {
  return (
    <IndicatorCell
      label={`${guessName} · Sector: ${match ? "Match" : "No match"}`}
    >
      <div
        className={cn(
          "flex size-5 items-center justify-center rounded-sm",
          match
            ? "bg-green-900 text-green-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {match ? (
          <Check className="size-3" strokeWidth={3} />
        ) : (
          <X className="size-3" strokeWidth={3} />
        )}
      </div>
    </IndicatorCell>
  );
}

const GuessChip = ({ guess }: { guess: GuessFeedback }) => {
  return (
    <Tooltip.Provider delay={0} closeDelay={0}>
      <div className="flex items-center gap-px">
        <SectorIndicator
          guessName={guess.guessedName}
          match={guess.sectorMatch}
        />
        <DirectionIndicator
          guessName={guess.guessedName}
          label="Mkt Cap"
          direction={guess.marketCapDirection}
        />
        <DirectionIndicator
          guessName={guess.guessedName}
          label="Emp"
          direction={guess.employeeDirection}
        />
        <DirectionIndicator
          guessName={guess.guessedName}
          label="IPO"
          direction={guess.ipoYearDirection}
        />
      </div>
    </Tooltip.Provider>
  );
}

const GuessIndicators = ({ guesses }: { guesses: GuessFeedback[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastGuessRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (guesses.length > 0 && lastGuessRef.current && scrollRef.current) {
      lastGuessRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [guesses.length]);

  return (
    <div ref={scrollRef} className="scrollbar-none overflow-x-auto">
      <div className="mx-auto flex w-max items-center gap-2">
        {guesses.map((g, i) => (
          <div
            key={i}
            ref={i === guesses.length - 1 ? lastGuessRef : undefined}
          >
            <GuessChip guess={g} />
          </div>
        ))}
        {Array.from({ length: MAX_GUESSES - guesses.length }, (_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-px">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="border-border size-5 rounded-sm border" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="grid h-dvh grid-rows-[auto_1fr_auto]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Stonksville</h1>
          <p className="text-muted-foreground text-xs">
            #{puzzle.puzzleNumber} &middot; {puzzle.date}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <HelpDialog />
          <ThemeToggle />
        </div>
      </header>

      {/* Treemap fills remaining space */}
      <div className="min-h-0 overflow-hidden px-4 pb-2">
        <Treemap segments={segments} />
      </div>

      {/* Guess indicators + Search input */}
      <div className="mt-auto max-w-dvw space-y-2 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg space-y-2">
          <GuessIndicators guesses={state.guesses} />
          <GuessInput
            companies={companies}
            onSelect={handleSelect}
            disabled={gameOver}
          />
        </div>
      </div>

      {gameOver ? (
        <ResultModal state={state} puzzleNumber={puzzle.puzzleNumber} />
      ) : null}
    </div>
  );
};
