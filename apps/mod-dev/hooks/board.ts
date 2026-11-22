import { DIMENSIONS, bar } from "./grade";
import type { Grade, Verdict } from "./grade";
import type { Mark } from "./proof";

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

export const verdictChip = (verdict: Verdict, grade: Grade) =>
  `● ${verdict} ${DIMENSIONS.map((dimension) => grade.scores[dimension].score).join("·")}`;

export const verdictLine = (verdict: Verdict, reasons: readonly string[]) =>
  `● ${verdict}${reasons.length > 0 ? ` · ${reasons.join("; ")}` : ""}`;

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
