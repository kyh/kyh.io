import { ArrowUp, ArrowDown, Check } from "lucide-react";
import { cn } from "@/components/utils";

import type { GuessFeedback, Direction } from "@/db/zod-schema";

function DirectionIcon({ direction }: { direction: Direction }) {
  if (direction === "correct")
    return <Check className="size-4 text-green-500" />;
  if (direction === "higher")
    return <ArrowUp className="size-4 text-yellow-500" />;
  return <ArrowDown className="size-4 text-yellow-500" />;
}

function DirectionCell({
  label,
  direction,
}: {
  label: string;
  direction: Direction;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5",
        direction === "correct"
          ? "bg-green-500/15 text-green-500"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
      <DirectionIcon direction={direction} />
    </div>
  );
}

export function GuessRow({ guess }: { guess: GuessFeedback }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {guess.guessedTicker && (
          <span className="font-mono text-sm font-semibold">
            {guess.guessedTicker}
          </span>
        )}
        <span className="text-muted-foreground min-w-0 truncate text-sm">
          {guess.guessedName}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border border-transparent px-2 py-0.5 text-[10px] font-medium",
            guess.sectorMatch
              ? "border-green-500/30 bg-green-500/15 text-green-500"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          Sector
        </span>
        <DirectionCell label="Mkt Cap" direction={guess.marketCapDirection} />
        <DirectionCell label="Emp" direction={guess.employeeDirection} />
        <DirectionCell label="IPO" direction={guess.ipoYearDirection} />
      </div>
    </div>
  );
}
