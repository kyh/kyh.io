import type { LayoutLabels, QuadrantColors } from "./types";
import { getAllLayouts, getDefaultLabels } from "./layouts";

export const DEFAULT_QUADRANT_COLORS: QuadrantColors = {
  topLeft: "transparent",
  topRight: "transparent",
  bottomLeft: "transparent",
  bottomRight: "transparent",
};

export const DEFAULT_LAYOUT_LABELS: LayoutLabels = Object.fromEntries(
  getAllLayouts().map((layout) => [layout.id, getDefaultLabels(layout)]),
);

export const TAG_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
] as const;

export const DEFAULT_TAG_COLOR = TAG_COLORS[0];

export const STORAGE_KEY = "kwadrants-state";
