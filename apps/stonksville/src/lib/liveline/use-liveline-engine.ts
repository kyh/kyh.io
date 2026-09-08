import { useEffect, useLayoutEffect, useRef } from "react";
import type {
  LivelinePoint,
  LivelinePalette,
  Momentum,
  ReferenceLine,
  HoverPoint,
  Padding,
  ChartLayout,
  OrderbookData,
  DegenOptions,
  BadgeVariant,
  CandlePoint,
} from "./types";
import { lerp } from "./math/lerp";
import { computeRange } from "./math/range";
import { detectMomentum } from "./math/momentum";
import { interpolateAtTime } from "./math/interpolate";
import { getDpr, applyDpr } from "./canvas/dpr";
import {
  drawFrame,
  drawCandleFrame,
  drawMultiFrame,
  FADE_EDGE_WIDTH,
  createShakeState,
} from "./draw";
import type { ArrowState, MultiSeriesEntry, ShakeState } from "./draw";
import { drawLoading } from "./draw/loading";
import { drawEmpty } from "./draw/empty";
import type { GridState } from "./draw/grid";
import type { TimeAxisState } from "./draw/time-axis";
import { createOrderbookState } from "./draw/orderbook";
import type { OrderbookState } from "./draw/orderbook";
import { createParticleState } from "./draw/particles";
import type { ParticleState } from "./draw/particles";
import {
  badgeSvgPath,
  badgePillOnly,
  BADGE_PAD_X,
  BADGE_PAD_Y,
  BADGE_TAIL_LEN,
  BADGE_TAIL_SPREAD,
  BADGE_LINE_H,
} from "./draw/badge";

interface SeriesInput {
  id: string;
  data: LivelinePoint[];
  value: number;
  palette: LivelinePalette;
  label?: string;
}

interface EngineConfig {
  data: LivelinePoint[];
  value: number;
  palette: LivelinePalette;
  windowSecs: number;
  lerpSpeed: number;
  showGrid: boolean;
  showBadge: boolean;
  showMomentum: boolean;
  momentumOverride?: Momentum;
  showFill: boolean;
  referenceLine?: ReferenceLine;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  padding: Required<Padding>;
  onHover?: (point: HoverPoint | null) => void;
  showPulse: boolean;
  scrub: boolean;
  exaggerate: boolean;
  minValue?: number;
  maxValue?: number;
  degenOptions?: DegenOptions;
  badgeTail: boolean;
  badgeVariant: BadgeVariant;
  tooltipY: number;
  tooltipOutline: boolean;
  valueMomentumColor: boolean;
  valueDisplayRef?: React.RefObject<HTMLSpanElement | null>;
  orderbookData?: OrderbookData;
  loading?: boolean;
  paused?: boolean;
  emptyText?: string;

  // Candlestick mode
  mode: "line" | "candle";
  candles?: CandlePoint[];
  candleWidth?: number;
  liveCandle?: CandlePoint;
  lineMode?: boolean;
  lineData?: LivelinePoint[];
  lineValue?: number;

  // Multi-series mode
  multiSeries?: SeriesInput[];
  isMultiSeries?: boolean;
  hiddenSeriesIds?: Set<string>;
}

interface BadgeEls {
  container: HTMLDivElement;
  svg: SVGSVGElement;
  path: SVGPathElement;
  text: HTMLSpanElement;
  displayW: number;
  targetW: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// --- Constants ---
const MAX_DELTA_MS = 50;
const SCRUB_LERP_SPEED = 0.12;
const BADGE_WIDTH_LERP = 0.15;
const BADGE_Y_LERP = 0.35;
const BADGE_Y_LERP_TRANSITIONING = 0.5;
const MOMENTUM_COLOR_LERP = 0.12;
const WINDOW_TRANSITION_MS = 750;
const WINDOW_BUFFER = 0.05;
const WINDOW_BUFFER_NO_BADGE = 0.015;
const VALUE_SNAP_THRESHOLD = 0.001;
const ADAPTIVE_SPEED_BOOST = 0.2;
const MOMENTUM_GREEN: [number, number, number] = [34, 197, 94];
const MOMENTUM_RED: [number, number, number] = [239, 68, 68];
// data → loading/empty (reverse)
const CHART_REVEAL_SPEED = 0.14;
// loading/empty → data — slower forward for choreography
const CHART_REVEAL_SPEED_FWD = 0.09;
const PAUSE_PROGRESS_SPEED = 0.12;
const PAUSE_CATCHUP_SPEED = 0.08;
const PAUSE_CATCHUP_SPEED_FAST = 0.22;
const LOADING_ALPHA_SPEED = 0.14;
const SERIES_TOGGLE_SPEED = 0.1;
const MOMENTUM_TEXT_COLOR: Record<Momentum, string> = { down: "#ef4444", flat: "", up: "#22c55e" };

// --- Candle-specific constants ---
const CANDLE_LERP_SPEED = 0.25;
const CANDLE_WIDTH_TRANS_MS = 300;
const LINE_MORPH_MS = 500;
// matches candle body speed
const CLOSE_LINE_LERP_SPEED = 0.25;
const LINE_DENSITY_MS = 350;
const LINE_LERP_BASE = 0.08;
const LINE_ADAPTIVE_BOOST = 0.2;
const LINE_SNAP_THRESHOLD = 0.001;
const RANGE_LERP_SPEED = 0.15;
const RANGE_ADAPTIVE_BOOST = 0.2;
const CANDLE_BUFFER_NO_BADGE = 0.015;

// --- State ---

interface WindowTransState {
  from: number;
  to: number;
  startMs: number;
  rangeFromMin: number;
  rangeFromMax: number;
  rangeToMin: number;
  rangeToMax: number;
}

interface ProgressTransition {
  from: number;
  to: number;
  startMs: number;
}

interface CandleWidthTransition {
  fromWidth: number;
  toWidth: number;
  startMs: number;
  oldCandles: CandlePoint[];
  oldWidth: number;
  rangeFromMin: number;
  rangeFromMax: number;
  rangeToMin: number;
  rangeToMax: number;
}

interface HoverSample {
  x: number;
  value: number;
  time: number;
}

interface HoverEntry {
  color: string;
  label: string;
  value: number;
}

interface PausedSeries {
  data: LivelinePoint[];
  value: number;
}

interface CandleState {
  displayCandle: CandlePoint | null;
  liveBirthAlpha: number;
  liveBull: number;
  lineSmoothClose: number;
  lineSmoothInited: boolean;
  // Smooth close for the dashed line — never resets on candle birth
  closeLineSmooth: number;
  closeLineSmoothInited: boolean;
  lineModeProg: number;
  lineModeTrans: ProgressTransition;
  lineDensityProg: number;
  lineDensityTrans: ProgressTransition;
  lineTickSmooth: number;
  lineTickSmoothInited: boolean;
  widthTrans: CandleWidthTransition;
  prevCandleData: { candles: CandlePoint[]; width: number };
  pausedCandles: CandlePoint[] | null;
  pausedLive: CandlePoint | null;
  pausedLineData: LivelinePoint[] | null;
  pausedLineValue: number | null;
  lastCandles: CandlePoint[];
  lastLive: CandlePoint | null;
  lastLineData: LivelinePoint[];
  lastLineValue: number | undefined;
}

interface EngineState {
  displayValue: number;
  displayValues: Map<string, number>;
  seriesAlpha: Map<string, number>;
  displayMin: number;
  displayMax: number;
  targetMin: number;
  targetMax: number;
  rangeInited: boolean;
  displayWindow: number;
  windowTransition: WindowTransState;
  arrowState: ArrowState;
  // labels: key=Math.round(val*1000), value=alpha
  gridState: GridState;
  timeAxisState: TimeAxisState;
  orderbookState: OrderbookState;
  particleState: ParticleState;
  shakeState: ShakeState;
  badgeColor: { green: number };
  // lerped badge Y, null = uninited
  badgeY: number | null;
  reducedMotion: boolean;
  size: { h: number; w: number };
  ctx: CanvasRenderingContext2D | null;
  raf: number;
  lastFrameMs: number;
  badge: BadgeEls | null;
  hoverX: number | null;
  // 0 = not scrubbing, 1 = fully scrubbing
  scrubAmount: number;
  lastHover: HoverSample | null;
  lastHoverEntries: HoverEntry[];
  // 0 = loading/empty, 1 = fully revealed
  chartReveal: number;
  // 0 = playing, 1 = fully paused
  pauseProgress: number;
  // accumulated seconds behind real time
  timeDebt: number;
  // Data stash for reverse morph (chart → flat line when data disappears)
  lastData: LivelinePoint[];
  lastMultiSeries: SeriesInput[];
  frozenNow: number;
  // Pause data snapshot — freeze visible data when pausing to prevent
  // consumer-side pruning from eroding the left edge of the line
  pausedData: LivelinePoint[] | null;
  pausedMultiData: Map<string, PausedSeries> | null;
  loadingAlpha: number;
  candle: CandleState;
}

const createCandleState = (candleWidth: number): CandleState => ({
  closeLineSmooth: 0,
  closeLineSmoothInited: false,
  displayCandle: null,
  lastCandles: [],
  lastLineData: [],
  lastLineValue: undefined,
  lastLive: null,
  lineDensityProg: 0,
  lineDensityTrans: { from: 0, startMs: 0, to: 0 },
  lineModeProg: 0,
  lineModeTrans: { from: 0, startMs: 0, to: 0 },
  lineSmoothClose: 0,
  lineSmoothInited: false,
  lineTickSmooth: 0,
  lineTickSmoothInited: false,
  liveBirthAlpha: 1,
  liveBull: 0.5,
  pausedCandles: null,
  pausedLineData: null,
  pausedLineValue: null,
  pausedLive: null,
  prevCandleData: { candles: [], width: candleWidth },
  widthTrans: {
    fromWidth: candleWidth,
    oldCandles: [],
    oldWidth: candleWidth,
    rangeFromMax: 0,
    rangeFromMin: 0,
    rangeToMax: 0,
    rangeToMin: 0,
    startMs: 0,
    toWidth: candleWidth,
  },
});

const createEngineState = (config: EngineConfig): EngineState => ({
  arrowState: { down: 0, up: 0 },
  badge: null,
  badgeColor: { green: 1 },
  badgeY: null,
  candle: createCandleState(config.candleWidth ?? 1),
  chartReveal: 0,
  ctx: null,
  displayMax: 0,
  displayMin: 0,
  displayValue: config.value,
  displayValues: new Map(),
  displayWindow: config.windowSecs,
  frozenNow: 0,
  gridState: { interval: 0, labels: new Map() },
  hoverX: null,
  lastData: [],
  lastFrameMs: 0,
  lastHover: null,
  lastHoverEntries: [],
  lastMultiSeries: [],
  loadingAlpha: config.loading ? 1 : 0,
  orderbookState: createOrderbookState(),
  particleState: createParticleState(),
  pauseProgress: 0,
  pausedData: null,
  pausedMultiData: null,
  raf: 0,
  rangeInited: false,
  reducedMotion: false,
  scrubAmount: 0,
  seriesAlpha: new Map(),
  shakeState: createShakeState(),
  size: { h: 0, w: 0 },
  targetMax: 0,
  targetMin: 0,
  timeAxisState: { labels: new Map() },
  timeDebt: 0,
  windowTransition: {
    from: config.windowSecs,
    rangeFromMax: 0,
    rangeFromMin: 0,
    rangeToMax: 0,
    rangeToMin: 0,
    startMs: 0,
    to: config.windowSecs,
  },
});

// --- Per-frame context ---

interface Frame {
  cfg: EngineConfig;
  ctx: CanvasRenderingContext2D;
  dt: number;
  w: number;
  h: number;
  pad: Required<Padding>;
  chartH: number;
  nowMs: number;
  noMotion: boolean;
}

interface FramePhase {
  hasData: boolean;
  chartReveal: number;
  revealTarget: number;
  loadingAlpha: number;
  pauseProgress: number;
  pausedDt: number;
  useStash: boolean;
  useMultiStash: boolean;
}

interface ValueRange {
  minVal: number;
  maxVal: number;
  valRange: number;
}

// --- Small shared helpers ---

const easeInOutCos = (t: number): number => (1 - Math.cos(t * Math.PI)) / 2;

const snapToUnit = (v: number, eps: number): number => {
  if (v < eps) {
    return 0;
  }
  if (v > 1 - eps) {
    return 1;
  }
  return v;
};

const liveNow = (state: EngineState): number => Date.now() / 1000 - state.timeDebt;

/** Refresh the frozen timestamp while data flows so a reverse morph can stop the clock. */
const resolveNow = (state: EngineState, hasData: boolean, useFrozen: boolean): number => {
  if (hasData) {
    state.frozenNow = liveNow(state);
  }
  return useFrozen ? state.frozenNow : liveNow(state);
};

const collectVisiblePoints = (
  points: LivelinePoint[],
  leftEdge: number,
  rightEdge: number,
): LivelinePoint[] => {
  const visible: LivelinePoint[] = [];
  for (const p of points) {
    if (p.time >= leftEdge - 2 && p.time <= rightEdge) {
      visible.push(p);
    }
  }
  return visible;
};

const collectVisibleCandles = (
  candles: CandlePoint[],
  width: number,
  leftEdge: number,
  rightEdge: number,
): CandlePoint[] => {
  const visible: CandlePoint[] = [];
  for (const c of candles) {
    if (c.time + width >= leftEdge && c.time <= rightEdge) {
      visible.push(c);
    }
  }
  return visible;
};

const rangeOf = (state: EngineState): ValueRange => ({
  maxVal: state.displayMax,
  minVal: state.displayMin,
  valRange: state.displayMax - state.displayMin || 0.001,
});

const makeLayout = (
  frame: Frame,
  chartW: number,
  leftEdge: number,
  rightEdge: number,
  range: ValueRange,
): ChartLayout => {
  const { w, h, pad, chartH } = frame;
  const { minVal, maxVal, valRange } = range;
  return {
    chartH,
    chartW,
    h,
    leftEdge,
    maxVal,
    minVal,
    pad,
    rightEdge,
    toX: (t: number) => pad.left + ((t - leftEdge) / (rightEdge - leftEdge)) * chartW,
    toY: (v: number) => pad.top + (1 - (v - minVal) / valRange) * chartH,
    valRange,
    w,
  };
};

const hideBadge = (state: EngineState) => {
  if (state.badge) {
    state.badge.container.style.display = "none";
  }
};

const scaleBadgeOpacity = (badge: BadgeEls, factor: number) => {
  if (badge.container.style.display === "none") {
    return;
  }
  const base = badge.container.style.opacity ? Number(badge.container.style.opacity) : 1;
  badge.container.style.opacity = String(base * factor);
};

/** Lerp display value with adaptive speed — slow for big jumps, fast for small ticks. */
const computeAdaptiveSpeed = (
  value: number,
  displayValue: number,
  displayMin: number,
  displayMax: number,
  lerpSpeed: number,
  noMotion: boolean,
): number => {
  const valGap = Math.abs(value - displayValue);
  const prevRange = displayMax - displayMin || 1;
  const gapRatio = Math.min(valGap / prevRange, 1);
  return noMotion ? 1 : lerpSpeed + (1 - gapRatio) * ADAPTIVE_SPEED_BOOST;
};

// --- Window transitions ---

const beginWindowTransition = (
  state: EngineState,
  targetWindowSecs: number,
  nowMs: number,
): WindowTransState => {
  const wt = state.windowTransition;
  wt.from = state.displayWindow;
  wt.to = targetWindowSecs;
  wt.startMs = nowMs;
  wt.rangeFromMin = state.displayMin;
  wt.rangeFromMax = state.displayMax;
  return wt;
};

interface WindowResult {
  windowSecs: number;
  windowTransProgress: number;
}

/** Log-space eased window size; snaps and clears the transition once complete. */
const advanceWindowTransition = (
  wt: WindowTransState,
  targetWindowSecs: number,
  nowMs: number,
  instant: boolean,
): WindowResult => {
  if (instant || wt.startMs === 0) {
    return { windowSecs: targetWindowSecs, windowTransProgress: 0 };
  }
  const t = Math.min((nowMs - wt.startMs) / WINDOW_TRANSITION_MS, 1);
  if (t >= 1) {
    wt.startMs = 0;
    return { windowSecs: targetWindowSecs, windowTransProgress: 0 };
  }
  const eased = easeInOutCos(t);
  const logFrom = Math.log(wt.from);
  const logTo = Math.log(wt.to);
  return {
    windowSecs: Math.exp(logFrom + (logTo - logFrom) * eased),
    windowTransProgress: eased,
  };
};

/** Line-mode window transition — seeds the target range from the points that will be visible. */
const updateWindowTransition = (
  state: EngineState,
  cfg: EngineConfig,
  noMotion: boolean,
  nowMs: number,
  now: number,
  points: LivelinePoint[],
  smoothValue: number,
  buffer: number,
): WindowResult => {
  const wt = state.windowTransition;
  if (wt.to !== cfg.windowSecs) {
    beginWindowTransition(state, cfg.windowSecs, nowMs);
    const targetRightEdge = now + cfg.windowSecs * buffer;
    const targetVisible = collectVisiblePoints(
      points,
      targetRightEdge - cfg.windowSecs,
      targetRightEdge,
    );
    if (targetVisible.length > 0) {
      const targetRange = computeRange(
        targetVisible,
        smoothValue,
        cfg.referenceLine?.value,
        cfg.exaggerate,
      );
      wt.rangeToMin = targetRange.min;
      wt.rangeToMax = targetRange.max;
    }
  }
  return advanceWindowTransition(wt, cfg.windowSecs, nowMs, noMotion);
};

// --- Range smoothing ---

/** Smooth Y range with lerp. During window transitions, interpolates between pre-computed ranges. */
const updateRange = (
  state: EngineState,
  computed: { min: number; max: number },
  isTransitioning: boolean,
  windowTransProgress: number,
  adaptiveSpeed: number,
  chartH: number,
  dt: number,
) => {
  const wt = state.windowTransition;
  state.targetMin = computed.min;
  state.targetMax = computed.max;
  if (!state.rangeInited) {
    state.rangeInited = true;
    state.displayMin = computed.min;
    state.displayMax = computed.max;
    return;
  }
  if (isTransitioning) {
    state.displayMin = wt.rangeFromMin + (wt.rangeToMin - wt.rangeFromMin) * windowTransProgress;
    state.displayMax = wt.rangeFromMax + (wt.rangeToMax - wt.rangeFromMax) * windowTransProgress;
    return;
  }
  const curRange = state.displayMax - state.displayMin;
  state.displayMin = lerp(state.displayMin, computed.min, adaptiveSpeed, dt);
  state.displayMax = lerp(state.displayMax, computed.max, adaptiveSpeed, dt);
  const pxThreshold = (0.5 * curRange) / chartH || 0.001;
  if (Math.abs(state.displayMin - computed.min) < pxThreshold) {
    state.displayMin = computed.min;
  }
  if (Math.abs(state.displayMax - computed.max) < pxThreshold) {
    state.displayMax = computed.max;
  }
};

// --- Hover ---

const updateScrubAmount = (state: EngineState, isActiveHover: boolean, noMotion: boolean) => {
  const scrubTarget = isActiveHover ? 1 : 0;
  if (noMotion) {
    state.scrubAmount = scrubTarget;
    return;
  }
  state.scrubAmount += (scrubTarget - state.scrubAmount) * SCRUB_LERP_SPEED;
  state.scrubAmount = snapToUnit(state.scrubAmount, 0.01);
};

interface LineHover {
  hoverX: number | null;
  hoverValue: number | null;
  hoverTime: number | null;
}

/** Compute hover position, interpolated value, and scrub amount. */
const updateHoverState = (
  state: EngineState,
  cfg: EngineConfig,
  layout: ChartLayout,
  now: number,
  visible: LivelinePoint[],
  noMotion: boolean,
): LineHover => {
  const { pad, w, chartW, leftEdge, rightEdge } = layout;
  const hoverPixelX = state.hoverX;
  let hover: LineHover = { hoverTime: null, hoverValue: null, hoverX: null };
  let isActiveHover = false;

  if (hoverPixelX !== null && hoverPixelX >= pad.left && hoverPixelX <= w - pad.right) {
    const clampedX = Math.min(hoverPixelX, layout.toX(now));
    const t = leftEdge + ((clampedX - pad.left) / chartW) * (rightEdge - leftEdge);
    const v = interpolateAtTime(visible, t);
    if (v !== null) {
      hover = { hoverTime: t, hoverValue: v, hoverX: clampedX };
      isActiveHover = true;
      state.lastHover = { time: t, value: v, x: clampedX };
      cfg.onHover?.({ time: t, value: v, x: clampedX, y: layout.toY(v) });
    }
  }

  updateScrubAmount(state, isActiveHover, noMotion);

  // Use last known position during fade-out
  if (!isActiveHover && state.scrubAmount > 0 && state.lastHover) {
    const { x, value, time } = state.lastHover;
    return { hoverTime: time, hoverValue: value, hoverX: x };
  }
  return hover;
};

// --- Badge ---

const momentumBadgeFill = (
  badgeColor: { green: number },
  momentum: Momentum,
  noMotion: boolean,
  dt: number,
): string => {
  let target = badgeColor.green;
  if (momentum === "up") {
    target = 1;
  } else if (momentum === "down") {
    target = 0;
  }
  badgeColor.green = noMotion ? target : lerp(badgeColor.green, target, MOMENTUM_COLOR_LERP, dt);
  badgeColor.green = snapToUnit(badgeColor.green, 0.01);
  const g = badgeColor.green;
  const rr = Math.round(MOMENTUM_RED[0] + (MOMENTUM_GREEN[0] - MOMENTUM_RED[0]) * g);
  const gg = Math.round(MOMENTUM_RED[1] + (MOMENTUM_GREEN[1] - MOMENTUM_RED[1]) * g);
  const bb = Math.round(MOMENTUM_RED[2] + (MOMENTUM_GREEN[2] - MOMENTUM_RED[2]) * g);
  return `rgb(${rr},${gg},${bb})`;
};

const applyBadgeStyle = (
  state: EngineState,
  badge: BadgeEls,
  cfg: EngineConfig,
  momentum: Momentum,
  noMotion: boolean,
  dt: number,
) => {
  if (cfg.badgeVariant === "minimal") {
    badge.path.setAttribute("fill", cfg.palette.badgeOuterBg);
    badge.text.style.color = cfg.palette.tooltipText;
    badge.container.style.filter = `drop-shadow(0 1px 4px ${cfg.palette.badgeOuterShadow})`;
    return;
  }
  badge.container.style.filter = "";
  badge.text.style.color = "#fff";
  const fill = cfg.showMomentum
    ? momentumBadgeFill(state.badgeColor, momentum, noMotion, dt)
    : cfg.palette.line;
  badge.path.setAttribute("fill", fill);
};

/** Smooth-lerp the badge width toward the measured width of the widest-digit template. */
const updateBadgeWidth = (
  badge: BadgeEls,
  ctx: CanvasRenderingContext2D,
  cfg: EngineConfig,
  text: string,
  dt: number,
): number => {
  ctx.font = cfg.palette.labelFont;
  const template = text.replaceAll(/\d/gu, "8");
  badge.targetW = ctx.measureText(template).width;
  if (badge.displayW === 0) {
    badge.displayW = badge.targetW;
  }
  badge.displayW = lerp(badge.displayW, badge.targetW, BADGE_WIDTH_LERP, dt);
  if (Math.abs(badge.displayW - badge.targetW) < 0.3) {
    badge.displayW = badge.targetW;
  }
  return badge.displayW;
};

interface BadgeArgs {
  smoothValue: number;
  layout: ChartLayout;
  momentum: Momentum;
  isWindowTransitioning: boolean;
  dt: number;
  chartReveal: number;
}

/** Update badge DOM element — text, width lerp, SVG path, position, color. */
const updateBadgeDOM = (state: EngineState, frame: Frame, badge: BadgeEls, args: BadgeArgs) => {
  const { cfg, ctx, noMotion } = frame;
  const { smoothValue, layout, momentum, isWindowTransitioning, dt, chartReveal } = args;
  if (!cfg.showBadge || chartReveal < 0.25) {
    badge.container.style.display = "none";
    return;
  }

  badge.container.style.display = "";
  const badgeOpacity = chartReveal < 0.5 ? (chartReveal - 0.25) / 0.25 : 1;
  badge.container.style.opacity = badgeOpacity < 1 ? String(badgeOpacity) : "";
  const { w, h, pad } = layout;

  const text = cfg.formatValue(smoothValue);
  badge.text.textContent = text;
  badge.text.style.font = cfg.palette.labelFont;
  badge.text.style.lineHeight = `${BADGE_LINE_H}px`;
  const tailLen = cfg.badgeTail ? BADGE_TAIL_LEN : 0;
  badge.text.style.padding = `${BADGE_PAD_Y}px ${BADGE_PAD_X}px ${BADGE_PAD_Y}px ${tailLen + BADGE_PAD_X}px`;

  const textW = updateBadgeWidth(badge, ctx, cfg, text, dt);
  const pillW = textW + BADGE_PAD_X * 2;
  const pillH = BADGE_LINE_H + BADGE_PAD_Y * 2;

  const totalW = tailLen + pillW;
  badge.svg.setAttribute("width", String(Math.ceil(totalW)));
  badge.svg.setAttribute("height", String(pillH));
  badge.svg.setAttribute("viewBox", `0 0 ${totalW} ${pillH}`);
  badge.path.setAttribute(
    "d",
    cfg.badgeTail
      ? badgeSvgPath(pillW, pillH, BADGE_TAIL_LEN, BADGE_TAIL_SPREAD)
      : badgePillOnly(pillW, pillH),
  );

  // Badge Y lerp — decoupled from range/value math, morphed during reveal
  const centerY = pad.top + layout.chartH / 2;
  const realTargetY = Math.max(pad.top, Math.min(h - pad.bottom, layout.toY(smoothValue)));
  const targetBadgeY =
    chartReveal < 1 ? centerY + (realTargetY - centerY) * chartReveal : realTargetY;
  if (state.badgeY === null || noMotion) {
    state.badgeY = targetBadgeY;
  } else {
    const badgeSpeed = isWindowTransitioning ? BADGE_Y_LERP_TRANSITIONING : BADGE_Y_LERP;
    state.badgeY = lerp(state.badgeY, targetBadgeY, badgeSpeed, dt);
  }

  const badgeLeft = w - pad.right + 8 - BADGE_PAD_X - tailLen;
  const badgeTop = state.badgeY - pillH / 2;
  badge.container.style.transform = `translate3d(${badgeLeft}px, ${badgeTop}px, 0)`;

  applyBadgeStyle(state, badge, cfg, momentum, noMotion, dt);
};

// --- Candle helpers ---

const computeCandleRange = (candles: CandlePoint[]) => {
  let min = Infinity;
  let max = -Infinity;
  for (const c of candles) {
    if (c.low < min) {
      min = c.low;
    }
    if (c.high > max) {
      max = c.high;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { max: 101, min: 99 };
  }
  const range = max - min;
  const margin = range * 0.12;
  const minRange = range * 0.1 || 0.4;
  if (range < minRange) {
    const mid = (min + max) / 2;
    return { max: mid + minRange / 2, min: mid - minRange / 2 };
  }
  return { max: max + margin, min: min - margin };
};

const candleAtX = (
  candles: CandlePoint[],
  hoverX: number,
  candleWidth: number,
  layout: ChartLayout,
): CandlePoint | null => {
  const time =
    layout.leftEdge +
    ((hoverX - layout.pad.left) / layout.chartW) * (layout.rightEdge - layout.leftEdge);
  let lo = 0;
  let hi = candles.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const c = candles[mid];
    if (time < c.time) {
      hi = mid - 1;
    } else if (time >= c.time + candleWidth) {
      lo = mid + 1;
    } else {
      return c;
    }
  }
  return null;
};

/** Smooth Y range for candle mode — adaptive speed, no target tracking. */
const updateCandleRange = (
  state: EngineState,
  computed: { min: number; max: number },
  isTransitioning: boolean,
  windowTransProgress: number,
  chartH: number,
  dt: number,
) => {
  const wt = state.windowTransition;
  if (!state.rangeInited) {
    state.rangeInited = true;
    state.displayMin = computed.min;
    state.displayMax = computed.max;
    return;
  }
  if (isTransitioning) {
    state.displayMin = wt.rangeFromMin + (wt.rangeToMin - wt.rangeFromMin) * windowTransProgress;
    state.displayMax = wt.rangeFromMax + (wt.rangeToMax - wt.rangeFromMax) * windowTransProgress;
    return;
  }
  const curRange = state.displayMax - state.displayMin || 1;
  const gapMin = Math.abs(state.displayMin - computed.min);
  const gapMax = Math.abs(state.displayMax - computed.max);
  const gapRatio = Math.min((gapMin + gapMax) / curRange, 1);
  const speed = RANGE_LERP_SPEED + (1 - gapRatio) * RANGE_ADAPTIVE_BOOST;

  state.displayMin = lerp(state.displayMin, computed.min, speed, dt);
  state.displayMax = lerp(state.displayMax, computed.max, speed, dt);
  const pxThreshold = (0.5 * curRange) / chartH || 0.001;
  if (Math.abs(state.displayMin - computed.min) < pxThreshold) {
    state.displayMin = computed.min;
  }
  if (Math.abs(state.displayMax - computed.max) < pxThreshold) {
    state.displayMax = computed.max;
  }
};

/** Candle window transition — seeds the target range from candle data instead of line points. */
const updateCandleWindowTransition = (
  state: EngineState,
  targetWindowSecs: number,
  nowMs: number,
  now: number,
  candles: CandlePoint[],
  liveCandle: CandlePoint | undefined,
  candleWidth: number,
  buffer: number,
): WindowResult => {
  const wt = state.windowTransition;
  if (wt.to !== targetWindowSecs) {
    beginWindowTransition(state, targetWindowSecs, nowMs);
    const targetRightEdge = now + targetWindowSecs * buffer;
    const targetLeftEdge = targetRightEdge - targetWindowSecs;
    const targetVisible = collectVisibleCandles(
      candles,
      candleWidth,
      targetLeftEdge,
      targetRightEdge,
    );
    if (
      liveCandle &&
      liveCandle.time + candleWidth >= targetLeftEdge &&
      liveCandle.time <= targetRightEdge
    ) {
      targetVisible.push(liveCandle);
    }
    if (targetVisible.length > 0) {
      const tr = computeCandleRange(targetVisible);
      wt.rangeToMin = tr.min;
      wt.rangeToMax = tr.max;
    }
  }
  return advanceWindowTransition(wt, targetWindowSecs, nowMs, false);
};

// --- Frame phase (pause, loading, reveal, stash) ---

const snapshotPausedCandles = (cs: CandleState, cfg: EngineConfig) => {
  if (cfg.paused && cs.pausedCandles === null && cfg.candles && cfg.candles.length > 0) {
    cs.pausedCandles = [...cfg.candles];
    cs.pausedLive = cfg.liveCandle ?? null;
    cs.pausedLineData = cfg.lineData ? [...cfg.lineData] : null;
    cs.pausedLineValue = cfg.lineValue ?? null;
  }
  if (!cfg.paused) {
    cs.pausedCandles = null;
    cs.pausedLive = null;
    cs.pausedLineData = null;
    cs.pausedLineValue = null;
  }
};

const snapshotPausedMulti = (state: EngineState, paused: boolean, series: SeriesInput[]) => {
  if (paused && state.pausedMultiData === null) {
    const snap = new Map<string, PausedSeries>();
    for (const s of series) {
      if (s.data.length >= 2) {
        snap.set(s.id, { data: [...s.data], value: s.value });
      }
    }
    if (snap.size > 0) {
      state.pausedMultiData = snap;
    }
  }
  if (!paused) {
    state.pausedMultiData = null;
  }
};

const snapshotPausedData = (state: EngineState, cfg: EngineConfig, isCandle: boolean) => {
  if (isCandle) {
    snapshotPausedCandles(state.candle, cfg);
    return;
  }
  if (cfg.isMultiSeries && cfg.multiSeries) {
    snapshotPausedMulti(state, cfg.paused ?? false, cfg.multiSeries);
    return;
  }
  if (cfg.paused && state.pausedData === null && cfg.data.length >= 2) {
    state.pausedData = [...cfg.data];
  }
  if (!cfg.paused) {
    state.pausedData = null;
  }
};

interface PauseTiming {
  pauseProgress: number;
  pausedDt: number;
}

const updatePauseTiming = (
  state: EngineState,
  paused: boolean | undefined,
  dt: number,
  noMotion: boolean,
): PauseTiming => {
  const pauseTarget = paused ? 1 : 0;
  state.pauseProgress = noMotion
    ? pauseTarget
    : lerp(state.pauseProgress, pauseTarget, PAUSE_PROGRESS_SPEED, dt);
  state.pauseProgress = snapToUnit(state.pauseProgress, 0.005);
  const { pauseProgress } = state;

  state.timeDebt += (dt / 1000) * pauseProgress;
  // Only drain time debt when unpausing — during pausing, let it
  // accumulate freely so the chart decelerates smoothly
  if (!paused && state.timeDebt > 0.001) {
    const catchUpSpeed = state.timeDebt > 10 ? PAUSE_CATCHUP_SPEED_FAST : PAUSE_CATCHUP_SPEED;
    state.timeDebt = lerp(state.timeDebt, 0, catchUpSpeed, dt);
    if (state.timeDebt < 0.01) {
      state.timeDebt = 0;
    }
  }
  return { pauseProgress, pausedDt: dt * (1 - pauseProgress) };
};

const updateLoadingAlpha = (
  state: EngineState,
  loading: boolean | undefined,
  dt: number,
  noMotion: boolean,
): number => {
  const target = loading ? 1 : 0;
  state.loadingAlpha = noMotion
    ? target
    : lerp(state.loadingAlpha, target, LOADING_ALPHA_SPEED, dt);
  state.loadingAlpha = snapToUnit(state.loadingAlpha, 0.01);
  return state.loadingAlpha;
};

const updateChartReveal = (
  state: EngineState,
  revealTarget: number,
  dt: number,
  noMotion: boolean,
): number => {
  const speed = revealTarget === 1 ? CHART_REVEAL_SPEED_FWD : CHART_REVEAL_SPEED;
  state.chartReveal = noMotion ? revealTarget : lerp(state.chartReveal, revealTarget, speed, dt);
  if (Math.abs(state.chartReveal - revealTarget) < 0.005) {
    state.chartReveal = revealTarget;
  }
  // Reset range when reveal fully collapses — guarantees a fresh snap
  // (not a slow lerp from stale values) when data reappears.
  if (state.chartReveal < 0.01) {
    state.rangeInited = false;
  }
  return state.chartReveal;
};

interface StashUse {
  useStash: boolean;
  useMultiStash: boolean;
}

/** Keep drawing the last data while the chart morphs back to the loading/empty squiggle. */
const updateStash = (
  state: EngineState,
  cfg: EngineConfig,
  isCandle: boolean,
  hasData: boolean,
  hasMultiData: boolean,
  chartReveal: number,
  points: LivelinePoint[],
): StashUse => {
  const morphingBack = !hasData && chartReveal > 0.005;
  if (isCandle) {
    // Candle stash is updated inside the candle pipeline after computing visible
    return { useMultiStash: false, useStash: morphingBack && state.candle.lastCandles.length > 0 };
  }
  const useMultiStash = morphingBack && state.lastMultiSeries.length > 0;
  if (hasMultiData && cfg.multiSeries) {
    state.lastMultiSeries = cfg.multiSeries.map((s) => ({
      data: [...s.data],
      id: s.id,
      label: s.label,
      palette: s.palette,
      value: s.value,
    }));
  }
  if (hasData && !cfg.isMultiSeries) {
    state.lastMultiSeries = [];
    state.lastData = points;
  }
  const useStash = !useMultiStash && morphingBack && state.lastData.length >= 2;
  return { useMultiStash, useStash };
};

/**
 * Advance lineModeProg even when there is no data, so toggling lineMode while
 * loading or empty doesn't freeze the transition and flash an accent-colored
 * line when data arrives.
 */
const updateLineModeProg = (cs: CandleState, lineMode: boolean | undefined, nowMs: number) => {
  const lmt = cs.lineModeTrans;
  const target = lineMode ? 1 : 0;
  if (lmt.to !== target) {
    lmt.from = cs.lineModeProg;
    lmt.to = target;
    lmt.startMs = nowMs;
  }
  if (lmt.startMs === 0) {
    cs.lineModeProg = lmt.to;
    return;
  }
  const t = Math.min((nowMs - lmt.startMs) / LINE_MORPH_MS, 1);
  cs.lineModeProg = lmt.from + (lmt.to - lmt.from) * easeInOutCos(t);
  if (t >= 1) {
    cs.lineModeProg = lmt.to;
    lmt.startMs = 0;
  }
};

interface FrameData {
  isCandle: boolean;
  points: LivelinePoint[];
  candles: CandlePoint[];
  hasData: boolean;
  hasMultiData: boolean;
}

const resolveFrameData = (state: EngineState, cfg: EngineConfig): FrameData => {
  const isCandle = cfg.mode === "candle";
  snapshotPausedData(state, cfg, isCandle);
  const points: LivelinePoint[] = isCandle ? [] : (state.pausedData ?? cfg.data);
  const candles: CandlePoint[] = isCandle ? (state.candle.pausedCandles ?? cfg.candles ?? []) : [];
  const hasMultiData =
    cfg.isMultiSeries && cfg.multiSeries ? cfg.multiSeries.some((s) => s.data.length >= 2) : false;
  const hasData = isCandle ? candles.length >= 2 : hasMultiData || points.length >= 2;
  return { candles, hasData, hasMultiData, isCandle, points };
};

const computePhase = (state: EngineState, frame: Frame, data: FrameData): FramePhase => {
  const { cfg, dt, noMotion, nowMs } = frame;
  const { isCandle, hasData, hasMultiData, points } = data;
  const { pauseProgress, pausedDt } = updatePauseTiming(state, cfg.paused, dt, noMotion);
  const loadingAlpha = updateLoadingAlpha(state, cfg.loading, dt, noMotion);
  const revealTarget = !cfg.loading && hasData ? 1 : 0;
  const chartReveal = updateChartReveal(state, revealTarget, dt, noMotion);
  const { useStash, useMultiStash } = updateStash(
    state,
    cfg,
    isCandle,
    hasData,
    hasMultiData,
    chartReveal,
    points,
  );
  if (isCandle) {
    updateLineModeProg(state.candle, cfg.lineMode, nowMs);
  }
  return {
    chartReveal,
    hasData,
    loadingAlpha,
    pauseProgress,
    pausedDt,
    revealTarget,
    useMultiStash,
    useStash,
  };
};

// --- Shared drawing ---

const drawNoData = (state: EngineState, frame: Frame, loadingAlpha: number, grey: boolean) => {
  const { ctx, w, h, pad, cfg, nowMs } = frame;
  // Grey loading line where there is no single accent color (candles, multi-series)
  const loadingColor = grey ? cfg.palette.gridLabel : undefined;
  if (loadingAlpha > 0.01) {
    drawLoading(ctx, w, h, pad, cfg.palette, nowMs, loadingAlpha, loadingColor);
  }
  if (1 - loadingAlpha > 0.01) {
    drawEmpty(ctx, w, h, pad, cfg.palette, 1 - loadingAlpha, nowMs, false, cfg.emptyText);
  }
  // Left-edge fade
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const fadeGrad = ctx.createLinearGradient(pad.left, 0, pad.left + FADE_EDGE_WIDTH, 0);
  fadeGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
  fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, 0, pad.left + FADE_EDGE_WIDTH, h);
  ctx.restore();
  hideBadge(state);
};

/**
 * During the reverse morph (chart → empty), overlay the gradient gap + text on
 * top of the morphing chart line; skipLine avoids double-drawing the squiggle.
 */
const drawRevealOverlay = (frame: Frame, phase: FramePhase) => {
  const { ctx, w, h, pad, cfg, nowMs } = frame;
  const bgAlpha = 1 - phase.chartReveal;
  if (bgAlpha > 0.01 && phase.revealTarget === 0 && !cfg.loading) {
    const bgEmptyAlpha = (1 - phase.loadingAlpha) * bgAlpha;
    if (bgEmptyAlpha > 0.01) {
      drawEmpty(ctx, w, h, pad, cfg.palette, bgEmptyAlpha, nowMs, true, cfg.emptyText);
    }
  }
};

// ═══════════════════════════════════════════════════════
// CANDLE MODE PIPELINE
// ═══════════════════════════════════════════════════════

interface CandleLineData {
  lineData: LivelinePoint[] | undefined;
  lineValue: number | undefined;
}

/** Tick data for the line morph, stashed so the reverse morph keeps tick resolution. */
const resolveCandleLineData = (
  cs: CandleState,
  cfg: EngineConfig,
  hasData: boolean,
  useStash: boolean,
): CandleLineData => {
  const lineData = cs.pausedLineData ?? cfg.lineData;
  const lineValue = cs.pausedLineValue ?? cfg.lineValue;
  if (hasData && lineData && lineData.length > 0) {
    cs.lastLineData = lineData;
    cs.lastLineValue = lineValue;
  }
  if (useStash && cs.lastLineData.length > 0) {
    return { lineData: cs.lastLineData, lineValue: cs.lastLineValue };
  }
  return { lineData, lineValue };
};

interface WidthMorph {
  morphT: number;
  displayCandleWidth: number;
}

const updateCandleWidthMorph = (
  state: EngineState,
  cfg: EngineConfig,
  nowMs: number,
  now: number,
  candles: CandlePoint[],
  rawLive: CandlePoint | undefined,
  candleWidthSecs: number,
  buffer: number,
): WidthMorph => {
  const cs = state.candle;
  const cwt = cs.widthTrans;
  let morphT = -1;
  let displayCandleWidth = cwt.toWidth;
  if (cwt.startMs > 0) {
    const t = Math.min((nowMs - cwt.startMs) / CANDLE_WIDTH_TRANS_MS, 1);
    morphT = easeInOutCos(t);
    displayCandleWidth = Math.exp(
      Math.log(cwt.fromWidth) + (Math.log(cwt.toWidth) - Math.log(cwt.fromWidth)) * morphT,
    );
    if (t >= 1) {
      displayCandleWidth = cwt.toWidth;
      cwt.startMs = 0;
      morphT = -1;
    }
  }
  if (candleWidthSecs !== cwt.toWidth) {
    cwt.oldCandles = cs.prevCandleData.candles;
    cwt.oldWidth = cs.prevCandleData.width;
    cwt.fromWidth = displayCandleWidth;
    cwt.toWidth = candleWidthSecs;
    cwt.startMs = nowMs;
    morphT = 0;
    cwt.rangeFromMin = state.displayMin;
    cwt.rangeFromMax = state.displayMax;
    const re = now + state.displayWindow * buffer;
    const targetVis = collectVisibleCandles(candles, candleWidthSecs, re - state.displayWindow, re);
    if (rawLive) {
      targetVis.push(rawLive);
    }
    if (targetVis.length > 0) {
      const tr = computeCandleRange(targetVis);
      cwt.rangeToMin = tr.min;
      cwt.rangeToMax = tr.max;
    } else {
      cwt.rangeToMin = state.displayMin;
      cwt.rangeToMax = state.displayMax;
    }
  }
  cs.prevCandleData = { candles: cfg.candles ?? [], width: candleWidthSecs };
  return { displayCandleWidth, morphT };
};

const updateLineDensity = (cs: CandleState, target: number, nowMs: number): number => {
  const ldt = cs.lineDensityTrans;
  if (ldt.to !== target) {
    ldt.from = cs.lineDensityProg;
    ldt.to = target;
    ldt.startMs = nowMs;
  }
  let prog = ldt.to;
  if (ldt.startMs > 0) {
    const t = Math.min((nowMs - ldt.startMs) / LINE_DENSITY_MS, 1);
    prog = ldt.from + (ldt.to - ldt.from) * (1 - (1 - t) * (1 - t));
    if (t >= 1) {
      prog = ldt.to;
      ldt.startMs = 0;
    }
  }
  cs.lineDensityProg = prog;
  return prog;
};

/** Lerp the live candle's OHLC toward the raw values; a new candle is born from its open. */
const updateLiveCandle = (
  cs: CandleState,
  rawLive: CandlePoint | undefined,
  pausedDt: number,
): CandlePoint | undefined => {
  if (!rawLive) {
    cs.displayCandle = null;
    cs.liveBirthAlpha = 1;
    cs.liveBull = 0.5;
    return undefined;
  }
  let dc = cs.displayCandle;
  if (!dc || dc.time !== rawLive.time) {
    dc = {
      close: rawLive.open,
      high: rawLive.open,
      low: rawLive.open,
      open: rawLive.open,
      time: rawLive.time,
    };
    cs.displayCandle = dc;
    cs.liveBirthAlpha = 0;
  } else {
    dc.open = lerp(dc.open, rawLive.open, CANDLE_LERP_SPEED, pausedDt);
    dc.high = lerp(dc.high, rawLive.high, CANDLE_LERP_SPEED, pausedDt);
    dc.low = lerp(dc.low, rawLive.low, CANDLE_LERP_SPEED, pausedDt);
    dc.close = lerp(dc.close, rawLive.close, CANDLE_LERP_SPEED, pausedDt);
  }
  cs.liveBirthAlpha = lerp(cs.liveBirthAlpha, 1, 0.2, pausedDt);
  if (cs.liveBirthAlpha > 0.99) {
    cs.liveBirthAlpha = 1;
  }
  const bullTarget = dc.close >= dc.open ? 1 : 0;
  cs.liveBull = snapToUnit(lerp(cs.liveBull, bullTarget, 0.12, pausedDt), 0.01);
  return dc;
};

/** Adaptive lerp — slow for big jumps, fast for small ticks — with a snap when close. */
const smoothToward = (current: number, target: number, range: number, pausedDt: number): number => {
  const valGap = Math.abs(target - current);
  const gapRatio = Math.min(valGap / range, 1);
  const speed = LINE_LERP_BASE + (1 - gapRatio) * LINE_ADAPTIVE_BOOST;
  const next = lerp(current, target, speed, pausedDt);
  return valGap < range * LINE_SNAP_THRESHOLD ? target : next;
};

/** Smooth close for the dashed price line; tracks at candle-body speed, survives candle birth. */
const updateCloseLineSmooth = (
  state: EngineState,
  rawLive: CandlePoint | undefined,
  useStash: boolean,
  pausedDt: number,
) => {
  const cs = state.candle;
  if (!rawLive) {
    if (!useStash) {
      cs.closeLineSmoothInited = false;
    }
    return;
  }
  if (!cs.closeLineSmoothInited) {
    cs.closeLineSmooth = rawLive.close;
    cs.closeLineSmoothInited = true;
    return;
  }
  cs.closeLineSmooth = lerp(cs.closeLineSmooth, rawLive.close, CLOSE_LINE_LERP_SPEED, pausedDt);
  const gap = Math.abs(cs.closeLineSmooth - rawLive.close);
  const range = state.displayMax - state.displayMin || 1;
  if (gap < range * 0.0005) {
    cs.closeLineSmooth = rawLive.close;
  }
};

/** Smooth close for line mode; frozen (not reset) during the reverse morph. */
const updateLineSmoothClose = (
  state: EngineState,
  rawLive: CandlePoint | undefined,
  useStash: boolean,
  pausedDt: number,
) => {
  const cs = state.candle;
  if (!rawLive) {
    if (!useStash) {
      cs.lineSmoothInited = false;
    }
    return;
  }
  if (!cs.lineSmoothInited) {
    cs.lineSmoothClose = rawLive.close;
    cs.lineSmoothInited = true;
    return;
  }
  const range = state.displayMax - state.displayMin || 1;
  cs.lineSmoothClose = smoothToward(cs.lineSmoothClose, rawLive.close, range, pausedDt);
};

const updateLineTickSmooth = (
  state: EngineState,
  lineValue: number | undefined,
  hasTickData: boolean,
  useStash: boolean,
  pausedDt: number,
) => {
  const cs = state.candle;
  if (lineValue === undefined || !hasTickData) {
    if (!useStash) {
      cs.lineTickSmoothInited = false;
    }
    return;
  }
  if (!cs.lineTickSmoothInited) {
    cs.lineTickSmooth = lineValue;
    cs.lineTickSmoothInited = true;
    return;
  }
  const range = state.displayMax - state.displayMin || 1;
  cs.lineTickSmooth = smoothToward(cs.lineTickSmooth, lineValue, range, pausedDt);
};

/**
 * Always use the full OHLC range regardless of line mode progress: the close-only
 * and tick-level ranges are tighter (no wicks), so blending between them during
 * morphs shifts the Y axis and causes grid label drift + line position jumps.
 */
const updateCandleFrameRange = (
  state: EngineState,
  visible: CandlePoint[],
  isTransitioning: boolean,
  windowTransProgress: number,
  morphT: number,
  chartH: number,
  dt: number,
): ValueRange => {
  const computed =
    visible.length > 0
      ? computeCandleRange(visible)
      : { max: state.displayMax, min: state.displayMin };
  updateCandleRange(state, computed, isTransitioning, windowTransProgress, chartH, dt);
  if (morphT >= 0) {
    const cwt = state.candle.widthTrans;
    state.displayMin = cwt.rangeFromMin + (cwt.rangeToMin - cwt.rangeFromMin) * morphT;
    state.displayMax = cwt.rangeFromMax + (cwt.rangeToMax - cwt.rangeFromMax) * morphT;
  }
  return rangeOf(state);
};

interface CandleHover {
  x: number | null;
  time: number;
  candle: CandlePoint | null;
}

const updateCandleHover = (
  state: EngineState,
  candles: CandlePoint[],
  candleWidth: number,
  layout: ChartLayout,
  dt: number,
): CandleHover => {
  const hoverPx = state.hoverX;
  const { pad, w, chartW } = layout;
  let hovered: CandlePoint | null = null;
  if (hoverPx !== null && hoverPx >= pad.left && hoverPx <= w - pad.right) {
    hovered = candleAtX(candles, hoverPx, candleWidth, layout);
  }
  const isActiveHover = hovered !== null;
  state.scrubAmount = lerp(state.scrubAmount, isActiveHover ? 1 : 0, 0.12, dt);
  state.scrubAmount = snapToUnit(state.scrubAmount, 0.01);

  if (!isActiveHover && state.scrubAmount > 0 && state.lastHover) {
    const { x, time } = state.lastHover;
    return { candle: candleAtX(candles, x, candleWidth, layout), time, x };
  }
  if (hovered !== null && hoverPx !== null) {
    const time =
      layout.leftEdge + ((hoverPx - pad.left) / chartW) * (layout.rightEdge - layout.leftEdge);
    state.lastHover = { time, value: hovered.close, x: hoverPx };
    return { candle: hovered, time, x: hoverPx };
  }
  return { candle: hovered, time: 0, x: hoverPx };
};

interface CandleSet {
  candles: CandlePoint[];
  oldCandles: CandlePoint[];
  live: CandlePoint | undefined;
}

/** Blend the live close toward the smooth close, then collapse OHLC onto close mid-morph. */
const applyLineModeMorph = (cs: CandleState, set: CandleSet, lineModeProg: number): CandleSet => {
  let { candles, oldCandles, live } = set;
  if (lineModeProg > 0.01 && live && cs.lineSmoothInited) {
    const blended = live.close + (cs.lineSmoothClose - live.close) * lineModeProg;
    live = { ...live, close: blended };
    const li = candles.length - 1;
    if (li >= 0 && candles[li].time === live.time) {
      candles = [...candles];
      candles[li] = { ...candles[li], close: blended };
    }
  }
  if (lineModeProg > 0.01 && lineModeProg < 0.99) {
    const inv = 1 - lineModeProg;
    const collapseOHLC = (c: CandlePoint): CandlePoint => ({
      close: c.close,
      high: c.close + (c.high - c.close) * inv,
      low: c.close + (c.low - c.close) * inv,
      open: c.close + (c.open - c.close) * inv,
      time: c.time,
    });
    candles = candles.map(collapseOHLC);
    if (oldCandles.length > 0) {
      oldCandles = oldCandles.map(collapseOHLC);
    }
    if (live) {
      live = collapseOHLC(live);
    }
  }
  return { candles, live, oldCandles };
};

interface CloseRef {
  t: number;
  v: number;
}

const closeRefAt = (refs: CloseRef[], refIdx: number, time: number, fallback: number): number => {
  const last = refs.at(-1);
  if (last === undefined) {
    return fallback;
  }
  if (refs.length === 1 || time <= refs[0].t) {
    return refs[0].v;
  }
  if (refIdx >= refs.length - 1) {
    return last.v;
  }
  const a = refs[refIdx];
  const b = refs[refIdx + 1];
  const span = b.t - a.t;
  const frac = span > 0 ? Math.max(0, Math.min(1, (time - a.t) / span)) : 0;
  return a.v + (b.v - a.v) * frac;
};

interface MorphLine {
  lineVisible: LivelinePoint[];
  lineSmoothValue: number;
}

interface DenseLineArgs {
  lineData: LivelinePoint[];
  lastTick: LivelinePoint;
  lineValue: number | undefined;
  set: CandleSet;
  displayCandleWidth: number;
  now: number;
  leftEdge: number;
  rightEdge: number;
  lineDensityProg: number;
}

/** Tick-resolution line: blend candle-close values toward tick values by density progress. */
const buildDenseLine = (cs: CandleState, args: DenseLineArgs): MorphLine => {
  const { lineData, lastTick, lineValue, set, displayCandleWidth, now, lineDensityProg } = args;
  const closeRefs: CloseRef[] = set.candles.map((c) => ({
    t: c.time + displayCandleWidth / 2,
    v: c.close,
  }));
  if (set.live) {
    closeRefs.push({ t: now, v: set.live.close });
  }

  const lineVisible: LivelinePoint[] = [];
  let refIdx = 0;
  for (const pt of lineData) {
    if (pt.time < args.leftEdge || pt.time > args.rightEdge) {
      continue;
    }
    while (refIdx < closeRefs.length - 2 && closeRefs[refIdx + 1].t < pt.time) {
      refIdx += 1;
    }
    const interpClose = closeRefAt(closeRefs, refIdx, pt.time, pt.value);
    lineVisible.push({
      time: pt.time,
      value: interpClose + (pt.value - interpClose) * lineDensityProg,
    });
  }

  let smoothTick = cs.lineTickSmooth;
  if (!cs.lineTickSmoothInited) {
    smoothTick = lineValue ?? lastTick.value;
  }
  // No explicit live tip — drawLine appends one at toX(now) using lineSmoothValue
  return {
    lineSmoothValue: cs.lineSmoothClose + (smoothTick - cs.lineSmoothClose) * lineDensityProg,
    lineVisible,
  };
};

/** Candle-close resolution — no live tip; drawLine appends one at toX(now). */
const buildSparseLine = (
  cs: CandleState,
  set: CandleSet,
  displayCandleWidth: number,
): MorphLine => {
  const lineVisible = set.candles.map((c) => ({
    time: c.time + displayCandleWidth / 2,
    value: c.close,
  }));
  let lineSmoothValue = cs.lineSmoothClose;
  if (!cs.lineSmoothInited) {
    lineSmoothValue = set.live?.close ?? set.candles.at(-1)?.close ?? 0;
  }
  return { lineSmoothValue, lineVisible };
};

/**
 * Pad the line to span the full chart width during the reveal morph. Without
 * this, data that doesn't fill the window creates a partial-width line that
 * pops when it hands off to the full-width loading squiggle.
 */
const padLineToWindow = (
  lineVisible: LivelinePoint[],
  leftEdge: number,
  rightEdge: number,
): LivelinePoint[] => {
  if (lineVisible.length < 2) {
    return lineVisible;
  }
  const [first] = lineVisible;
  const windowSpan = rightEdge - leftEdge;
  if (first.time - leftEdge <= windowSpan * 0.05) {
    return lineVisible;
  }
  const step = windowSpan / 32;
  const padded: LivelinePoint[] = [];
  for (let t = leftEdge; t < first.time - step * 0.5; t += step) {
    padded.push({ time: t, value: first.value });
  }
  return [...padded, ...lineVisible];
};

interface CandleBadgeArgs {
  lineModeProg: number;
  lineVisible: LivelinePoint[];
  lineSmoothValue: number;
  layout: ChartLayout;
  isWindowTransitioning: boolean;
  phase: FramePhase;
}

/** Badge in candle mode — only while in line mode, fading with lineModeProg (0.5→1 maps to 0→1). */
const updateCandleBadge = (state: EngineState, frame: Frame, args: CandleBadgeArgs) => {
  const { badge } = state;
  if (!badge) {
    return;
  }
  const { lineModeProg, phase } = args;
  if (lineModeProg <= 0.5 || !frame.cfg.showBadge) {
    badge.container.style.display = "none";
    return;
  }
  updateBadgeDOM(state, frame, badge, {
    chartReveal: phase.chartReveal,
    dt: phase.pausedDt,
    isWindowTransitioning: args.isWindowTransitioning,
    layout: args.layout,
    momentum: detectMomentum(args.lineVisible),
    smoothValue: args.lineSmoothValue,
  });
  const badgeFade = (lineModeProg - 0.5) * 2;
  scaleBadgeOpacity(badge, badgeFade * (1 - phase.pauseProgress));
};

interface CandleTiming {
  now: number;
  rawLive: CandlePoint | undefined;
  line: CandleLineData;
  hasTickData: boolean;
  candleWidthSecs: number;
  morph: WidthMorph;
  lineDensityProg: number;
  window: WindowResult;
  isWindowTransitioning: boolean;
  leftEdge: number;
  rightEdge: number;
}

/** Advance every candle-mode transition for this frame and derive the window edges. */
const advanceCandleTiming = (
  state: EngineState,
  frame: Frame,
  phase: FramePhase,
  candles: CandlePoint[],
): CandleTiming => {
  const { cfg, nowMs } = frame;
  const { hasData, useStash, chartReveal } = phase;
  const cs = state.candle;
  // Badge is never visible in pure candle mode (only during line morph),
  // so always use the smaller buffer to avoid dead space on the right.
  const buffer = CANDLE_BUFFER_NO_BADGE;
  // Frozen now — prevent candles from scrolling during reverse morph
  const now = resolveNow(state, hasData, !hasData && chartReveal >= 0.005);
  const rawLive = cs.pausedCandles ? (cs.pausedLive ?? undefined) : cfg.liveCandle;
  const line = resolveCandleLineData(cs, cfg, hasData, useStash);
  const hasTickData = line.lineData !== undefined && line.lineData.length > 0;
  const candleWidthSecs = cfg.candleWidth ?? 1;
  const morph = updateCandleWidthMorph(
    state,
    cfg,
    nowMs,
    now,
    candles,
    rawLive,
    candleWidthSecs,
    buffer,
  );
  const densityTarget = cfg.lineMode && cs.lineModeProg >= 0.3 && hasTickData ? 1 : 0;
  const lineDensityProg = updateLineDensity(cs, densityTarget, nowMs);
  const window = updateCandleWindowTransition(
    state,
    cfg.windowSecs,
    nowMs,
    now,
    candles,
    rawLive,
    candleWidthSecs,
    buffer,
  );
  state.displayWindow = window.windowSecs;
  const rightEdge = now + window.windowSecs * buffer;
  return {
    candleWidthSecs,
    hasTickData,
    isWindowTransitioning: state.windowTransition.startMs > 0,
    leftEdge: rightEdge - window.windowSecs,
    line,
    lineDensityProg,
    morph,
    now,
    rawLive,
    rightEdge,
    window,
  };
};

/** Visible candles this frame, stashed for the reverse morph while data flows. */
const collectCandleSet = (
  state: EngineState,
  timing: CandleTiming,
  candles: CandlePoint[],
  smoothLive: CandlePoint | undefined,
  phase: FramePhase,
): CandleSet => {
  const cs = state.candle;
  const { leftEdge, rightEdge, candleWidthSecs, morph } = timing;
  const visible = collectVisibleCandles(candles, candleWidthSecs, leftEdge, rightEdge);
  if (
    smoothLive &&
    smoothLive.time + morph.displayCandleWidth >= leftEdge &&
    smoothLive.time <= rightEdge
  ) {
    visible.push(smoothLive);
  }
  const oldCandles =
    morph.morphT >= 0
      ? collectVisibleCandles(cs.widthTrans.oldCandles, cs.widthTrans.oldWidth, leftEdge, rightEdge)
      : [];
  if (phase.hasData) {
    cs.lastCandles = visible;
    cs.lastLive = smoothLive ?? null;
  }
  if (phase.useStash) {
    return { candles: cs.lastCandles, live: cs.lastLive ?? undefined, oldCandles };
  }
  return { candles: visible, live: smoothLive, oldCandles };
};

/**
 * Use tick-level resolution whenever the line is visible (lineModeProg > 0.05),
 * not just when lineDensityProg > 0.01. The density transition finishes 150ms
 * before the line fades out; without this, the line abruptly drops from ~300
 * smooth points to ~5 stepped candle-close points while still ~30% visible.
 */
const buildMorphLine = (
  state: EngineState,
  timing: CandleTiming,
  set: CandleSet,
  chartReveal: number,
): MorphLine => {
  const cs = state.candle;
  const { lineData, lineValue } = timing.line;
  const lastTick = lineData?.at(-1);
  const dense =
    lineData !== undefined &&
    lastTick !== undefined &&
    (timing.lineDensityProg > 0.01 || cs.lineModeProg > 0.05);
  const line = dense
    ? buildDenseLine(cs, {
        displayCandleWidth: timing.morph.displayCandleWidth,
        lastTick,
        leftEdge: timing.leftEdge,
        lineData,
        lineDensityProg: timing.lineDensityProg,
        lineValue,
        now: timing.now,
        rightEdge: timing.rightEdge,
        set,
      })
    : buildSparseLine(cs, set, timing.morph.displayCandleWidth);
  if (chartReveal < 1) {
    return {
      lineSmoothValue: line.lineSmoothValue,
      lineVisible: padLineToWindow(line.lineVisible, timing.leftEdge, timing.rightEdge),
    };
  }
  return line;
};

const renderCandleFrame = (
  state: EngineState,
  frame: Frame,
  phase: FramePhase,
  candles: CandlePoint[],
) => {
  const { cfg, ctx, dt, w, pad, chartH } = frame;
  const { useStash, chartReveal, pauseProgress, pausedDt, loadingAlpha } = phase;
  const cs = state.candle;
  const timing = advanceCandleTiming(state, frame, phase, candles);
  const { rawLive, morph, leftEdge, rightEdge } = timing;

  const smoothLive = updateLiveCandle(cs, rawLive, pausedDt);
  updateCloseLineSmooth(state, rawLive, useStash, pausedDt);
  updateLineSmoothClose(state, rawLive, useStash, pausedDt);
  updateLineTickSmooth(state, timing.line.lineValue, timing.hasTickData, useStash, pausedDt);

  const set = collectCandleSet(state, timing, candles, smoothLive, phase);
  const range = updateCandleFrameRange(
    state,
    set.candles,
    timing.isWindowTransitioning,
    timing.window.windowTransProgress,
    morph.morphT,
    chartH,
    pausedDt,
  );
  const layout = makeLayout(frame, w - pad.left - pad.right, leftEdge, rightEdge, range);
  const hover = updateCandleHover(state, set.candles, morph.displayCandleWidth, layout, dt);
  const drawSet = applyLineModeMorph(cs, set, cs.lineModeProg);
  const line = buildMorphLine(state, timing, drawSet, chartReveal);

  let closePriceCandle = rawLive;
  if (cs.closeLineSmoothInited && rawLive) {
    closePriceCandle = { ...rawLive, close: cs.closeLineSmooth };
  }
  drawCandleFrame(ctx, layout, cfg.palette, {
    candles: drawSet.candles,
    chartReveal,
    closePriceCandle,
    displayCandleWidth: morph.displayCandleWidth,
    dt: pausedDt,
    emptyText: cfg.emptyText,
    formatTime: cfg.formatTime,
    formatValue: cfg.formatValue,
    gridState: state.gridState,
    hoverTime: hover.time,
    hoverValue: hover.candle?.close ?? null,
    hoverX: hover.x,
    hoveredCandle: hover.candle,
    lineModeProg: cs.lineModeProg,
    lineSmoothValue: line.lineSmoothValue,
    lineVisible: line.lineVisible,
    liveBirthAlpha: cs.liveBirthAlpha,
    liveBullBlend: cs.liveBull,
    liveCandle: drawSet.live,
    liveTime: set.live?.time ?? -1,
    loadingAlpha,
    morphT: morph.morphT,
    now: timing.now,
    now_ms: frame.nowMs,
    oldCandles: drawSet.oldCandles,
    oldWidth: cs.widthTrans.oldWidth,
    pauseProgress,
    scrubAmount: state.scrubAmount,
    // Show the empty overlay only once loadingAlpha has fully decayed, so the
    // gradient gap doesn't flash during loading→live while still fading
    // smoothly during empty→live.
    showEmptyOverlay: !(cfg.loading ?? false) && loadingAlpha < 0.01,
    showGrid: cfg.showGrid,
    targetWindowSecs: cfg.windowSecs,
    timeAxisState: state.timeAxisState,
    tooltipOutline: cfg.tooltipOutline,
    tooltipY: cfg.tooltipY,
  });

  updateCandleBadge(state, frame, {
    isWindowTransitioning: timing.isWindowTransitioning,
    layout,
    lineModeProg: cs.lineModeProg,
    lineSmoothValue: line.lineSmoothValue,
    lineVisible: line.lineVisible,
    phase,
  });
};

// ═══════════════════════════════════════════════════════
// MULTI-SERIES LINE MODE PIPELINE
// ═══════════════════════════════════════════════════════

/**
 * Reserve just enough right-side space so endpoint labels don't overlap grid
 * value text (which starts at w - pad.right + 8). Labels are drawn at
 * lineEnd + 6, so overlap = labelW + 6 - 8 = labelW - 2. Scaled by chartReveal
 * so layout doesn't shift during the loading collapse.
 */
const measureLabelReserve = (
  ctx: CanvasRenderingContext2D,
  series: SeriesInput[],
  chartReveal: number,
): number => {
  if (!series.some((s) => s.label)) {
    return 0;
  }
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  let maxLabelW = 0;
  for (const s of series) {
    if (s.label) {
      const lw = ctx.measureText(s.label).width;
      if (lw > maxLabelW) {
        maxLabelW = lw;
      }
    }
  }
  return Math.max(0, maxLabelW - 2) * chartReveal;
};

const pruneDisplayValues = (state: EngineState, series: SeriesInput[]) => {
  const currentIds = new Set(series.map((s) => s.id));
  for (const key of state.displayValues.keys()) {
    if (!currentIds.has(key)) {
      state.displayValues.delete(key);
    }
  }
};

/** Per-series smooth values; frozen while drawing from the stash. */
const updateSeriesValues = (
  state: EngineState,
  cfg: EngineConfig,
  series: SeriesInput[],
  frozen: boolean,
  noMotion: boolean,
  pausedDt: number,
): Map<string, number> => {
  const smoothValues = new Map<string, number>();
  for (const s of series) {
    let dv = state.displayValues.get(s.id) ?? s.value;
    if (!frozen) {
      const adaptiveSpeed = computeAdaptiveSpeed(
        s.value,
        dv,
        state.displayMin,
        state.displayMax,
        cfg.lerpSpeed,
        noMotion,
      );
      dv = lerp(dv, s.value, adaptiveSpeed, pausedDt);
      const prevRange = state.displayMax - state.displayMin || 1;
      if (Math.abs(dv - s.value) < prevRange * VALUE_SNAP_THRESHOLD) {
        dv = s.value;
      }
      state.displayValues.set(s.id, dv);
    }
    smoothValues.set(s.id, dv);
  }
  return smoothValues;
};

/** Per-series visibility alpha (lerp toward 0 for hidden, 1 for visible). */
const updateSeriesAlphas = (
  state: EngineState,
  hiddenIds: Set<string> | undefined,
  series: SeriesInput[],
  noMotion: boolean,
  pausedDt: number,
) => {
  for (const s of series) {
    const alpha = state.seriesAlpha.get(s.id) ?? 1;
    const target = hiddenIds?.has(s.id) ? 0 : 1;
    const next = noMotion ? target : lerp(alpha, target, SERIES_TOGGLE_SPEED, pausedDt);
    state.seriesAlpha.set(s.id, snapToUnit(next, 0.01));
  }
};

/** Override the window-transition range target with the union of ALL series (not just the first). */
const seedMultiWindowRange = (
  state: EngineState,
  cfg: EngineConfig,
  series: SeriesInput[],
  smoothValues: Map<string, number>,
  now: number,
  buffer: number,
) => {
  const transition = state.windowTransition;
  if (transition.startMs === 0 || series.length <= 1) {
    return;
  }
  const targetRightEdge = now + cfg.windowSecs * buffer;
  const targetLeftEdge = targetRightEdge - cfg.windowSecs;
  let unionMin = Infinity;
  let unionMax = -Infinity;
  for (const s of series) {
    const sData = state.pausedMultiData?.get(s.id)?.data ?? s.data;
    const sv = smoothValues.get(s.id) ?? s.value;
    const targetVisible = collectVisiblePoints(sData, targetLeftEdge, targetRightEdge);
    if (targetVisible.length > 0) {
      const range = computeRange(targetVisible, sv, cfg.referenceLine?.value, cfg.exaggerate);
      unionMin = Math.min(unionMin, range.min);
      unionMax = Math.max(unionMax, range.max);
    }
  }
  if (Number.isFinite(unionMin) && Number.isFinite(unionMax)) {
    transition.rangeToMin = unionMin;
    transition.rangeToMax = unionMax;
  }
};

interface SeriesCollection {
  entries: MultiSeriesEntry[];
  globalMin: number;
  globalMax: number;
}

/**
 * Per-series visible arrays and the global range. Uses paused snapshots to
 * prevent left-edge erosion; hidden series (alpha < 0.01) are excluded from
 * the range so the Y axis adjusts, but still pushed (drawMultiFrame skips via alpha).
 */
const collectSeriesEntries = (
  state: EngineState,
  cfg: EngineConfig,
  series: SeriesInput[],
  smoothValues: Map<string, number>,
  leftEdge: number,
  filterRight: number,
): SeriesCollection => {
  const entries: MultiSeriesEntry[] = [];
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (const s of series) {
    const seriesData = state.pausedMultiData?.get(s.id)?.data ?? s.data;
    const visible = collectVisiblePoints(seriesData, leftEdge, filterRight);
    if (visible.length < 2) {
      continue;
    }
    const sv = smoothValues.get(s.id) ?? s.value;
    const alpha = state.seriesAlpha.get(s.id) ?? 1;
    if (alpha > 0.01) {
      const range = computeRange(visible, sv, cfg.referenceLine?.value, cfg.exaggerate);
      globalMin = Math.min(globalMin, range.min);
      globalMax = Math.max(globalMax, range.max);
    }
    entries.push({ alpha, label: s.label, palette: s.palette, smoothValue: sv, visible });
  }
  return { entries, globalMax, globalMin };
};

const sampleSeriesAt = (entries: MultiSeriesEntry[], t: number): HoverEntry[] => {
  const sampled: HoverEntry[] = [];
  for (const entry of entries) {
    // Hidden series stay out of the crosshair tooltip
    if ((entry.alpha ?? 1) < 0.5) {
      continue;
    }
    const v = interpolateAtTime(entry.visible, t);
    if (v !== null) {
      sampled.push({ color: entry.palette.line, label: entry.label ?? "", value: v });
    }
  }
  return sampled;
};

interface MultiHover {
  x: number | null;
  time: number | null;
  entries: HoverEntry[];
}

const updateMultiHover = (
  state: EngineState,
  cfg: EngineConfig,
  entries: MultiSeriesEntry[],
  layout: ChartLayout,
  now: number,
  noMotion: boolean,
): MultiHover => {
  const hoverPx = state.hoverX;
  const { pad, w, chartW, leftEdge, rightEdge } = layout;
  let hover: MultiHover = { entries: [], time: null, x: null };
  let isActiveHover = false;

  if (hoverPx !== null && hoverPx >= pad.left && hoverPx <= w - pad.right) {
    const clampedX = Math.min(hoverPx, layout.toX(now));
    const t = leftEdge + ((clampedX - pad.left) / chartW) * (rightEdge - leftEdge);
    isActiveHover = true;
    const hoverEntries = sampleSeriesAt(entries, t);
    const value = hoverEntries[0]?.value ?? 0;
    state.lastHover = { time: t, value, x: clampedX };
    state.lastHoverEntries = hoverEntries;
    cfg.onHover?.({ time: t, value, x: clampedX, y: layout.toY(value) });
    hover = { entries: hoverEntries, time: t, x: clampedX };
  }

  updateScrubAmount(state, isActiveHover, noMotion);

  // Fade-out: use last known hover position + cached entries
  if (!isActiveHover && state.scrubAmount > 0 && state.lastHover) {
    return { entries: state.lastHoverEntries, time: state.lastHover.time, x: state.lastHover.x };
  }
  return hover;
};

const renderMultiFrame = (
  state: EngineState,
  frame: Frame,
  phase: FramePhase,
  series: SeriesInput[],
) => {
  const { cfg, ctx, dt, w, pad, chartH, nowMs, noMotion } = frame;
  const { hasData, useMultiStash, chartReveal, pauseProgress, pausedDt, loadingAlpha } = phase;

  const chartW = w - pad.left - pad.right - measureLabelReserve(ctx, series, chartReveal);
  const buffer = cfg.showBadge ? WINDOW_BUFFER : WINDOW_BUFFER_NO_BADGE;
  if (!useMultiStash) {
    pruneDisplayValues(state, series);
  }
  const [firstSeries] = series;
  const now = resolveNow(state, hasData, useMultiStash);
  const smoothValues = updateSeriesValues(state, cfg, series, useMultiStash, noMotion, pausedDt);
  updateSeriesAlphas(state, cfg.hiddenSeriesIds, series, noMotion, pausedDt);

  // Seed the window transition with the first series, then widen to all of them
  const firstData = state.pausedMultiData?.get(firstSeries.id)?.data ?? firstSeries.data;
  const windowResult = updateWindowTransition(
    state,
    cfg,
    noMotion,
    nowMs,
    now,
    firstData,
    smoothValues.get(firstSeries.id) ?? firstSeries.value,
    buffer,
  );
  seedMultiWindowRange(state, cfg, series, smoothValues, now, buffer);
  state.displayWindow = windowResult.windowSecs;
  const isWindowTransitioning = state.windowTransition.startMs > 0;

  const rightEdge = now + windowResult.windowSecs * buffer;
  const leftEdge = rightEdge - windowResult.windowSecs;
  const filterRight = rightEdge - (rightEdge - now) * pauseProgress;
  const collected = collectSeriesEntries(state, cfg, series, smoothValues, leftEdge, filterRight);

  if (collected.entries.length === 0) {
    drawNoData(state, frame, loadingAlpha, true);
    return;
  }

  const computedRange = {
    max: Number.isFinite(collected.globalMax) ? collected.globalMax : 1,
    min: Number.isFinite(collected.globalMin) ? collected.globalMin : 0,
  };
  updateRange(
    state,
    computedRange,
    isWindowTransitioning,
    windowResult.windowTransProgress,
    cfg.lerpSpeed + ADAPTIVE_SPEED_BOOST * 0.5,
    chartH,
    pausedDt,
  );
  const layout = makeLayout(frame, chartW, leftEdge, rightEdge, rangeOf(state));
  const hover = updateMultiHover(state, cfg, collected.entries, layout, now, noMotion);

  drawMultiFrame(ctx, layout, {
    chartReveal,
    dt,
    formatTime: cfg.formatTime,
    formatValue: cfg.formatValue,
    gridState: state.gridState,
    hoverEntries: hover.entries,
    hoverTime: hover.time,
    hoverX: hover.x,
    now,
    now_ms: nowMs,
    pauseProgress,
    primaryPalette: cfg.palette,
    referenceLine: cfg.referenceLine,
    scrubAmount: state.scrubAmount,
    series: collected.entries,
    showGrid: cfg.showGrid,
    showPulse: cfg.showPulse,
    targetWindowSecs: cfg.windowSecs,
    timeAxisState: state.timeAxisState,
    tooltipOutline: cfg.tooltipOutline,
    tooltipY: cfg.tooltipY,
    windowSecs: windowResult.windowSecs,
  });

  drawRevealOverlay(frame, phase);
  hideBadge(state);
};

// ═══════════════════════════════════════════════════════
// LINE MODE PIPELINE
// ═══════════════════════════════════════════════════════

interface DisplayValueUpdate {
  adaptiveSpeed: number;
  smoothValue: number;
}

/** Smooth the display value; frozen while drawing from the stash. */
const updateDisplayValue = (
  state: EngineState,
  cfg: EngineConfig,
  phase: FramePhase,
  noMotion: boolean,
): DisplayValueUpdate => {
  const adaptiveSpeed = computeAdaptiveSpeed(
    cfg.value,
    state.displayValue,
    state.displayMin,
    state.displayMax,
    cfg.lerpSpeed,
    noMotion,
  );
  if (!phase.useStash) {
    state.displayValue = lerp(state.displayValue, cfg.value, adaptiveSpeed, phase.pausedDt);
    // Skip snap when pausing — cfg.value keeps changing from the consumer,
    // so the snap would cause visible jumps in a supposedly frozen chart
    if (phase.pauseProgress < 0.5) {
      const prevRange = state.displayMax - state.displayMin || 1;
      if (Math.abs(state.displayValue - cfg.value) < prevRange * VALUE_SNAP_THRESHOLD) {
        state.displayValue = cfg.value;
      }
    }
  }
  return { adaptiveSpeed, smoothValue: state.displayValue };
};

/**
 * With the badge off, a smaller buffer keeps the dot near the right edge. With
 * momentum arrows + badge both on, leave enough gap for the arrows to fit.
 */
const lineBuffer = (cfg: EngineConfig, chartW: number): number => {
  const baseBuffer = cfg.showBadge ? WINDOW_BUFFER : WINDOW_BUFFER_NO_BADGE;
  const needsArrowRoom = cfg.showMomentum && cfg.showBadge;
  return needsArrowRoom ? Math.max(baseBuffer, 37 / Math.max(chartW, 1)) : baseBuffer;
};

/** Recent velocity relative to the visible range, drives the particle burst. */
const computeSwingMagnitude = (visible: LivelinePoint[], valRange: number): number => {
  const lookback = Math.min(5, visible.length - 1);
  const last = visible.at(-1);
  const prior = visible.at(-1 - lookback);
  let recentDelta = 0;
  if (lookback > 0 && last !== undefined && prior !== undefined) {
    recentDelta = Math.abs(last.value - prior.value);
  }
  return valRange > 0 ? Math.min(recentDelta / valRange, 1) : 0;
};

/** Live value display — DOM element updated by ref, no React re-renders. */
const updateValueDisplay = (cfg: EngineConfig, smoothValue: number, momentum: Momentum) => {
  const valEl = cfg.valueDisplayRef?.current;
  if (!valEl) {
    return;
  }
  // When momentum colour is on, strip sign — colour already communicates direction
  const displayVal = cfg.valueMomentumColor ? Math.abs(smoothValue) : smoothValue;
  valEl.textContent = cfg.formatValue(displayVal);
  if (!cfg.valueMomentumColor) {
    return;
  }
  const mc = MOMENTUM_TEXT_COLOR[momentum];
  if (mc) {
    valEl.style.color = mc;
  } else {
    valEl.style.removeProperty("color");
  }
};

const renderLineFrame = (
  state: EngineState,
  frame: Frame,
  phase: FramePhase,
  points: LivelinePoint[],
) => {
  const { cfg, ctx, dt, w, pad, chartH, nowMs, noMotion } = frame;
  const { hasData, useStash, chartReveal, pauseProgress, pausedDt } = phase;

  const effectivePoints = useStash ? state.lastData : points;
  const { adaptiveSpeed, smoothValue } = updateDisplayValue(state, cfg, phase, noMotion);
  const chartW = w - pad.left - pad.right;
  const buffer = lineBuffer(cfg, chartW);

  const now = resolveNow(state, hasData, useStash);
  const windowResult = updateWindowTransition(
    state,
    cfg,
    noMotion,
    nowMs,
    now,
    effectivePoints,
    smoothValue,
    buffer,
  );
  state.displayWindow = windowResult.windowSecs;

  const rightEdge = now + windowResult.windowSecs * buffer;
  const leftEdge = rightEdge - windowResult.windowSecs;
  // When pausing, contract the right edge to `now` so new data (with real-time
  // timestamps) can't appear past the live dot
  const filterRight = rightEdge - (rightEdge - now) * pauseProgress;
  const visible = collectVisiblePoints(effectivePoints, leftEdge, filterRight);

  if (visible.length < 2) {
    hideBadge(state);
    return;
  }

  const computedRange =
    cfg.minValue !== undefined && cfg.maxValue !== undefined
      ? { max: cfg.maxValue, min: cfg.minValue }
      : computeRange(visible, smoothValue, cfg.referenceLine?.value, cfg.exaggerate);
  const isWindowTransitioning = state.windowTransition.startMs > 0;
  updateRange(
    state,
    computedRange,
    isWindowTransitioning,
    windowResult.windowTransProgress,
    adaptiveSpeed,
    chartH,
    pausedDt,
  );
  const range = rangeOf(state);
  const layout = makeLayout(frame, chartW, leftEdge, rightEdge, range);

  const momentum: Momentum = cfg.momentumOverride ?? detectMomentum(visible);
  const hover = updateHoverState(state, cfg, layout, now, visible, noMotion);

  drawFrame(ctx, layout, cfg.palette, {
    arrowState: state.arrowState,
    chartReveal,
    dt,
    formatTime: cfg.formatTime,
    formatValue: cfg.formatValue,
    gridState: state.gridState,
    hoverTime: hover.hoverTime,
    hoverValue: hover.hoverValue,
    hoverX: hover.hoverX,
    momentum,
    now,
    now_ms: nowMs,
    orderbookData: cfg.orderbookData,
    orderbookState: cfg.orderbookData ? state.orderbookState : undefined,
    particleOptions: cfg.degenOptions,
    particleState: cfg.degenOptions ? state.particleState : undefined,
    pauseProgress,
    referenceLine: cfg.referenceLine,
    scrubAmount: state.scrubAmount,
    shakeState: cfg.degenOptions ? state.shakeState : undefined,
    showFill: cfg.showFill,
    showGrid: cfg.showGrid,
    showMomentum: cfg.showMomentum,
    showPulse: cfg.showPulse,
    smoothValue,
    swingMagnitude: computeSwingMagnitude(visible, range.valRange),
    targetWindowSecs: cfg.windowSecs,
    timeAxisState: state.timeAxisState,
    tooltipOutline: cfg.tooltipOutline,
    tooltipY: cfg.tooltipY,
    visible,
    windowSecs: windowResult.windowSecs,
  });

  drawRevealOverlay(frame, phase);

  const { badge } = state;
  if (badge) {
    updateBadgeDOM(state, frame, badge, {
      chartReveal,
      dt: pausedDt,
      isWindowTransitioning,
      layout,
      momentum,
      smoothValue,
    });
    // Fully fades out as pauseProgress → 1
    if (pauseProgress > 0.01) {
      scaleBadgeOpacity(badge, 1 - pauseProgress);
    }
  }

  updateValueDisplay(cfg, smoothValue, momentum);
};

// --- Frame orchestration ---

const renderFrame = (state: EngineState, frame: Frame) => {
  const { cfg } = frame;
  const data = resolveFrameData(state, cfg);
  const phase = computePhase(state, frame, data);

  if (!data.hasData && !phase.useStash && !phase.useMultiStash) {
    const grey = data.isCandle || cfg.isMultiSeries === true || state.lastMultiSeries.length > 0;
    drawNoData(state, frame, phase.loadingAlpha, grey);
    return;
  }
  if (data.isCandle) {
    renderCandleFrame(state, frame, phase, data.candles);
    return;
  }
  const activeMulti =
    cfg.isMultiSeries && cfg.multiSeries && cfg.multiSeries.length > 0
      ? cfg.multiSeries
      : undefined;
  const series = phase.useMultiStash ? state.lastMultiSeries : activeMulti;
  if (series) {
    renderMultiFrame(state, frame, phase, series);
    return;
  }
  renderLineFrame(state, frame, phase, data.points);
};

interface FrameStart {
  ctx: CanvasRenderingContext2D;
  dt: number;
  nowMs: number;
}

/** Delta time, canvas resize, and context acquisition for one frame. */
const beginFrame = (
  state: EngineState,
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
): FrameStart | null => {
  const dpr = getDpr();
  const nowMs = performance.now();
  const dt = state.lastFrameMs ? Math.min(nowMs - state.lastFrameMs, MAX_DELTA_MS) : 16.67;
  state.lastFrameMs = nowMs;

  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  let { ctx } = state;
  if (!ctx || ctx.canvas !== canvas) {
    ctx = canvas.getContext("2d");
    state.ctx = ctx;
  }
  if (!ctx) {
    return null;
  }
  applyDpr(ctx, dpr, w, h);
  return { ctx, dt, nowMs };
};

const createBadgeEls = (container: HTMLDivElement): BadgeEls => {
  const el = document.createElement("div");
  el.style.cssText =
    "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;display:none;z-index:1;";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.style.cssText = "position:absolute;top:0;left:0;";

  const path = document.createElementNS(SVG_NS, "path");
  svg.append(path);

  const text = document.createElement("span");
  text.style.cssText = "position:relative;display:block;color:#fff;white-space:nowrap;";

  el.append(svg);
  el.append(text);
  container.append(el);
  return { container: el, displayW: 0, path, svg, targetW: 0, text };
};

export const useLivelineEngine = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  config: EngineConfig,
) => {
  // Config lives in a ref so the draw loop is never re-created
  const configRef = useRef(config);
  useLayoutEffect(() => {
    configRef.current = config;
  }, [config]);

  // Animation state persists across frames without per-frame allocation
  const stateRef = useRef(createEngineState(config));

  // Badge DOM elements (once, appended to container)
  useEffect(() => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const badge = createBadgeEls(container);
    state.badge = badge;
    return () => {
      badge.container.remove();
      state.badge = null;
    };
  }, [containerRef]);

  // ResizeObserver — update size without layout thrashing
  useEffect(() => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      state.size = { h: height, w: width };
    });
    ro.observe(container);
    const rect = container.getBoundingClientRect();
    state.size = { h: rect.height, w: rect.width };
    return () => ro.disconnect();
  }, [containerRef]);

  // Mouse + touch events for hover/scrub
  useEffect(() => {
    const state = stateRef.current;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onMove = (e: MouseEvent) => {
      if (!configRef.current.scrub) {
        return;
      }
      const rect = container.getBoundingClientRect();
      state.hoverX = e.clientX - rect.left;
    };
    const onLeave = () => {
      state.hoverX = null;
      configRef.current.onHover?.(null);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!configRef.current.scrub || e.touches.length !== 1) {
        return;
      }
      const rect = container.getBoundingClientRect();
      state.hoverX = e.touches[0].clientX - rect.left;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!configRef.current.scrub || e.touches.length !== 1) {
        return;
      }
      // Prevent scroll while scrubbing
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      state.hoverX = e.touches[0].clientX - rect.left;
    };
    const onTouchEnd = () => {
      state.hoverX = null;
      configRef.current.onHover?.(null);
    };

    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);
    container.addEventListener("touchcancel", onTouchEnd);
    return () => {
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerRef]);

  // Reduced motion: lerps snap instantly
  useEffect(() => {
    const state = stateRef.current;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    state.reducedMotion = mql.matches;
    const onChange = (e: MediaQueryListEvent) => {
      state.reducedMotion = e.matches;
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // rAF draw loop; stops while the tab is hidden and resumes on return
  useEffect(() => {
    const state = stateRef.current;
    const tick = () => {
      if (document.hidden) {
        state.raf = 0;
        return;
      }
      const canvas = canvasRef.current;
      const { w, h } = state.size;
      if (canvas && w !== 0 && h !== 0) {
        const started = beginFrame(state, canvas, w, h);
        if (started) {
          const cfg = configRef.current;
          const pad = cfg.padding;
          renderFrame(state, {
            cfg,
            chartH: h - pad.top - pad.bottom,
            ctx: started.ctx,
            dt: started.dt,
            h,
            noMotion: state.reducedMotion,
            nowMs: started.nowMs,
            pad,
            w,
          });
        }
      }
      state.raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (!document.hidden && !state.raf) {
        state.raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    state.raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(state.raf);
    };
  }, [canvasRef]);
};
