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
  madeAt: Date | null;
  predictor: { id: number; name: string };
  group: { id: number; name: string };
};

type Group = {
  id: number;
  name: string;
  members: { id: number; name: string }[];
};

type Member = {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
};

export const PredictionsAdmin = ({
  predictions,
  groups,
  members,
}: {
  predictions: Prediction[];
  groups: Group[];
  members: Member[];
}) => {
  const toast = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string>(
    groups[0] ? String(groups[0].id) : "",
  );
  const [text, setText] = useState("");
  const [predictorId, setPredictorId] = useState<string>("");
  const [madeAt, setMadeAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groupMembers = members.filter(
    (m) => String(m.groupId) === selectedGroup,
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !predictorId || !selectedGroup) return;
    setIsSubmitting(true);
    try {
      await createPrediction({
        text: text.trim(),
        predictorId: Number(predictorId),
        groupId: Number(selectedGroup),
        madeAt: madeAt || undefined,
      });
      setText("");
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

      {groups.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          Create a group first before adding predictions.
        </p>
      ) : (
        <form onSubmit={handleCreate} className="mb-8 space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setPredictorId("");
              }}
              className="border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={predictorId}
              onChange={(e) => setPredictorId(e.target.value)}
              className="border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
              required
            >
              <option value="">Who said it?</option>
              {groupMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The prediction..."
            required
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
                {p.predictor.name} &middot; {p.group.name}
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
