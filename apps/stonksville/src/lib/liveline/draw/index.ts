import type {
  LivelinePalette,
  ChartLayout,
  LivelinePoint,
  Momentum,
  ReferenceLine,
  OrderbookData,
  DegenOptions,
  CandlePoint,
} from "../types";
import { drawGrid } from "./grid";
import type { GridState } from "./grid";
import { drawLine } from "./line";
import { drawDot, drawArrows, drawSimpleDot, drawMultiDot } from "./dot";
import { drawCrosshair, drawMultiCrosshair } from "./crosshair";
import type { MultiSeriesHoverEntry } from "./crosshair";
import { drawReferenceLine } from "./reference-line";
import { drawTimeAxis } from "./time-axis";
import type { TimeAxisState } from "./time-axis";
import { drawOrderbook } from "./orderbook";
import type { OrderbookState } from "./orderbook";
import { drawParticles, spawnOnSwing } from "./particles";
import type { ParticleState } from "./particles";
import {
  drawCandlesticks,
  drawClosePrice,
  drawCandleCrosshair,
  drawLineModeCrosshair,
} from "./candlestick";
import { drawEmpty } from "./empty";

type Point = [number, number];

const SHAKE_DECAY_RATE = 0.002;
const SHAKE_MIN_AMPLITUDE = 0.2;
export const FADE_EDGE_WIDTH = 40;
const CROSSHAIR_FADE_MIN_PX = 5;

export interface ArrowState {
  up: number;
  down: number;
}

export interface ShakeState {
  /** current shake magnitude in px, decays each frame */
  amplitude: number;
}

export const createShakeState = (): ShakeState => ({ amplitude: 0 });

/** Smoothstep of `reveal` across [start, end] for staggered reveal timing. */
const revealRamp = (reveal: number, start: number, end: number): number => {
  const t = Math.max(0, Math.min(1, (reveal - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

/** Run `draw` at `alpha`, skipping it entirely when invisible. */
const withAlpha = (ctx: CanvasRenderingContext2D, alpha: number, draw: () => void): void => {
  if (alpha <= 0.01) {
    return;
  }
  ctx.save();
  if (alpha < 1) {
    ctx.globalAlpha = alpha;
  }
  draw();
  ctx.restore();
};

/** Crosshair fades out as the cursor approaches the live dot. */
const crosshairOpacity = (distToLive: number, chartW: number, scrubAmount: number): number => {
  if (distToLive < CROSSHAIR_FADE_MIN_PX) {
    return 0;
  }
  const fadeStart = Math.min(80, chartW * 0.3);
  if (distToLive >= fadeStart) {
    return scrubAmount;
  }
  return ((distToLive - CROSSHAIR_FADE_MIN_PX) / (fadeStart - CROSSHAIR_FADE_MIN_PX)) * scrubAmount;
};

/** Gradient erase along the left edge so the line scrolls in from nothing. */
const drawEdgeFade = (ctx: CanvasRenderingContext2D, padLeft: number, h: number): void => {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const fadeGrad = ctx.createLinearGradient(padLeft, 0, padLeft + FADE_EDGE_WIDTH, 0);
  fadeGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
  fadeGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(0, 0, padLeft + FADE_EDGE_WIDTH, h);
  ctx.restore();
};

/** Random translate scaled by shake amplitude; returns whether ctx was translated. */
const beginShake = (ctx: CanvasRenderingContext2D, shake: ShakeState | undefined, dt: number) => {
  let translated = false;
  if (shake && shake.amplitude > SHAKE_MIN_AMPLITUDE) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * 2 * shake.amplitude,
      (Math.random() - 0.5) * 2 * shake.amplitude,
    );
    translated = true;
  }
  if (shake) {
    // Exponential decay — ~200ms of visible shake
    shake.amplitude *= SHAKE_DECAY_RATE ** (dt / 1000);
    if (shake.amplitude < SHAKE_MIN_AMPLITUDE) {
      shake.amplitude = 0;
    }
  }
  return translated;
};

interface FrameChromeOptions {
  referenceLine?: ReferenceLine;
  showGrid: boolean;
  formatValue: (v: number) => string;
  gridState: GridState;
  dt: number;
}

/** Reference line + grid, both fading in with reveal (grid delayed to 15%–70%). */
const drawBackdrop = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  reveal: number,
  opts: FrameChromeOptions,
): void => {
  if (opts.referenceLine) {
    const { referenceLine } = opts;
    withAlpha(ctx, reveal, () => drawReferenceLine(ctx, layout, palette, referenceLine));
  }
  if (opts.showGrid) {
    withAlpha(ctx, revealRamp(reveal, 0.15, 0.7), () =>
      drawGrid(ctx, layout, palette, opts.formatValue, opts.gridState, opts.dt),
    );
  }
};

interface TimeAxisOptions {
  windowSecs: number;
  targetWindowSecs: number;
  formatTime: (t: number) => string;
  timeAxisState: TimeAxisState;
  dt: number;
}

const drawTimeAxisAt = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  alpha: number,
  opts: TimeAxisOptions,
): void => {
  withAlpha(ctx, alpha, () =>
    drawTimeAxis(
      ctx,
      layout,
      palette,
      opts.windowSecs,
      opts.targetWindowSecs,
      opts.formatTime,
      opts.timeAxisState,
      opts.dt,
    ),
  );
};

export interface DrawOptions {
  visible: LivelinePoint[];
  smoothValue: number;
  /** engine's Date.now()/1000, single timestamp for the frame */
  now: number;
  momentum: Momentum;
  arrowState: ArrowState;
  showGrid: boolean;
  showMomentum: boolean;
  showPulse: boolean;
  showFill: boolean;
  referenceLine?: ReferenceLine;
  hoverX: number | null;
  hoverValue: number | null;
  hoverTime: number | null;
  /** 0 = not scrubbing, 1 = fully scrubbing (lerped) */
  scrubAmount: number;
  windowSecs: number;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  gridState: GridState;
  timeAxisState: TimeAxisState;
  /** delta time in ms for frame-rate-independent lerps */
  dt: number;
  /** final target window (stable during transitions) */
  targetWindowSecs: number;
  tooltipY: number;
  tooltipOutline: boolean;
  orderbookData?: OrderbookData;
  orderbookState?: OrderbookState;
  particleState?: ParticleState;
  particleOptions?: DegenOptions;
  swingMagnitude: number;
  shakeState?: ShakeState;
  /** 0 = loading/morphing from center, 1 = fully revealed */
  chartReveal: number;
  /** 0 = playing, 1 = fully paused */
  pauseProgress: number;
  /** performance.now() for breathing animation timing */
  now_ms: number;
}

/** Live dot (dims near the cursor), momentum arrows, and degen particles at the line tip. */
const drawLiveTip = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: DrawOptions,
  lastPt: Point,
): void => {
  const reveal = opts.chartReveal;
  const pause = opts.pauseProgress;

  let dotScrub = opts.scrubAmount;
  if (opts.hoverX !== null && dotScrub > 0) {
    dotScrub = crosshairOpacity(lastPt[0] - opts.hoverX, layout.chartW, opts.scrubAmount);
  }

  // Dot appears once shape is recognizable (reveal > 0.3)
  const dotAlpha = reveal < 0.3 ? 0 : (reveal - 0.3) / 0.7;
  const showPulse = opts.showPulse && reveal > 0.6 && pause < 0.5;
  withAlpha(ctx, dotAlpha, () =>
    drawDot(ctx, lastPt[0], lastPt[1], palette, showPulse, dotScrub, opts.now_ms),
  );

  if (opts.showMomentum) {
    withAlpha(ctx, revealRamp(reveal, 0.6, 1) * (1 - pause), () =>
      drawArrows(
        ctx,
        lastPt[0],
        lastPt[1],
        opts.momentum,
        palette,
        opts.arrowState,
        opts.dt,
        opts.now_ms,
      ),
    );
  }

  if (opts.particleState && reveal > 0.9) {
    const burstIntensity = spawnOnSwing(
      opts.particleState,
      opts.momentum,
      lastPt[0],
      lastPt[1],
      opts.swingMagnitude,
      palette.line,
      opts.dt,
      opts.particleOptions,
    );
    if (burstIntensity > 0 && opts.shakeState) {
      opts.shakeState.amplitude = (3 + opts.swingMagnitude * 4) * burstIntensity;
    }
    drawParticles(ctx, opts.particleState, opts.dt);
  }
};

/**
 * Master draw function — calls each draw module in order.
 * Mutates arrowState in place.
 */
export const drawFrame = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: DrawOptions,
): void => {
  const shaking = beginShake(ctx, opts.shakeState, opts.dt);
  const reveal = opts.chartReveal;

  drawBackdrop(ctx, layout, palette, reveal, opts);

  if (opts.orderbookData && opts.orderbookState) {
    const { orderbookData, orderbookState } = opts;
    withAlpha(ctx, reveal, () =>
      drawOrderbook(
        ctx,
        layout,
        palette,
        orderbookData,
        opts.dt,
        orderbookState,
        opts.swingMagnitude,
      ),
    );
  }

  const scrubX = opts.scrubAmount > 0.05 ? opts.hoverX : null;
  const pts = drawLine(
    ctx,
    layout,
    palette,
    opts.visible,
    opts.smoothValue,
    opts.now,
    opts.showFill,
    scrubX,
    opts.scrubAmount,
    reveal,
    opts.now_ms,
  );

  drawTimeAxisAt(ctx, layout, palette, revealRamp(reveal, 0.15, 0.7), opts);

  const lastPt = pts?.at(-1);
  if (lastPt) {
    drawLiveTip(ctx, layout, palette, opts, lastPt);
  }

  drawEdgeFade(ctx, layout.pad.left, layout.h);

  if (lastPt && opts.hoverX !== null && opts.hoverValue !== null && opts.hoverTime !== null) {
    const scrubOpacity = crosshairOpacity(lastPt[0] - opts.hoverX, layout.chartW, opts.scrubAmount);
    if (scrubOpacity > 0.01) {
      drawCrosshair(
        ctx,
        layout,
        palette,
        opts.hoverX,
        opts.hoverValue,
        opts.hoverTime,
        opts.formatValue,
        opts.formatTime,
        scrubOpacity,
        opts.tooltipY,
        lastPt[0],
        opts.tooltipOutline,
      );
    }
  }

  if (shaking) {
    ctx.restore();
  }
};

// ─── Multi-series draw orchestration ──────────────────────────────────────

export interface MultiSeriesEntry {
  visible: LivelinePoint[];
  smoothValue: number;
  palette: LivelinePalette;
  label?: string;
  /** series visibility alpha (0 = hidden, 1 = visible) */
  alpha?: number;
}

export interface MultiSeriesDrawOptions {
  series: MultiSeriesEntry[];
  now: number;
  showGrid: boolean;
  showPulse: boolean;
  referenceLine?: ReferenceLine;
  hoverX: number | null;
  hoverTime: number | null;
  hoverEntries: MultiSeriesHoverEntry[];
  scrubAmount: number;
  windowSecs: number;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  gridState: GridState;
  timeAxisState: TimeAxisState;
  dt: number;
  targetWindowSecs: number;
  tooltipY: number;
  tooltipOutline: boolean;
  chartReveal: number;
  pauseProgress: number;
  now_ms: number;
  /** Primary palette (from first series) for grid/axis/crosshair colors */
  primaryPalette: LivelinePalette;
}

interface DrawnSeries {
  lastPt: Point;
  palette: LivelinePalette;
  label?: string;
  alpha: number;
}

/**
 * Draw each series line back to front (no fill, with scrub dimming).
 * During reverse morph, secondary lines fade out so only one remains at
 * chartReveal=0 — prevents alpha compounding from multiple overlapping strokes
 * looking brighter than the single standalone loading squiggly.
 */
const drawSeriesLines = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  opts: MultiSeriesDrawOptions,
): DrawnSeries[] => {
  const reveal = opts.chartReveal;
  const scrubX = opts.scrubAmount > 0.05 ? opts.hoverX : null;
  const drawn: DrawnSeries[] = [];
  for (const [si, s] of opts.series.entries()) {
    const seriesAlpha = s.alpha ?? 1;
    const secondaryFade = si > 0 && reveal < 1 ? Math.min(1, reveal * 2) : 1;
    withAlpha(ctx, secondaryFade * seriesAlpha, () => {
      const pts = drawLine(
        ctx,
        layout,
        s.palette,
        s.visible,
        s.smoothValue,
        opts.now,
        false,
        scrubX,
        opts.scrubAmount,
        reveal,
        opts.now_ms,
      );
      const lastPt = pts?.at(-1);
      if (lastPt) {
        drawn.push({ alpha: seriesAlpha, label: s.label, lastPt, palette: s.palette });
      }
    });
  }
  return drawn;
};

/**
 * Endpoint dot + label per series. Dots stay at reveal-based alpha only (no
 * scrub dimming) — matching single-series where drawDot keeps the inner dot at
 * full baseAlpha.
 */
const drawSeriesEndpoints = (
  ctx: CanvasRenderingContext2D,
  series: DrawnSeries[],
  opts: MultiSeriesDrawOptions,
): void => {
  const reveal = opts.chartReveal;
  if (reveal <= 0.3) {
    return;
  }
  const dotAlpha = (reveal - 0.3) / 0.7;
  const showPulse = opts.showPulse && reveal > 0.6 && opts.pauseProgress < 0.5;

  for (const entry of series) {
    if (entry.alpha < 0.01) {
      continue;
    }
    const [x, y] = entry.lastPt;
    ctx.save();
    ctx.globalAlpha = dotAlpha * entry.alpha;

    if (showPulse && entry.alpha > 0.5) {
      drawMultiDot(ctx, x, y, entry.palette.line, true, opts.now_ms, 3);
    } else {
      drawSimpleDot(ctx, x, y, entry.palette.line, 3);
    }

    // Layout reserves space to the right of the dot via labelReserve
    if (entry.label) {
      ctx.font =
        '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.fillStyle = entry.palette.line;
      ctx.fillText(entry.label, x + 6, y + 3.5);
    }
    ctx.restore();
  }
};

/** Rightmost live dot X across visible series, or undefined when none are visible. */
const rightmostLiveDotX = (series: DrawnSeries[]): number | undefined => {
  let maxX: number | undefined;
  for (const entry of series) {
    if (entry.alpha < 0.01) {
      continue;
    }
    const [x] = entry.lastPt;
    if (maxX === undefined || x > maxX) {
      maxX = x;
    }
  }
  return maxX;
};

/**
 * Multi-series draw function — draws multiple overlapping lines sharing the same axes.
 * No fill, no momentum arrows, no badge (those are per-chart concerns handled by the engine).
 */
export const drawMultiFrame = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  opts: MultiSeriesDrawOptions,
): void => {
  const palette = opts.primaryPalette;
  const reveal = opts.chartReveal;

  drawBackdrop(ctx, layout, palette, reveal, opts);
  const series = drawSeriesLines(ctx, layout, opts);
  drawTimeAxisAt(ctx, layout, palette, revealRamp(reveal, 0.15, 0.7), opts);
  drawSeriesEndpoints(ctx, series, opts);
  drawEdgeFade(ctx, layout.pad.left, layout.h);

  if (
    opts.hoverX === null ||
    opts.hoverTime === null ||
    opts.hoverEntries.length === 0 ||
    opts.scrubAmount <= 0.01
  ) {
    return;
  }
  const liveDotX = rightmostLiveDotX(series) ?? 0;
  const scrubOpacity = crosshairOpacity(liveDotX - opts.hoverX, layout.chartW, opts.scrubAmount);
  if (scrubOpacity > 0.01) {
    drawMultiCrosshair(
      ctx,
      layout,
      palette,
      opts.hoverX,
      opts.hoverTime,
      opts.hoverEntries,
      opts.formatValue,
      opts.formatTime,
      scrubOpacity,
      opts.tooltipY,
      opts.tooltipOutline,
      liveDotX,
    );
  }
};

// ─── Candlestick draw orchestration ────────────────────────────────────────

export interface CandleDrawOptions {
  candles: CandlePoint[];
  displayCandleWidth: number;
  oldCandles: CandlePoint[];
  oldWidth: number;
  /** candle width transition progress (-1 = none) */
  morphT: number;
  liveCandle?: CandlePoint;
  /** Pre-blend live candle for the dashed close-price line (unaffected by line mode morph) */
  closePriceCandle?: CandlePoint;
  liveTime: number;
  liveBirthAlpha: number;
  liveBullBlend: number;
  lineModeProg: number;
  chartReveal: number;
  now_ms: number;
  now: number;
  pauseProgress: number;
  showGrid: boolean;
  scrubAmount: number;
  hoverX: number | null;
  hoverValue: number | null;
  hoverTime: number | null;
  hoveredCandle: CandlePoint | null;
  formatValue: (v: number) => string;
  formatTime: (t: number) => string;
  gridState: GridState;
  timeAxisState: TimeAxisState;
  dt: number;
  targetWindowSecs: number;
  tooltipY: number;
  tooltipOutline: boolean;
  // Line data — drawLine handles morphY, alpha, color, dot position
  lineVisible: LivelinePoint[];
  lineSmoothValue: number;
  emptyText?: string;
  loadingAlpha: number;
  /** true only when collapsing to empty (not loading, not forward morph) */
  showEmptyOverlay: boolean;
}

/**
 * Line presence: how much the morph line shows. During the reveal it morphs
 * from the loading squiggly into data positions; in candle mode it fades much
 * faster (cubed) so candles become dominant early and the morphing line never
 * looks like a "line chart."
 */
const linePresence = (opts: CandleDrawOptions, fullLineMode: boolean): number => {
  const hidden = 1 - opts.chartReveal;
  const revealLine = fullLineMode ? hidden : hidden * hidden * hidden;
  return Math.max(opts.lineModeProg, revealLine);
};

/**
 * Close price lines: the candle-colored dashed line fades out with line
 * presence while the accent dash fades in. Uses closePriceCandle (pre-blend)
 * so neither is affected by line mode morph or OHLC collapse.
 */
const drawCloseLines = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: CandleDrawOptions,
  lp: number,
  fullLineMode: boolean,
): void => {
  const closeAlpha = revealRamp(opts.chartReveal, 0.4, 0.8);
  const closeSource = opts.closePriceCandle ?? opts.liveCandle;
  if (!closeSource || closeAlpha <= 0.01) {
    return;
  }
  if (lp < 0.99) {
    ctx.save();
    ctx.globalAlpha = closeAlpha * (1 - lp);
    drawClosePrice(ctx, layout, palette, closeSource, opts.scrubAmount, opts.liveBullBlend);
    ctx.restore();
  }
  // In full line mode drawLine draws its own morphing dash
  if (lp > 0.01 && !fullLineMode) {
    const { w, h, pad } = layout;
    const dashY = layout.toY(closeSource.close);
    if (dashY >= pad.top && dashY <= h - pad.bottom) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = palette.dashLine;
      ctx.lineWidth = 1;
      ctx.globalAlpha = closeAlpha * lp * (1 - opts.scrubAmount * 0.2);
      ctx.beginPath();
      ctx.moveTo(pad.left, dashY);
      ctx.lineTo(w - pad.right, dashY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
};

/** Collapse OHLC toward close by `scale` so bodies shrink into thin lines before fading. */
const collapseCandles = (candles: CandlePoint[], scale: number): CandlePoint[] => {
  if (scale >= 0.99 || candles.length === 0) {
    return candles;
  }
  return candles.map((c) => ({
    close: c.close,
    high: c.close + (c.high - c.close) * scale,
    low: c.close + (c.low - c.close) * scale,
    open: c.close + (c.open - c.close) * scale,
    time: c.time,
  }));
};

/**
 * Candles at alpha = chartReveal * (1 - lp), cross-fading old→new widths
 * during a width morph. OHLC expansion uses smoothstep on reveal so shape and
 * alpha stay in sync (at 50% visible, candles are ~50% expanded, not flat).
 */
const drawCandleLayer = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: CandleDrawOptions,
  lp: number,
): void => {
  const reveal = opts.chartReveal;
  const candleAlpha = reveal * (1 - lp);
  if (candleAlpha <= 0.01) {
    return;
  }
  const ohlcScale = reveal * reveal * (3 - 2 * reveal);
  const revealCandles = collapseCandles(opts.candles, ohlcScale);
  const revealOld = collapseCandles(opts.oldCandles, ohlcScale);
  const accentCol = lp > 0.01 ? palette.line : undefined;
  const { pad, chartW, chartH } = layout;

  const drawCurrent = () =>
    drawCandlesticks(
      ctx,
      layout,
      revealCandles,
      opts.displayCandleWidth,
      opts.liveCandle?.time ?? -1,
      opts.now_ms,
      opts.hoverX ?? 0,
      opts.scrubAmount,
      opts.liveBirthAlpha,
      opts.liveBullBlend,
      accentCol,
      lp,
    );

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left - 1, pad.top, chartW + 2, chartH);
  ctx.clip();
  if (opts.morphT >= 0 && revealOld.length > 0) {
    ctx.globalAlpha = (1 - opts.morphT) * candleAlpha;
    drawCandlesticks(
      ctx,
      layout,
      revealOld,
      opts.oldWidth,
      -1,
      opts.now_ms,
      opts.hoverX ?? 0,
      opts.scrubAmount,
      1,
      -1,
      accentCol,
      lp,
    );
    ctx.globalAlpha = opts.morphT * candleAlpha;
    drawCurrent();
    ctx.globalAlpha = 1;
  } else {
    if (candleAlpha < 1) {
      ctx.globalAlpha = candleAlpha;
    }
    drawCurrent();
  }
  ctx.restore();
};

/** Crosshair once mostly revealed (70%+): single value in line mode, OHLC otherwise. */
const drawCandleFrameCrosshair = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: CandleDrawOptions,
): void => {
  if (
    opts.chartReveal <= 0.7 ||
    !opts.hoveredCandle ||
    opts.hoverX === null ||
    opts.scrubAmount <= 0.01
  ) {
    return;
  }
  if (opts.lineModeProg > 0.5) {
    drawLineModeCrosshair(
      ctx,
      layout,
      palette,
      opts.hoverX,
      opts.hoveredCandle.close,
      opts.hoverTime ?? 0,
      opts.formatValue,
      opts.formatTime,
      opts.scrubAmount,
    );
    return;
  }
  drawCandleCrosshair(
    ctx,
    layout,
    palette,
    opts.hoverX,
    opts.hoveredCandle,
    opts.hoverTime ?? 0,
    opts.formatValue,
    opts.formatTime,
    opts.scrubAmount,
  );
};

/**
 * Candlestick draw orchestrator — calls each draw module in the correct
 * order for candle mode. Pure drawing function, no state management.
 */
export const drawCandleFrame = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  opts: CandleDrawOptions,
): void => {
  const { w, h, pad } = layout;
  const reveal = opts.chartReveal;

  // When fully in line mode, delegate entirely to drawLine (same path as
  // drawFrame) so transitions are visually identical to line mode.
  const fullLineMode = opts.lineModeProg >= 0.99;
  const lp = linePresence(opts, fullLineMode);

  // When reveal drives lp, force grey (loading squiggly color); when the
  // user's lineModeProg drives lp, use accent color.
  const colorBlend = lp > 0.001 ? opts.lineModeProg / lp : 1;

  if (opts.showGrid) {
    withAlpha(ctx, revealRamp(reveal, 0.25, 0.6), () =>
      drawGrid(ctx, layout, palette, opts.formatValue, opts.gridState, opts.dt),
    );
  }

  let linePts: Point[] | undefined;
  if (lp > 0.01 && opts.lineVisible.length >= 2) {
    const scrubX = opts.scrubAmount > 0.05 ? opts.hoverX : null;
    ctx.save();
    ctx.globalAlpha = lp;
    linePts = drawLine(
      ctx,
      layout,
      palette,
      opts.lineVisible,
      opts.lineSmoothValue,
      opts.now,
      opts.lineModeProg > 0.01,
      scrubX,
      opts.scrubAmount,
      reveal,
      opts.now_ms,
      colorBlend,
      !fullLineMode,
      opts.lineModeProg,
    );
    ctx.restore();
  }

  drawCloseLines(ctx, layout, palette, opts, lp, fullLineMode);
  drawCandleLayer(ctx, layout, palette, opts, lp);

  const lastPt = linePts?.at(-1);
  if (lastPt && lp > 0.5 && reveal > 0.3) {
    const dotAlpha = (lp - 0.5) * 2 * ((reveal - 0.3) / 0.7);
    const showPulse = lp > 0.8 && reveal > 0.6;
    withAlpha(ctx, dotAlpha, () =>
      drawDot(ctx, lastPt[0], lastPt[1], palette, showPulse, opts.scrubAmount, opts.now_ms),
    );
  }

  drawTimeAxisAt(ctx, layout, palette, revealRamp(reveal, 0.25, 0.6), {
    ...opts,
    windowSecs: opts.targetWindowSecs,
  });

  drawEdgeFade(ctx, pad.left, h);

  // Only when collapsing to empty state (not forward morph or loading),
  // matching line mode's `revealTarget === 0 && !cfg.loading` guard.
  if (opts.showEmptyOverlay) {
    const bgEmptyAlpha = (1 - opts.loadingAlpha) * (1 - reveal);
    if (bgEmptyAlpha > 0.01) {
      drawEmpty(ctx, w, h, pad, palette, bgEmptyAlpha, opts.now_ms, true, opts.emptyText);
    }
  }

  drawCandleFrameCrosshair(ctx, layout, palette, opts);
};
