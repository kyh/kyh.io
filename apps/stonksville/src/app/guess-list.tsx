import type { GuessFeedback } from "@/db/zod-schema";

import { GuessRow } from "./guess-row";

const MAX_GUESSES = 6;

export function GuessList({ guesses }: { guesses: GuessFeedback[] }) {
  const emptySlots = MAX_GUESSES - guesses.length;

  return (
    <div className="space-y-1">
      {guesses.map((g, i) => (
        <GuessRow key={i} guess={g} />
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <div
          key={`empty-${i}`}
          className="border-border/50 flex h-10 items-center rounded-md border border-dashed"
        >
          <span className="text-muted-foreground/30 px-3 text-sm">
            Guess {guesses.length + i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
