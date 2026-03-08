"use client";

import { useState } from "react";
import { Check, CircleDot, X } from "lucide-react";

import type { PredictionStatus } from "@/db/drizzle-schema";

type Prediction = {
  id: number;
  quote: string;
  description: string | null;
  background: string | null;
  status: PredictionStatus;
  source: string | null;
  madeAt: Date | null;
  resolvedAt: Date | null;
  user: { id: string; name: string };
};

const statusConfig = {
  pending: { icon: CircleDot, label: "Pending", className: "text-muted-foreground" },
  correct: { icon: Check, label: "Correct", className: "text-success" },
  wrong: { icon: X, label: "Wrong", className: "text-destructive" },
} as const;

const formatDate = (date: Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

type FilterStatus = "all" | PredictionStatus;

export const PredictionFeed = ({
  predictions,
}: {
  predictions: Prediction[];
}) => {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const filtered = predictions.filter(
    (p) => filter === "all" || p.status === filter,
  );

  const counts = {
    all: predictions.length,
    pending: predictions.filter((p) => p.status === "pending").length,
    correct: predictions.filter((p) => p.status === "correct").length,
    wrong: predictions.filter((p) => p.status === "wrong").length,
  };

  if (predictions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No predictions yet. Add some from the admin panel.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "pending", "correct", "wrong"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs transition-colors ${
              filter === s
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}{" "}
            ({counts[s]})
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {filtered.map((prediction) => {
          const config = statusConfig[prediction.status];
          const Icon = config.icon;
          return (
            <div key={prediction.id} className="py-4">
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 size-4 shrink-0 ${config.className}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm italic">&ldquo;{prediction.quote}&rdquo;</p>
                  {prediction.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {prediction.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{prediction.user.name}</span>
                    {prediction.source && (
                      <span>{prediction.source}</span>
                    )}
                    {prediction.madeAt && (
                      <span>{formatDate(prediction.madeAt)}</span>
                    )}
                    {prediction.resolvedAt && (
                      <span className={config.className}>
                        {config.label} {formatDate(prediction.resolvedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No predictions match this filter.
        </p>
      )}
    </div>
  );
};
