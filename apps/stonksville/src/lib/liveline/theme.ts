import type { ThemeMode, LivelinePalette, LivelineSeries } from "./types";

const HEX_RE = /^#(?<hex>[0-9a-f]{3,8})$/iu;
const RGB_RE = /rgba?\(\s*(?<r>\d+)\s*,\s*(?<g>\d+)\s*,\s*(?<b>\d+)/u;

/** Parse any CSS color string to [r, g, b]. Handles hex (#rgb, #rrggbb), rgb(), rgba(). */
export const parseColorRgb = (color: string): [number, number, number] => {
  const hex = HEX_RE.exec(color)?.groups?.hex;
  if (hex !== undefined) {
    const h = hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex;
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = RGB_RE.exec(color)?.groups;
  if (rgb) {
    return [Number(rgb.r), Number(rgb.g), Number(rgb.b)];
  }
  return [128, 128, 128];
};

const rgba = (r: number, g: number, b: number, a: number): string => `rgba(${r}, ${g}, ${b}, ${a})`;

/**
 * Derive a full palette from a single accent color + theme mode.
 * Momentum colors are always semantic green/red regardless of accent.
 */
export const resolveTheme = (color: string, mode: ThemeMode): LivelinePalette => {
  const [r, g, b] = parseColorRgb(color);
  const isDark = mode === "dark";

  return {
    badgeBg: color,
    badgeFont: '500 11px "SF Mono", Menlo, monospace',
    badgeOuterBg: isDark ? "rgba(40, 40, 40, 0.95)" : "rgba(255, 255, 255, 0.95)",
    badgeOuterShadow: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.15)",
    badgeText: "#ffffff",
    bgRgb: isDark
      ? ([10, 10, 10] satisfies [number, number, number])
      : ([255, 255, 255] satisfies [number, number, number]),
    crosshairLine: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
    dashLine: rgba(r, g, b, 0.4),
    dotDown: "#ef4444",
    dotFlat: color,
    dotUp: "#22c55e",
    fillBottom: rgba(r, g, b, 0),
    fillTop: rgba(r, g, b, isDark ? 0.12 : 0.08),
    glowDown: "rgba(239, 68, 68, 0.18)",
    glowFlat: rgba(r, g, b, 0.12),
    glowUp: "rgba(34, 197, 94, 0.18)",
    gridLabel: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.35)",
    gridLine: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    labelFont: '11px "SF Mono", Menlo, Monaco, "Cascadia Code", monospace',
    line: color,
    lineWidth: 2,
    refLabel: isDark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.4)",
    refLine: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.12)",
    timeLabel: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.3)",
    tooltipBg: isDark ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
    tooltipBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
    tooltipText: isDark ? "#e5e5e5" : "#1a1a1a",
    valueFont: '600 11px "SF Mono", Menlo, monospace',
  };
};

/** Default color palette for multi-series when no colors specified: blue, red, green, amber, violet, pink, cyan, orange. */
export const SERIES_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

/** Derive per-series palettes from series definitions. */
export const resolveSeriesPalettes = (
  series: LivelineSeries[],
  mode: ThemeMode,
): Map<string, LivelinePalette> => {
  const map = new Map<string, LivelinePalette>();
  for (let i = 0; i < series.length; i += 1) {
    const s = series[i];
    const color = s.color || SERIES_COLORS[i % SERIES_COLORS.length];
    map.set(s.id, resolveTheme(color, mode));
  }
  return map;
};
