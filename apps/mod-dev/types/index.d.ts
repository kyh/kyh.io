// The values mod-dev keeps in $.state. A contract imports nothing, so Check
// and Grade are plain copies of hooks/proof.ts's and hooks/grade.ts's.

export interface Check {
  kind: "static" | "test" | "build" | "e2e";
  mark: "pass" | "fail" | "stale" | "none" | "waived";
  // The commands that would run it, or why Claude could not.
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

// The reviewer's last word on the change: `fingerprint` names the change and
// the checks it was read with, `replied` the reply it read. A ready change is
// not reviewed again; one that isn't is, once Claude has answered it.
export interface Review {
  phase: "idle" | "reviewing" | "done" | "failed";
  fingerprint: string;
  replied: string;
  grade?: Grade;
  verdict?: "ready" | "fix first" | "not ready";
  reasons: readonly string[];
  // Under the scorecard: what was compared and who reviewed it; on a failure, why.
  note: string;
}

declare module "claude-code" {
  interface PluginState {
    // `checks`: what the change needs and where each stands; `blocks`: how many
    // times the gate sent Claude back since the person's last prompt.
    "mod-dev": { checks: Check[]; review: Review; blocks: number };
  }
}
