import { Suspense } from "react";
import Link from "next/link";

import { getAllPredictions } from "@/lib/prediction-query";

import { PredictionFeed } from "./prediction-feed";

export const dynamic = "force-dynamic";

const PredictionFeedLoader = async () => {
  const predictions = await getAllPredictions();
  return <PredictionFeed predictions={predictions} />;
};

const FeedSkeleton = () => (
  <div className="divide-y divide-border">
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="py-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    ))}
  </div>
);

const HomePage = () => {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="max-w-xl">
        <header className="mb-8">
          <h1 className="text-base font-normal">Bet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prediction ledger
          </p>
          <nav className="mt-3 flex gap-4 text-sm">
            <Link
              href="/stats"
              className="text-muted-foreground hover:text-foreground"
            >
              Stats
            </Link>
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground"
            >
              Admin
            </Link>
          </nav>
        </header>
        <Suspense fallback={<FeedSkeleton />}>
          <PredictionFeedLoader />
        </Suspense>
      </div>
    </main>
  );
};

export default HomePage;
