"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Undo2, X } from "lucide-react";

import type { PredictionStatus } from "@/db/drizzle-schema";
import {
  createPrediction,
  deletePrediction,
  resolvePrediction,
  unresolve,
} from "@/lib/prediction-action";
import { useToast } from "@/components/toast";

type Prediction = {
  id: number;
  quote: string;
  description: string | null;
  background: string | null;
  status: PredictionStatus;
  source: string | null;
  madeAt: Date | null;
  user: { id: string; name: string };
};

type User = {
  id: string;
  name: string;
};

export const PredictionsAdmin = ({
  predictions,
  users,
}: {
  predictions: Prediction[];
  users: User[];
}) => {
  const router = useRouter();
  const toast = useToast();
  const [quote, setQuote] = useState("");
  const [description, setDescription] = useState("");
  const [background, setBackground] = useState("");
  const [userId, setUserId] = useState<string>(users[0]?.id ?? "");
  const [source, setSource] = useState("");
  const [madeAt, setMadeAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || !userId) return;
    setIsSubmitting(true);
    try {
      await createPrediction({
        quote: quote.trim(),
        description: description.trim() || undefined,
        background: background.trim() || undefined,
        userId,
        source: source.trim() || undefined,
        madeAt: madeAt || undefined,
      });
      setQuote("");
      setDescription("");
      setBackground("");
      setSource("");
      setMadeAt("");
      router.refresh();
      toast.success("Prediction added");
    } catch {
      toast.error("Failed to add prediction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: number, status: "correct" | "wrong") => {
    try {
      await resolvePrediction({ id, status });
      router.refresh();
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const handleUnresolve = async (id: number) => {
    try {
      await unresolve({ id });
      router.refresh();
      toast.success("Reset to pending");
    } catch {
      toast.error("Failed to reset");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this prediction?")) return;
    try {
      await deletePrediction({ id });
      router.refresh();
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">Add prediction</h2>

      {users.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          No users yet. Users must sign up before predictions can be added.
        </p>
      ) : (
        <form onSubmit={handleCreate} className="mb-8 space-y-3">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
            required
          >
            <option value="">Who said it?</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Exact quote..."
            required
            className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (general outline)"
            className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />

          <input
            type="text"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="Background context"
            className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />

          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Source (e.g. messenger:123:456)"
            className="w-full border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={madeAt}
              onChange={(e) => setMadeAt(e.target.value)}
              className="border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <h2 className="mb-4 text-sm font-medium">
        All predictions ({predictions.length})
      </h2>

      <div className="divide-y divide-border">
        {predictions.map((p) => (
          <div key={p.id} className="flex items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm italic">&ldquo;{p.quote}&rdquo;</p>
              {p.description && (
                <p className="text-xs text-muted-foreground">
                  {p.description}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.user.name}
                {p.source && ` · ${p.source}`}
                {p.madeAt &&
                  ` · ${new Date(p.madeAt).toLocaleDateString()}`}
                {p.status !== "pending" && (
                  <span
                    className={
                      p.status === "correct"
                        ? "ml-1 text-success"
                        : "ml-1 text-destructive"
                    }
                  >
                    &middot; {p.status}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {p.status === "pending" ? (
                <>
                  <button
                    onClick={() => handleResolve(p.id, "correct")}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-success"
                    title="Mark correct"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => handleResolve(p.id, "wrong")}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    title="Mark wrong"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleUnresolve(p.id)}
                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Reset to pending"
                >
                  <Undo2 className="size-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(p.id)}
                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {predictions.length === 0 && (
        <p className="text-sm text-muted-foreground">No predictions yet.</p>
      )}
    </div>
  );
};
