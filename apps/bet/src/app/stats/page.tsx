import { Suspense } from "react";
import Link from "next/link";

import { getPredictionStats } from "@/lib/prediction-query";

export const dynamic = "force-dynamic";

const StatsContent = async () => {
  const stats = await getPredictionStats();

  const sorted = [...stats].sort((a, b) => {
    if (a.accuracy !== null && b.accuracy !== null)
      return b.accuracy - a.accuracy;
    if (a.accuracy !== null) return -1;
    if (b.accuracy !== null) return 1;
    return b.total - a.total;
  });

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No predictions yet. Stats will appear once predictions are added.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {sorted.map((person) => (
        <div key={person.userId} className="py-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-medium">{person.name}</h3>
            {person.accuracy !== null ? (
              <span
                className={`text-lg font-medium tabular-nums ${
                  person.accuracy >= 60
                    ? "text-success"
                    : person.accuracy >= 40
                      ? "text-foreground"
                      : "text-destructive"
                }`}
              >
                {person.accuracy}%
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">--</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{person.total} total</span>
            <span className="text-success">{person.correct} correct</span>
            <span className="text-destructive">{person.wrong} wrong</span>
            <span>{person.pending} pending</span>
          </div>
          {person.correct + person.wrong > 0 && (
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-success"
                style={{
                  width: `${(person.correct / (person.correct + person.wrong)) * 100}%`,
                }}
              />
              <div
                className="bg-destructive"
                style={{
                  width: `${(person.wrong / (person.correct + person.wrong)) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const StatsPage = () => {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              &larr;
            </Link>
            <h1 className="text-base font-normal">Stats</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-person prediction accuracy
          </p>
        </header>
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="py-4">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <StatsContent />
        </Suspense>
      </div>
    </main>
  );
};

export default StatsPage;
