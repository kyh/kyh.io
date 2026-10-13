// What the band above the prompt and the pane show, as plain rows: signs,
// colors, score bars. Pure, so the drawing in register.tsx only lays them out.

import { DIMENSIONS, bar } from "./grade";
import type { Grade, Verdict } from "./grade";
import type { Mark } from "./proof";

// Colors are the terminal theme's keys.
export const MARK_LOOK: Readonly<Record<Mark, { sign: string; color?: string }>> = {
  fail: { color: "error", sign: "✗" },
  none: { sign: "–" },
  pass: { color: "success", sign: "✓" },
  stale: { color: "warning", sign: "↺" },
  waived: { color: "warning", sign: "?" },
};

export const VERDICT_COLOR = {
  "fix first": "warning",
  "not ready": "error",
  ready: "success",
} as const satisfies Record<Verdict, string>;

const scoreColor = (score: number) => {
  if (score >= 7) {
    return "success";
  }
  return score > 4 ? "warning" : "error";
};

// The band's verdict: the word and the four scores, `● fix first 8·6·9·9`.
export const verdictChip = (verdict: Verdict, grade: Grade) =>
  `● ${verdict} ${DIMENSIONS.map((dimension) => grade.scores[dimension].score).join("·")}`;

// The pane's headline: the verdict and why it isn't ready.
export const verdictLine = (verdict: Verdict, reasons: readonly string[]) =>
  `● ${verdict}${reasons.length > 0 ? ` · ${reasons.join("; ")}` : ""}`;

// One row per score, labels padded to line the bars up.
export const scoreRows = (grade: Grade) =>
  DIMENSIONS.map((dimension) => {
    const { score, why } = grade.scores[dimension];
    return {
      bar: bar(score),
      color: scoreColor(score),
      label: dimension.padEnd(10),
      score: String(score).padStart(2),
      why,
    };
  });

// The status line: what is verified, then where the review stands.
export const statusLine = (
  status: string | undefined,
  review: { phase: string; verdict?: Verdict },
) => {
  if (status === undefined) {
    return;
  }
  if (review.phase === "reviewing") {
    return `${status} · reviewing…`;
  }
  return review.verdict === undefined ? status : `${status} · ${review.verdict}`;
};
