import { useRef, useState, useLayoutEffect, useMemo, useCallback } from "react";
import type { CSSProperties, RefObject } from "react";
import type {
  BadgeVariant,
  DegenOptions,
  LivelinePalette,
  LivelineProps,
  LivelineSeries,
  Momentum,
  Padding,
  ThemeMode,
  WindowOption,
  WindowStyle,
} from "./types";
import { resolveTheme, resolveSeriesPalettes, SERIES_COLORS } from "./theme";
import { useLivelineEngine } from "./use-liveline-engine";

type ChartMode = "line" | "candle";

const defaultFormatValue = (v: number) => v.toFixed(2);

const defaultFormatTime = (t: number) => {
  const d = new Date(t * 1000);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

// --- Prop defaults ---

interface Appearance {
  theme: ThemeMode;
  color: string;
  grid: boolean;
  badge: boolean;
  fill: boolean;
  pulse: boolean;
  badgeTail: boolean;
  badgeVariant: BadgeVariant;
  tooltipY: number;
  tooltipOutline: boolean;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  lerpSpeed: number;
  cursor: string;
}

const resolveAppearance = ({
  theme = "dark",
  color = "#3b82f6",
  grid = true,
  badge = true,
  fill = true,
  pulse = true,
  badgeTail = true,
  badgeVariant = "default",
  tooltipY = 14,
  tooltipOutline = true,
  formatValue = defaultFormatValue,
  formatTime = defaultFormatTime,
  lerpSpeed = 0.08,
  cursor = "crosshair",
}: LivelineProps): Appearance => ({
  badge,
  badgeTail,
  badgeVariant,
  color,
  cursor,
  fill,
  formatTime,
  formatValue,
  grid,
  lerpSpeed,
  pulse,
  theme,
  tooltipOutline,
  tooltipY,
});

interface Behavior {
  windowSecs: number;
  momentum: boolean | Momentum;
  scrub: boolean;
  loading: boolean;
  paused: boolean;
  exaggerate: boolean;
  showValue: boolean;
  valueMomentumColor: boolean;
  mode: ChartMode;
  seriesToggleCompact: boolean;
  windowStyle: WindowStyle;
}

const resolveBehavior = ({
  window: windowSecs = 30,
  momentum = true,
  scrub = true,
  loading = false,
  paused = false,
  exaggerate = false,
  showValue = false,
  valueMomentumColor = false,
  mode = "line",
  seriesToggleCompact = false,
  windowStyle = "default",
}: LivelineProps): Behavior => ({
  exaggerate,
  loading,
  mode,
  momentum,
  paused,
  scrub,
  seriesToggleCompact,
  showValue,
  valueMomentumColor,
  windowSecs,
  windowStyle,
});

interface MomentumSetting {
  showMomentum: boolean;
  momentumOverride: Momentum | undefined;
}

/** Boolean enables auto-detect, a Momentum string overrides it. */
const resolveMomentum = (momentum: boolean | Momentum): MomentumSetting => ({
  momentumOverride: momentum === true || momentum === false ? undefined : momentum,
  showMomentum: momentum !== false,
});

/** Explicit degen options win; `true` enables the defaults. */
const resolveDegen = (degen: LivelineProps["degen"]): DegenOptions | undefined => {
  if (degen === true) {
    return {};
  }
  return degen === false ? undefined : degen;
};

const resolvePadding = (
  override: Padding | undefined,
  badge: boolean,
  grid: boolean,
): Required<Padding> => {
  let defaultRight = 12;
  if (badge) {
    defaultRight = 80;
  } else if (grid) {
    defaultRight = 54;
  }
  return {
    bottom: override?.bottom ?? 28,
    left: override?.left ?? 12,
    right: override?.right ?? defaultRight,
    top: override?.top ?? 12,
  };
};

const initialWindowSecs = (windows: WindowOption[] | undefined, windowSecs: number): number =>
  windows && windows.length > 0 ? windows[0].secs : windowSecs;

interface SingleSeriesFeatures {
  degenOptions: DegenOptions | undefined;
  showBadge: boolean;
  showFill: boolean;
  showMomentum: boolean;
}

/** Badge, fill, momentum and degen are per-chart concerns that multi-series turns off. */
const resolveSingleSeriesFeatures = (
  isMultiSeries: boolean,
  look: Appearance,
  showMomentum: boolean,
  degenOptions: DegenOptions | undefined,
): SingleSeriesFeatures => {
  if (isMultiSeries) {
    return { degenOptions: undefined, showBadge: false, showFill: false, showMomentum: false };
  }
  return { degenOptions, showBadge: look.badge, showFill: look.fill, showMomentum };
};

// --- Hooks ---

const usePalette = (color: string, theme: ThemeMode, lineWidth: number | undefined) =>
  useMemo(() => {
    const p = resolveTheme(color, theme);
    if (lineWidth !== undefined) {
      p.lineWidth = lineWidth;
    }
    return p;
  }, [color, theme, lineWidth]);

interface EngineSeries {
  id: string;
  data: LivelineSeries["data"];
  value: number;
  palette: LivelinePalette;
  label?: string;
}

/** Normalized multi-series config for the engine, palettes memoized on series ids + colors + theme. */
const useMultiSeries = (
  seriesProp: LivelineSeries[] | undefined,
  theme: ThemeMode,
): EngineSeries[] | undefined => {
  const seriesPalettes = useMemo(
    () => (seriesProp && seriesProp.length > 0 ? resolveSeriesPalettes(seriesProp, theme) : null),
    [seriesProp, theme],
  );
  return useMemo(
    () =>
      seriesProp && seriesPalettes
        ? seriesProp.map((s, i) => ({
            data: s.data,
            id: s.id,
            label: s.label,
            palette:
              seriesPalettes.get(s.id) ??
              resolveTheme(s.color || SERIES_COLORS[i % SERIES_COLORS.length], theme),
            value: s.value,
          }))
        : undefined,
    [seriesProp, seriesPalettes, theme],
  );
};

/** An empty series prop keeps the toggle row rendering the last real one. */
const useStickySeries = (seriesProp: LivelineSeries[] | undefined) => {
  const [lastSeries, setLastSeries] = useState(seriesProp);
  const displaySeries = seriesProp && seriesProp.length > 0 ? seriesProp : lastSeries;
  if (displaySeries !== lastSeries) {
    setLastSeries(displaySeries);
  }
  return displaySeries;
};

/** Hidden-series set; the last visible series can't be hidden. */
const useSeriesToggle = (
  seriesProp: LivelineSeries[] | undefined,
  onSeriesToggle: LivelineProps["onSeriesToggle"],
) => {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const totalSeries = seriesProp?.length ?? 0;
  const toggleSeries = useCallback(
    (id: string) => {
      setHiddenSeries((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          onSeriesToggle?.(id, true);
          return next;
        }
        const visibleCount = totalSeries - next.size;
        if (visibleCount <= 1) {
          return prev;
        }
        next.add(id);
        onSeriesToggle?.(id, false);
        return next;
      });
    },
    [totalSeries, onSeriesToggle],
  );
  return { hiddenSeries, toggleSeries };
};

// --- Chrome styling ---

interface ChromeColors {
  active: string;
  inactive: string;
  barBg: string;
  indicator: string;
  valueText: string;
}

const CHROME: Record<ThemeMode, ChromeColors> = {
  dark: {
    active: "rgba(255,255,255,0.7)",
    barBg: "rgba(255,255,255,0.03)",
    inactive: "rgba(255,255,255,0.25)",
    indicator: "rgba(255,255,255,0.06)",
    valueText: "rgba(255,255,255,0.85)",
  },
  light: {
    active: "rgba(0,0,0,0.55)",
    barBg: "rgba(0,0,0,0.02)",
    inactive: "rgba(0,0,0,0.22)",
    indicator: "rgba(0,0,0,0.035)",
    valueText: "#111",
  },
};

const BAR_PADDING: Record<WindowStyle, number> = { default: 2, rounded: 3, text: 0 };

const pillRadius = (ws: WindowStyle): number => (ws === "rounded" ? 999 : 4);

const barStyle = (ws: WindowStyle, colors: ChromeColors): CSSProperties => ({
  background: ws === "text" ? "transparent" : colors.barBg,
  borderRadius: ws === "rounded" ? 999 : 6,
  display: "inline-flex",
  gap: ws === "text" ? 4 : 2,
  padding: BAR_PADDING[ws],
});

interface IndicatorPos {
  left: number;
  width: number;
}

const indicatorStyle = (
  ws: WindowStyle,
  colors: ChromeColors,
  pos: IndicatorPos,
): CSSProperties => ({
  background: colors.indicator,
  borderRadius: pillRadius(ws),
  height: ws === "rounded" ? "calc(100% - 6px)" : "calc(100% - 4px)",
  left: pos.left,
  pointerEvents: "none",
  position: "absolute",
  top: ws === "rounded" ? 3 : 2,
  transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  width: pos.width,
});

const measureIndicator = (bar: HTMLDivElement, btn: HTMLButtonElement): IndicatorPos => {
  const barRect = bar.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  return { left: btnRect.left - barRect.left, width: btnRect.width };
};

const trackButton =
  <K,>(refs: RefObject<Map<K, HTMLButtonElement>>, key: K) =>
  (el: HTMLButtonElement | null) => {
    if (el) {
      refs.current.set(key, el);
    } else {
      refs.current.delete(key);
    }
  };

const windowButtonStyle = (
  ws: WindowStyle,
  colors: ChromeColors,
  isActive: boolean,
): CSSProperties => ({
  background: "transparent",
  border: "none",
  borderRadius: pillRadius(ws),
  color: isActive ? colors.active : colors.inactive,
  cursor: "pointer",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 11,
  fontWeight: isActive ? 600 : 400,
  lineHeight: "16px",
  padding: ws === "text" ? "2px 6px" : "3px 10px",
  position: "relative",
  transition: "color 0.2s, background 0.15s",
  zIndex: 1,
});

const modeButtonStyle = (ws: WindowStyle): CSSProperties => ({
  alignItems: "center",
  background: "transparent",
  border: "none",
  borderRadius: pillRadius(ws),
  cursor: "pointer",
  display: "flex",
  padding: "5px 7px",
  position: "relative",
  zIndex: 1,
});

const chipPadding = (ws: WindowStyle, compact: boolean): string => {
  if (compact) {
    return ws === "text" ? "2px 4px" : "5px 7px";
  }
  return ws === "text" ? "2px 6px" : "3px 8px";
};

const chipStyle = (
  ws: WindowStyle,
  colors: ChromeColors,
  isHidden: boolean,
  compact: boolean,
): CSSProperties => ({
  alignItems: "center",
  background: isHidden || ws === "text" ? "transparent" : colors.indicator,
  border: "none",
  borderRadius: pillRadius(ws),
  color: isHidden ? colors.inactive : colors.active,
  cursor: "pointer",
  display: "flex",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  gap: compact ? 0 : 4,
  lineHeight: "16px",
  opacity: isHidden ? 0.4 : 1,
  padding: chipPadding(ws, compact),
  position: "relative",
  transition: "opacity 0.2s, background 0.15s, color 0.2s",
  zIndex: 1,
});

const chipDotStyle = (seriesColor: string, isHidden: boolean, compact: boolean): CSSProperties => ({
  background: seriesColor,
  borderRadius: "50%",
  flexShrink: 0,
  height: compact ? 8 : 6,
  opacity: isHidden ? 0.4 : 1,
  transition: "opacity 0.2s",
  width: compact ? 8 : 6,
});

// --- Chrome components ---

interface ValueDisplayProps {
  valueRef: RefObject<HTMLSpanElement | null>;
  color: string;
  paddingLeft: number;
}

const ValueDisplay = ({ valueRef, color, paddingLeft }: ValueDisplayProps) => (
  <span
    ref={valueRef}
    style={{
      color,
      display: "block",
      fontFamily: '"SF Mono", Menlo, monospace',
      fontSize: 20,
      fontWeight: 500,
      letterSpacing: "-0.01em",
      marginBottom: 8,
      paddingLeft,
      paddingTop: 4,
      transition: "color 0.3s",
    }}
  />
);

interface WindowBarProps {
  windows: WindowOption[];
  activeSecs: number;
  onSelect: (secs: number) => void;
  ws: WindowStyle;
  colors: ChromeColors;
}

const WindowBar = ({ windows, activeSecs, onSelect, ws, colors }: WindowBarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorPos | null>(null);

  useLayoutEffect(() => {
    const active = windows.find((w) => w.secs === activeSecs);
    const btn = active ? btnRefs.current.get(active.secs) : undefined;
    const bar = barRef.current;
    if (btn && bar) {
      setIndicator(measureIndicator(bar, btn));
    }
  }, [activeSecs, windows]);

  return (
    <div ref={barRef} style={{ ...barStyle(ws, colors), position: "relative" }}>
      {ws !== "text" && indicator && <div style={indicatorStyle(ws, colors, indicator)} />}
      {windows.map((w) => (
        <button
          key={w.secs}
          type="button"
          ref={trackButton(btnRefs, w.secs)}
          onClick={() => onSelect(w.secs)}
          style={windowButtonStyle(ws, colors, w.secs === activeSecs)}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
};

interface IconProps {
  color: string;
}

const LineIcon = ({ color, active }: IconProps & { active: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M1 8.5C2.5 8.5 3 4 5.5 4S7.5 7 8.5 7C9.5 7 10 3.5 11 3.5"
      stroke={color}
      strokeWidth={active ? 1.5 : 1.2}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const CandleIcon = ({ color }: IconProps) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <line x1="3.5" y1="1" x2="3.5" y2="11" stroke={color} strokeWidth="1" />
    <rect x="2" y="3" width="3" height="5" rx="0.5" fill={color} />
    <line x1="8.5" y1="2" x2="8.5" y2="10" stroke={color} strokeWidth="1" />
    <rect x="7" y="4" width="3" height="4" rx="0.5" fill={color} />
  </svg>
);

interface ModeBarProps {
  lineMode: boolean | undefined;
  onModeChange: (mode: ChartMode) => void;
  ws: WindowStyle;
  colors: ChromeColors;
}

const ModeBar = ({ lineMode, onModeChange, ws, colors }: ModeBarProps) => {
  const activeMode: ChartMode = lineMode ? "line" : "candle";
  const barRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<ChartMode, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorPos | null>(null);

  useLayoutEffect(() => {
    const btn = btnRefs.current.get(activeMode);
    const bar = barRef.current;
    if (btn && bar) {
      setIndicator(measureIndicator(bar, btn));
    }
  }, [activeMode]);

  const iconColor = (mode: ChartMode) => (activeMode === mode ? colors.active : colors.inactive);

  return (
    <div ref={barRef} style={{ ...barStyle(ws, colors), position: "relative" }}>
      {ws !== "text" && indicator && <div style={indicatorStyle(ws, colors, indicator)} />}
      <button
        type="button"
        aria-label="Line chart"
        ref={trackButton(btnRefs, "line")}
        onClick={() => onModeChange("line")}
        style={modeButtonStyle(ws)}
      >
        <LineIcon color={iconColor("line")} active={activeMode === "line"} />
      </button>
      <button
        type="button"
        aria-label="Candlestick chart"
        ref={trackButton(btnRefs, "candle")}
        onClick={() => onModeChange("candle")}
        style={modeButtonStyle(ws)}
      >
        <CandleIcon color={iconColor("candle")} />
      </button>
    </div>
  );
};

interface SeriesChipsProps {
  series: LivelineSeries[];
  hidden: Set<string>;
  onToggle: (id: string) => void;
  enabled: boolean;
  compact: boolean;
  ws: WindowStyle;
  colors: ChromeColors;
}

const SeriesChips = ({
  series,
  hidden,
  onToggle,
  enabled,
  compact,
  ws,
  colors,
}: SeriesChipsProps) => (
  <div
    style={{
      ...barStyle(ws, colors),
      opacity: enabled ? 1 : 0,
      pointerEvents: enabled ? "auto" : "none",
      transition: "opacity 0.4s",
    }}
  >
    {series.map((s, si) => {
      const isHidden = hidden.has(s.id);
      const seriesColor = s.color || SERIES_COLORS[si % SERIES_COLORS.length];
      return (
        <button
          key={s.id}
          type="button"
          onClick={() => onToggle(s.id)}
          style={chipStyle(ws, colors, isHidden, compact)}
        >
          <span style={chipDotStyle(seriesColor, isHidden, compact)} />
          {!compact && (s.label ?? s.id)}
        </button>
      );
    })}
  </div>
);

const controlRowStyle = (marginLeft: number): CSSProperties => ({
  alignItems: "center",
  display: "flex",
  gap: 6,
  marginBottom: 6,
  marginLeft,
});

const canvasStyle = (scrub: boolean, cursor: string): CSSProperties => ({
  cursor: scrub ? cursor : "default",
  display: "block",
});

// --- Component ---

export const Liveline = (props: LivelineProps) => {
  const {
    data,
    value,
    series: seriesProp,
    emptyText,
    minValue,
    maxValue,
    degen,
    windows,
    onWindowChange,
    orderbook,
    referenceLine,
    padding,
    onHover,
    candles,
    candleWidth,
    liveCandle,
    lineMode,
    lineData,
    lineValue,
    onModeChange,
    onSeriesToggle,
    lineWidth,
    className,
    style,
  } = props;
  const look = resolveAppearance(props);
  const behavior = resolveBehavior(props);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueDisplayRef = useRef<HTMLSpanElement>(null);

  const { hiddenSeries, toggleSeries } = useSeriesToggle(seriesProp, onSeriesToggle);
  const displaySeries = useStickySeries(seriesProp);
  const palette = usePalette(look.color, look.theme, lineWidth);
  const isMultiSeries = seriesProp !== undefined && seriesProp.length > 0;
  const multiSeries = useMultiSeries(seriesProp, look.theme);
  const { showMomentum, momentumOverride } = resolveMomentum(behavior.momentum);
  const single = resolveSingleSeriesFeatures(
    isMultiSeries,
    look,
    showMomentum,
    resolveDegen(degen),
  );
  const pad = resolvePadding(padding, look.badge, look.grid);
  const colors = CHROME[look.theme];

  const [activeWindowSecs, setActiveWindowSecs] = useState(
    initialWindowSecs(windows, behavior.windowSecs),
  );
  const effectiveWindowSecs = windows ? activeWindowSecs : behavior.windowSecs;
  const selectWindow = (secs: number) => {
    setActiveWindowSecs(secs);
    onWindowChange?.(secs);
  };

  useLivelineEngine(canvasRef, containerRef, {
    badgeTail: look.badgeTail,
    badgeVariant: look.badgeVariant,
    candleWidth,
    candles,
    data,
    degenOptions: single.degenOptions,
    emptyText,
    exaggerate: behavior.exaggerate,
    formatTime: look.formatTime,
    formatValue: look.formatValue,
    hiddenSeriesIds: hiddenSeries,
    isMultiSeries,
    lerpSpeed: look.lerpSpeed,
    lineData,
    lineMode,
    lineValue,
    liveCandle,
    loading: behavior.loading,
    maxValue,
    minValue,
    mode: behavior.mode,
    momentumOverride,
    multiSeries,
    onHover,
    orderbookData: orderbook,
    padding: pad,
    palette,
    paused: behavior.paused,
    referenceLine,
    scrub: behavior.scrub,
    showBadge: single.showBadge,
    showFill: single.showFill,
    showGrid: look.grid,
    showMomentum: single.showMomentum,
    showPulse: look.pulse,
    tooltipOutline: look.tooltipOutline,
    tooltipY: look.tooltipY,
    value,
    valueDisplayRef: behavior.showValue ? valueDisplayRef : undefined,
    valueMomentumColor: behavior.valueMomentumColor,
    windowSecs: effectiveWindowSecs,
  });

  const showWindows = windows !== undefined && windows.length > 0;
  const showSeriesToggle = (displaySeries?.length ?? 0) > 1;
  const showControls = showWindows || onModeChange !== undefined || showSeriesToggle;
  const ws = behavior.windowStyle;

  return (
    <>
      {behavior.showValue && (
        <ValueDisplay valueRef={valueDisplayRef} color={colors.valueText} paddingLeft={pad.left} />
      )}

      {showControls && (
        <div style={controlRowStyle(pad.left)}>
          {showWindows && windows && (
            <WindowBar
              windows={windows}
              activeSecs={activeWindowSecs}
              onSelect={selectWindow}
              ws={ws}
              colors={colors}
            />
          )}
          {onModeChange && (
            <ModeBar lineMode={lineMode} onModeChange={onModeChange} ws={ws} colors={colors} />
          )}
          {showSeriesToggle && displaySeries && (
            <SeriesChips
              series={displaySeries}
              hidden={hiddenSeries}
              onToggle={toggleSeries}
              enabled={isMultiSeries}
              compact={behavior.seriesToggleCompact}
              ws={ws}
              colors={colors}
            />
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className={className}
        style={{ height: "100%", position: "relative", width: "100%", ...style }}
      >
        <canvas ref={canvasRef} style={canvasStyle(behavior.scrub, look.cursor)} />
      </div>
    </>
  );
};
