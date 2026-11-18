export interface Check {
  kind: "static" | "test" | "build" | "e2e";
  mark: "pass" | "fail" | "stale" | "none" | "waived";
  hint: string;
}

export interface Score {
  score: number;
  why: string;
}

export interface Grade {
  scores: { confidence: Score; idiomatic: Score; simplicity: Score; scope: Score };
  risk: { level: "low" | "medium" | "high"; why: string };
  fixes: { text: string; source: string }[];
}

export interface Review {
  phase: "idle" | "reviewing" | "done" | "failed";
  fingerprint: string;
  replied: string;
  grade?: Grade;
  verdict?: "ready" | "fix first" | "not ready";
  reasons: readonly string[];
  note: string;
}

declare module "claude-code" {
  interface PluginState {
    "mod-dev": { checks: Check[]; review: Review; blocks: number };
  }
}
