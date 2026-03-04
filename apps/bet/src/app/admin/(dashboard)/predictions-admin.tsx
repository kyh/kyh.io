"use client";

import { useState } from "react";
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
  text: string;
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
  const toast = useToast();
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string>(users[0]?.id ?? "");
  const [source, setSource] = useState("");
  const [madeAt, setMadeAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    setIsSubmitting(true);
    try {
      await createPrediction({
        text: text.trim(),
        userId,
        source: source.trim() || undefined,
        madeAt: madeAt || undefined,
      });
      setText("");
      setSource("");
      setMadeAt("");
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
      toast.success(`Marked as ${status}`);
    } catch {
      toast.error("Failed to resolve");
    }
  };

  const handleUnresolve = async (id: number) => {
    try {
      await unresolve({ id });
      toast.success("Reset to pending");
    } catch {
      toast.error("Failed to reset");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePrediction({ id });
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
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The prediction..."
            required
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
              <p className="text-sm">{p.text}</p>
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
