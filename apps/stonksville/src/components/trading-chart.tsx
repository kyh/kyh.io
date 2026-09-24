"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LivelinePoint } from "@/lib/liveline/types";
import { Liveline } from "@/lib/liveline/liveline";
import { getDpr } from "@/lib/liveline/canvas/dpr";
import { lerp } from "@/lib/liveline/math/lerp";

import { textBalloons } from "balloons-js";

import { fireConfetti } from "@/lib/confetti";
import { ReplayEngine } from "@/lib/price-engine";
import {
  DEFAULT_BET,
  GRID_CELL_SECONDS,
  INITIAL_BALANCE,
  MIN_FUTURE_SECONDS,
  calculateMultiplier,
  createInitialState,
  levelToPrice,
  placeBlock,
  priceToLevel,
  updateBlocks,
} from "@/lib/game-state";
import type { Block } from "@/lib/game-state";
import { findBarIndex, formatTradingDate, loadSpxHistory } from "@/lib/spx-data";
import type { DailyBar } from "@/lib/spx-data";

/** Visible time window for Liveline (seconds) */
const CHART_WINDOW = 60;
/** Future zone as fraction of total width */
const FUTURE_RATIO_MOBILE = 0.5;
const FUTURE_RATIO_DESKTOP = 0.35;
const MOBILE_BREAKPOINT = 768;

const mobileQuery =
  typeof window === "undefined" ? null : window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

const getFutureRatio = (): number =>
  mobileQuery?.matches ? FUTURE_RATIO_MOBILE : FUTURE_RATIO_DESKTOP;
/** Half a grid cell in ms */
const HALF_CELL_MS = (GRID_CELL_SECONDS * 1000) / 2;
/**
 * Rows always kept visible above and below the current price so bets have
 * room. The range grows past this to fit whatever history is on screen —
 * nothing is clipped, a 20% day just makes the rows shorter for a while.
 */
const MIN_HALF_ROWS = 10;
/** Breathing room added above and below the fitted range, in rows */
const RANGE_MARGIN_ROWS = 1;

interface LevelRange {
  min: number;
  max: number;
}

/** Vertical range that fits every tick in the visible window plus the minimum room around the current price */
const fitRange = (
  history: readonly { time: number; price: number }[],
  now: number,
  currentLevel: number,
): LevelRange => {
  let min = currentLevel - MIN_HALF_ROWS;
  let max = currentLevel + MIN_HALF_ROWS;
  const windowStart = now - CHART_WINDOW * 1000;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const p = history[i];
    if (p.time < windowStart) {
      break;
    }
    const level = priceToLevel(p.price);
    if (level < min) {
      min = level;
    }
    if (level > max) {
      max = level;
    }
  }
  return { max: max + RANGE_MARGIN_ROWS, min: min - RANGE_MARGIN_ROWS };
};
/** Half block height in grid rows */
const HALF_BLOCK_H = 0.5;
/** Grid cells of history the chart shows before the first live tick */
const HISTORY_DAYS = CHART_WINDOW / GRID_CELL_SECONDS;
/** Leave at least this many trading days to play from a random start (~4 years) */
const MIN_RUNWAY_DAYS = 1000;

const formatPrice = (price: number): string => (price >= 100 ? price.toFixed(0) : price.toFixed(2));

/** `?from=YYYY-MM-DD` picks the first trading day; otherwise a random one with runway left */
const resolveStartIndex = (bars: DailyBar[]): number => {
  const from = new URLSearchParams(window.location.search).get("from");
  const requested = from ? findBarIndex(bars, from) : null;
  if (requested !== null) {
    return Math.max(requested, HISTORY_DAYS);
  }
  const last = Math.max(HISTORY_DAYS, bars.length - MIN_RUNWAY_DAYS);
  return HISTORY_DAYS + Math.floor(Math.random() * (last - HISTORY_DAYS + 1));
};

type FeedStatus = "loading" | "live" | "error";

interface OverlayDims {
  width: number;
  height: number;
  left: number;
  nowX: number;
  right: number;
  top: number;
  bottom: number;
  timeStart: number;
  timeEnd: number;
  levelMin: number;
  levelMax: number;
}

const timeToX = (time: number, dims: OverlayDims): number => {
  const frac = (time - dims.timeStart) / (dims.timeEnd - dims.timeStart);
  return dims.left + frac * (dims.right - dims.left);
};

const levelToY = (level: number, dims: OverlayDims): number => {
  const frac = (level - dims.levelMax) / (dims.levelMin - dims.levelMax);
  return dims.top + frac * (dims.bottom - dims.top);
};

const xToTime = (x: number, dims: OverlayDims): number => {
  const frac = (x - dims.left) / (dims.right - dims.left);
  return dims.timeStart + frac * (dims.timeEnd - dims.timeStart);
};

const yToLevel = (y: number, dims: OverlayDims): number => {
  const frac = (y - dims.top) / (dims.bottom - dims.top);
  return dims.levelMax + frac * (dims.levelMin - dims.levelMax);
};

const snapToGrid = (level: number, time: number) => {
  const cellMs = GRID_CELL_SECONDS * 1000;
  return { level: Math.round(level), time: Math.round(time / cellMs) * cellMs };
};

const computeDims = (
  width: number,
  height: number,
  now: number,
  levelMin: number,
  levelMax: number,
  futureRatio: number,
): OverlayDims => {
  const padTop = 0;
  const padBottom = 28;
  const padLeft = 2;
  const padRight = width * futureRatio;

  const chartWidth = width - padLeft - padRight;
  const timePerPx = CHART_WINDOW / chartWidth;
  const futureSeconds = padRight * timePerPx;

  return {
    bottom: height - padBottom,
    height,
    left: padLeft,
    levelMax,
    levelMin,
    nowX: padLeft + chartWidth,
    right: width - 2,
    timeEnd: now + futureSeconds * 1000,
    timeStart: now - CHART_WINDOW * 1000,
    top: padTop,
    width,
  };
};

interface HoverState {
  x: number;
  y: number;
  currentPrice: number;
  balance: number;
}

const drawBlock = (ctx: CanvasRenderingContext2D, dims: OverlayDims, block: Block) => {
  const x1 = timeToX(block.targetTime - HALF_CELL_MS, dims);
  const x2 = timeToX(block.targetTime + HALF_CELL_MS, dims);
  const y1 = levelToY(block.level + HALF_BLOCK_H, dims);
  const y2 = levelToY(block.level - HALF_BLOCK_H, dims);
  const w = x2 - x1;
  const h = y2 - y1;

  if (x2 < dims.left || x1 > dims.right) {
    return;
  }

  // Fade out resolved blocks over 1s
  let alpha = 1;
  if (block.resolvedAt !== null) {
    const elapsed = Date.now() - block.resolvedAt;
    alpha = Math.max(0, 1 - elapsed / 1000);
    if (alpha <= 0) {
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  let border: string;
  let fill: string;
  let glow: string;
  if (block.touched || block.status === "won") {
    fill = "rgba(74, 222, 128, 0.9)";
    border = "rgba(74, 222, 128, 1)";
    glow = "rgba(74, 222, 128, 0.5)";
  } else if (block.status === "lost") {
    fill = "rgba(248, 113, 113, 0.6)";
    border = "rgba(248, 113, 113, 0.8)";
    glow = "rgba(248, 113, 113, 0.3)";
  } else if (block.status === "locked") {
    fill = "rgba(250, 200, 50, 0.9)";
    border = "rgba(255, 180, 0, 1)";
    glow = "rgba(255, 180, 0, 0.5)";
  } else {
    fill = "rgba(250, 240, 50, 0.85)";
    border = "rgba(250, 240, 50, 1)";
    glow = "rgba(250, 240, 50, 0.4)";
  }

  ctx.shadowColor = glow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = fill;
  ctx.fillRect(x1, y1, w, h);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x1, y1, w, h);

  const cx = x1 + w / 2;
  const cy = y1 + h / 2;
  ctx.fillStyle = block.status === "lost" ? "#fff" : "#000";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`$${block.amount}`, cx, cy - 7);
  ctx.font = "10px monospace";
  ctx.fillText(`${block.multiplier.toFixed(1)}x`, cx, cy + 7);

  ctx.restore();
};

const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  dims: OverlayDims,
  blocks: Block[],
  hover: HoverState | null,
) => {
  ctx.clearRect(0, 0, dims.width, dims.height);

  // "Now" dashed line
  ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(dims.nowX, dims.top);
  ctx.lineTo(dims.nowX, dims.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Grid lines in future zone — offset by half-cell so lines sit at block edges
  const cellMs = GRID_CELL_SECONDS * 1000;
  const firstGridTime = Math.ceil((dims.timeStart - HALF_CELL_MS) / cellMs) * cellMs + HALF_CELL_MS;

  ctx.strokeStyle = "rgba(52, 211, 153, 0.2)";
  ctx.lineWidth = 1;
  for (let t = firstGridTime; t <= dims.timeEnd; t += cellMs) {
    const x = timeToX(t, dims);
    if (x < dims.nowX - 2 || x > dims.right) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(x, dims.top);
    ctx.lineTo(x, dims.height);
    ctx.stroke();
  }

  // Horizontal grid — offset by half so lines sit at block edges
  const pxPerLevel = (dims.bottom - dims.top) / (dims.levelMax - dims.levelMin);
  const extraLevels = pxPerLevel > 0 ? (dims.height - dims.bottom) / pxPerLevel : 0;
  const gridLevelMin = dims.levelMin - extraLevels;

  const firstGridLevel = Math.ceil(gridLevelMin - HALF_BLOCK_H) + HALF_BLOCK_H;

  ctx.strokeStyle = "rgba(52, 211, 153, 0.2)";
  for (let level = firstGridLevel; level <= dims.levelMax; level += 1) {
    const y = levelToY(level, dims);
    if (y < dims.top || y > dims.height) {
      continue;
    }
    const startX = Math.max(dims.nowX - 2, dims.left);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(dims.right, y);
    ctx.stroke();
  }

  // Blocks
  for (const block of blocks) {
    drawBlock(ctx, dims, block);
  }

  // Hover preview
  if (hover) {
    const snapped = snapToGrid(yToLevel(hover.y, dims), xToTime(hover.x, dims));

    const isInFuture = snapped.time > Date.now() + MIN_FUTURE_SECONDS * 1000;
    const isValid = isInFuture && hover.balance >= DEFAULT_BET;

    const x1 = timeToX(snapped.time - HALF_CELL_MS, dims);
    const x2 = timeToX(snapped.time + HALF_CELL_MS, dims);
    const y1 = levelToY(snapped.level + HALF_BLOCK_H, dims);
    const y2 = levelToY(snapped.level - HALF_BLOCK_H, dims);

    ctx.fillStyle = isValid ? "rgba(250, 240, 50, 0.2)" : "rgba(248, 113, 113, 0.15)";
    ctx.strokeStyle = isValid ? "rgba(250, 240, 50, 0.5)" : "rgba(248, 113, 113, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);

    if (isValid) {
      const mult = calculateMultiplier(hover.currentPrice, levelToPrice(snapped.level));
      ctx.fillStyle = "rgba(250, 240, 50, 0.9)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`$${DEFAULT_BET} · ${mult.toFixed(1)}x`, (x1 + x2) / 2, (y1 + y2) / 2);
    }
  }
};

export const TradingChart = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const confettiLayerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReplayEngine | null>(null);
  const stateRef = useRef(createInitialState());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const lastPlacedCellRef = useRef<string | null>(null);
  const rangeRef = useRef<LevelRange>({ max: MIN_HALF_ROWS, min: -MIN_HALF_ROWS });
  const targetRangeRef = useRef<LevelRange>({ max: MIN_HALF_ROWS, min: -MIN_HALF_ROWS });
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ height: 0, width: 0 });
  const prevUIRef = useRef({
    balance: INITIAL_BALANCE,
    blockCount: 0,
    totalLosses: 0,
    totalWins: 0,
  });

  const [feed, setFeed] = useState<FeedStatus>("loading");
  const [chartData, setChartData] = useState<LivelinePoint[]>([]);
  const [livePrice, setLivePrice] = useState(0);
  const [tradingDate, setTradingDate] = useState<number | null>(null);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [rightPad, setRightPad] = useState(200);
  const [levelRange, setLevelRange] = useState<LevelRange>({
    max: MIN_HALF_ROWS,
    min: -MIN_HALF_ROWS,
  });

  // ResizeObserver for sizeRef and rightPad
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        const { width, height } = entry.contentRect;
        sizeRef.current = { height, width };
        setRightPad(Math.round(width * getFutureRatio()) || 200);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Load S&P history, then replay it — subscribe updates state + refs
  useEffect(() => {
    const controller = new AbortController();
    let engine: ReplayEngine | null = null;
    let unsubscribe: (() => void) | null = null;

    const run = async () => {
      let bars: DailyBar[];
      try {
        bars = await loadSpxHistory(controller.signal);
      } catch {
        if (!controller.signal.aborted) {
          setFeed("error");
        }
        return;
      }
      if (controller.signal.aborted) {
        return;
      }

      const replay = new ReplayEngine(bars, resolveStartIndex(bars), {
        dayMs: GRID_CELL_SECONDS * 1000,
        historySeconds: CHART_WINDOW,
      });
      engine = replay;
      engineRef.current = replay;

      unsubscribe = replay.subscribe((point) => {
        setLivePrice(point.price);
        setTradingDate(replay.getCurrentBar().date);

        // Update game state on each tick (10/sec) instead of every rAF frame (60/sec)
        const history = replay.getHistoryRaw();
        const now = Date.now();
        stateRef.current = updateBlocks(stateRef.current, point.price, now, history);
        targetRangeRef.current = fitRange(history, now, priceToLevel(point.price));

        setChartData(history.map((p) => ({ time: p.time / 1000, value: priceToLevel(p.price) })));
      });

      replay.start();
      const startRange = fitRange(
        replay.getHistoryRaw(),
        Date.now(),
        priceToLevel(replay.getCurrentPrice()),
      );
      rangeRef.current = startRange;
      targetRangeRef.current = startRange;
      setLivePrice(replay.getCurrentPrice());
      setTradingDate(replay.getCurrentBar().date);
      setFeed("live");
    };
    run();

    return () => {
      controller.abort();
      unsubscribe?.();
      engine?.stop();
      engineRef.current = null;
    };
  }, []);

  // Overlay render loop — drawing only, no state mutation
  useEffect(() => {
    let lastTime = 0;

    const render = (timestamp: number) => {
      const canvas = overlayRef.current;
      const { width, height } = sizeRef.current;

      if (!canvas || width === 0) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dt = lastTime > 0 ? timestamp - lastTime : 16.67;
      lastTime = timestamp;

      const dpr = getDpr();
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animRef.current = requestAnimationFrame(render);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const now = Date.now();
      const price = engineRef.current?.getCurrentPrice() ?? 0;

      // Frame-rate-independent lerp for smooth grid panning and zooming
      const target = targetRangeRef.current;
      const min = lerp(rangeRef.current.min, target.min, 0.04, dt);
      const max = lerp(rangeRef.current.max, target.max, 0.04, dt);
      rangeRef.current = { max, min };
      setLevelRange((prev) => (prev.min === min && prev.max === max ? prev : { max, min }));

      const next = stateRef.current;

      // Sync UI state from ref when changed
      const ui = prevUIRef.current;
      if (next.balance !== ui.balance) {
        ui.balance = next.balance;
        setBalance(next.balance);
      }
      if (next.totalWins !== ui.totalWins) {
        ui.totalWins = next.totalWins;
        setWins(next.totalWins);
      }
      if (next.totalLosses !== ui.totalLosses) {
        ui.totalLosses = next.totalLosses;
        setLosses(next.totalLosses);
      }
      if (next.blocks.length !== ui.blockCount) {
        ui.blockCount = next.blocks.length;
        setBlockCount(next.blocks.length);
      }

      const dims = computeDims(width, height, now, min, max, getFutureRatio());

      const hover = hoverRef.current;
      drawOverlay(
        ctx,
        dims,
        next.blocks,
        hover ? { ...hover, balance: next.balance, currentPrice: price } : null,
      );

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Track previous block states for touch detection (balloon/confetti effects)
  const prevBlocksRef = useRef<Block[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      const next = stateRef.current;
      const prev = prevBlocksRef.current;
      if (next.blocks === prev) {
        return;
      }

      const prevById = new Map(prev.map((b) => [b.id, b]));
      const confettiLayer = confettiLayerRef.current;
      const { width, height } = sizeRef.current;
      const range = rangeRef.current;
      const dims = computeDims(width, height, Date.now(), range.min, range.max, getFutureRatio());

      for (const b of next.blocks) {
        if (b.touched && !prevById.get(b.id)?.touched) {
          const count = 3 + Math.floor(Math.random() * 5);
          textBalloons([
            {
              color: "#000000",
              fontSize: 80 + Math.floor(Math.random() * 60),
              text: "💸".repeat(count),
            },
          ]);
          if (confettiLayer) {
            fireConfetti(timeToX(b.targetTime, dims), levelToY(b.level, dims), {
              decay: 0.94,
              emojis: ["💰"],
              gravity: 0.4,
              parent: confettiLayer,
              particleCount: 12,
              size: 0.7,
              spread: 360,
              startVelocity: 8,
            });
          }
        }
      }

      prevBlocksRef.current = next.blocks;
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const getClickDims = useCallback(() => {
    const { width, height } = sizeRef.current;
    const now = Date.now();
    const range = rangeRef.current;
    return computeDims(width, height, now, range.min, range.max, getFutureRatio());
  }, []);

  const tryPlaceAt = useCallback(
    (x: number, y: number) => {
      const engine = engineRef.current;
      if (!engine) {
        return;
      }
      const dims = getClickDims();
      const snapped = snapToGrid(yToLevel(y, dims), xToTime(x, dims));
      const cellKey = `${snapped.level}:${snapped.time}`;
      if (cellKey === lastPlacedCellRef.current) {
        return;
      }
      lastPlacedCellRef.current = cellKey;
      const prev = stateRef.current;
      stateRef.current = placeBlock(prev, engine.getCurrentPrice(), snapped.level, snapped.time);
      if (stateRef.current !== prev) {
        const confettiLayer = confettiLayerRef.current;
        if (confettiLayer) {
          fireConfetti(timeToX(snapped.time, dims), levelToY(snapped.level, dims), {
            parent: confettiLayer,
            particleCount: 20,
            size: 0.6,
          });
        }
      }
    },
    [getClickDims],
  );

  // setPointerCapture retargets subsequent events to this element;
  // offsetX/offsetY remain relative to the capture target's padding box.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      lastPlacedCellRef.current = null;
      tryPlaceAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    },
    [tryPlaceAt],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;
      hoverRef.current = { x, y };
      if (draggingRef.current) {
        tryPlaceAt(x, y);
      }
    },
    [tryPlaceAt],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    lastPlacedCellRef.current = null;
    if (e.pointerType !== "mouse") {
      hoverRef.current = null;
    }
  }, []);

  const resetPointerState = useCallback(() => {
    hoverRef.current = null;
    draggingRef.current = false;
    lastPlacedCellRef.current = null;
  }, []);

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      resetPointerState();
    },
    [resetPointerState],
  );

  const handleReset = useCallback(() => {
    stateRef.current = createInitialState();
    prevUIRef.current = {
      balance: INITIAL_BALANCE,
      blockCount: 0,
      totalLosses: 0,
      totalWins: 0,
    };
    setBalance(INITIAL_BALANCE);
    setWins(0);
    setLosses(0);
    setBlockCount(0);
  }, []);

  const isBusted = balance < DEFAULT_BET && blockCount === 0;

  const { min: rangeMin, max: rangeMax } = levelRange;

  const formatAxisDate = useCallback((t: number) => {
    const engine = engineRef.current;
    return engine ? formatTradingDate(engine.barAt(t * 1000).date, "short") : "";
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Grid + blocks canvas (behind chart line) */}
      <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />

      {/* Chart line */}
      <div className="absolute inset-0 z-10">
        <Liveline
          data={chartData}
          value={priceToLevel(livePrice || 1)}
          loading={feed === "loading"}
          emptyText=""
          window={CHART_WINDOW}
          theme="dark"
          color="#34d399"
          grid={true}
          badge={false}
          scrub={false}
          showValue={false}
          fill={true}
          momentum={true}
          pulse={true}
          lineWidth={2}
          minValue={rangeMin}
          maxValue={rangeMax}
          formatValue={(v: number) => formatPrice(levelToPrice(v))}
          formatTime={formatAxisDate}
          padding={{ bottom: 28, left: 2, right: rightPad, top: 0 }}
        />
      </div>

      {/* Click capture (on top) */}
      <div
        className="absolute inset-0 z-20 cursor-crosshair"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={resetPointerState}
      />

      {/* Confetti layer — inside the container so coordinates are chart-local */}
      <div
        ref={confettiLayerRef}
        className="pointer-events-none absolute inset-0 z-25 overflow-hidden"
      />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 left-3 z-30 flex items-center gap-2 font-mono text-sm">
        <span className="text-emerald-400/60">S&amp;P 500</span>
        {tradingDate !== null && (
          <span className="text-white/60 tabular-nums">{formatTradingDate(tradingDate)}</span>
        )}
      </div>
      <div className="pointer-events-none absolute top-3 right-3 z-30 flex items-center gap-3 font-mono text-sm">
        <span className="text-emerald-400/60 tabular-nums">{livePrice.toFixed(2)}</span>
        <span className="text-emerald-300/50">{wins}W</span>
        <span className="text-red-400/50">{losses}L</span>
        <span className="font-bold tabular-nums">${balance.toFixed(0)}</span>
      </div>

      {feed === "error" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <p className="font-mono text-sm text-red-400">Couldn&apos;t load S&amp;P 500 history.</p>
        </div>
      )}

      {isBusted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <p className="mb-3 text-lg font-bold text-red-400">Busted!</p>
            <button
              type="button"
              onClick={handleReset}
              className="pointer-events-auto rounded bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-400"
            >
              Play Again ($1,000)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
