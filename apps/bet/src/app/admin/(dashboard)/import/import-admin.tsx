"use client";

import { useState } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";

import type { ExtractedPrediction } from "@/lib/import-action";
import { extractPredictions, savePredictions } from "@/lib/import-action";
import { useToast } from "@/components/toast";

export const ImportAdmin = () => {
  const toast = useToast();
  const [handle, setHandle] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedPrediction[]>([]);
  const [resolvedHandle, setResolvedHandle] = useState("");

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    setIsExtracting(true);
    setExtracted([]);
    try {
      const result = await extractPredictions(handle);
      setExtracted(result.predictions);
      setResolvedHandle(result.handle);
      if (result.predictions.length === 0) {
        toast.success("No predictions found in their tweets");
      } else {
        toast.success(`Found ${result.predictions.length} predictions`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to extract predictions",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRemove = (index: number) => {
    setExtracted((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (extracted.length === 0) return;
    setIsSaving(true);
    try {
      const result = await savePredictions({
        handle: resolvedHandle,
        predictions: extracted,
      });
      toast.success(`Saved ${result.count} predictions`);
      setExtracted([]);
      setHandle("");
      setResolvedHandle("");
    } catch {
      toast.error("Failed to save predictions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-sm font-medium">Import from X</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Enter a Twitter/X handle to scan their tweets from the last year and
        extract predictions.
      </p>

      <form onSubmit={handleExtract} className="mb-8 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">@</span>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="handle"
          required
          className="flex-1 border-b border-input bg-transparent py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={isExtracting}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExtracting ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Scanning...
            </>
          ) : (
            "Scan"
          )}
        </button>
      </form>

      {extracted.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Found {extracted.length} predictions from @{resolvedHandle}
            </h2>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-3" />
                  Save all
                </>
              )}
            </button>
          </div>

          <div className="divide-y divide-border">
            {extracted.map((p, i) => (
              <div key={i} className="flex items-start gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm italic">
                    &ldquo;{p.quote}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                  {p.background && (
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {p.background}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/40">
                    {p.madeAt}
                    {p.tweetId && ` · tweet:${p.tweetId}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  className="mt-1 shrink-0 cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                  title="Remove"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isExtracting && extracted.length === 0 && resolvedHandle && (
        <p className="text-sm text-muted-foreground">
          No predictions found in @{resolvedHandle}&apos;s recent tweets.
        </p>
      )}
    </div>
  );
};
