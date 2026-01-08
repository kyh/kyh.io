import type { AxisLabels, QuadrantColors } from "./types";

export const DEFAULT_QUADRANT_COLORS: QuadrantColors = {
  topLeft: "transparent",
  topRight: "transparent",
  bottomLeft: "transparent",
  bottomRight: "transparent",
};

export const DEFAULT_AXIS_LABELS: AxisLabels = {
  xPositive: "High",
  xNegative: "Low",
  yPositive: "High",
  yNegative: "Low",
};

export const TAG_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export const STORAGE_KEY = "kwadrants-state";
