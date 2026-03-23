"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LivelinePoint } from "liveline";
import { Liveline } from "liveline";

import { PriceEngine } from "@/lib/price-engine";
import {
  BLOCK_PRICE_HEIGHT,
  DEFAULT_BET,
  type Block,
  type GameState,
  calculateMultiplier,
  createInitialState,
  placeBlock,
  updateBlocks,
} from "@/lib/game-state";

/** Visible time window for Liveline (seconds) */
const CHART_WINDOW = 60;
/** Future zone as fraction of total width */
const FUTURE_RATIO = 0.35;
/** Grid cell width in seconds */
const GRID_CELL_SECONDS = 5;
/** Price padding above/below data range */
const PRICE_PAD_RATIO = 0.15;

type OverlayDims = {
  width: number;
  height: number;
  /** Left edge of chart area */
  left: number;
  /** Right edge of chart area (where Liveline data ends = "now") */
  nowX: number;
  /** Right edge of future zone */
  right: number;
  top: number;
  bottom: number;
  /** Time range */
  timeStart: number;
  timeEnd: number;
  /** Price range */
  priceMin: number;
  priceMax: number;
};

function timeToX(time: number, dims: OverlayDims): number {
  const frac = (time - dims.timeStart) / (dims.timeEnd - dims.timeStart);
  return dims.left + frac * (dims.right - dims.left);
}

function priceToY(price: number, dims: OverlayDims): number {
  const frac = (price - dims.priceMax) / (dims.priceMin - dims.priceMax);
  return dims.top + frac * (dims.bottom - dims.top);
}

function xToTime(x: number, dims: OverlayDims): number {
  const frac = (x - dims.left) / (dims.right - dims.left);
  return dims.timeStart + frac * (dims.timeEnd - dims.timeStart);
}

function yToPrice(y: number, dims: OverlayDims): number {
  const frac = (y - dims.top) / (dims.bottom - dims.top);
  return dims.priceMax + frac * (dims.priceMin - dims.priceMax);
}

function snapToGrid(
  price: number,
  time: number,
): { price: number; time: number } {
  const cellMs = GRID_CELL_SECONDS * 1000;
  const snappedTime = Math.round(time / cellMs) * cellMs;
  const snappedPrice =
    Math.round(price / BLOCK_PRICE_HEIGHT) * BLOCK_PRICE_HEIGHT;
  return { price: snappedPrice, time: snappedTime };
}

function computeDims(
  container: HTMLElement,
  now: number,
  priceMin: number,
  priceMax: number,
): OverlayDims {
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  // Match Liveline's internal padding (approximation)
  const padTop = 8;
  const padBottom = 28;
  const padLeft = 2;
  const padRight = width * FUTURE_RATIO;

  const chartWidth = width - padLeft - padRight;
  const timePerPx = CHART_WINDOW / chartWidth;
  const futureSeconds = padRight * timePerPx;

  const timeStart = now - CHART_WINDOW * 1000;
  const timeEnd = now + futureSeconds * 1000;

  return {
    width,
    height,
    left: padLeft,
    nowX: padLeft + chartWidth,
    right: width - 2,
    top: padTop,
    bottom: height - padBottom,
    timeStart,
    timeEnd,
    priceMin,
    priceMax,
  };
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  dims: OverlayDims,
  blocks: Block[],
  hover: { x: number; y: number } | null,
  currentPrice: number,
  balance: number,
) {
  const { width, height } = dims;
  ctx.clearRect(0, 0, width, height);

  // --- Future zone shading ---
  ctx.fillStyle = "rgba(236, 72, 153, 0.04)";
  ctx.fillRect(dims.nowX, dims.top, dims.right - dims.nowX, dims.bottom - dims.top);

  // --- "Now" dashed line ---
  ctx.strokeStyle = "rgba(236, 72, 153, 0.4)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(dims.nowX, dims.top);
  ctx.lineTo(dims.nowX, dims.bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Grid lines in future zone ---
  const now = (dims.timeStart + dims.timeEnd) / 2; // approximate
  const cellMs = GRID_CELL_SECONDS * 1000;
  const firstGridTime = Math.ceil(dims.timeStart / cellMs) * cellMs;

  ctx.strokeStyle = "rgba(236, 72, 153, 0.1)";
  ctx.lineWidth = 1;
  for (let t = firstGridTime; t <= dims.timeEnd; t += cellMs) {
    const x = timeToX(t, dims);
    if (x < dims.nowX - 2 || x > dims.right) continue;
    ctx.beginPath();
    ctx.moveTo(x, dims.top);
    ctx.lineTo(x, dims.bottom);
    ctx.stroke();
  }

  // Horizontal grid
  for (
    let p = Math.ceil(dims.priceMin / BLOCK_PRICE_HEIGHT) * BLOCK_PRICE_HEIGHT;
    p <= dims.priceMax;
    p += BLOCK_PRICE_HEIGHT
  ) {
    const y = priceToY(p, dims);
    if (y < dims.top || y > dims.bottom) continue;
    const startX = Math.max(dims.nowX - 2, dims.left);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(dims.right, y);
    ctx.stroke();
  }

  // --- Blocks ---
  for (const block of blocks) {
    drawBlock(ctx, dims, block);
  }

  // --- Hover preview ---
  if (hover) {
    const hPrice = yToPrice(hover.y, dims);
    const hTime = xToTime(hover.x, dims);
    const snapped = snapToGrid(hPrice, hTime);

    const isInFuture = snapped.time > Date.now() + 10000;
    const hasBalance = balance >= DEFAULT_BET;
    const isValid = isInFuture && hasBalance;

    const halfH = BLOCK_PRICE_HEIGHT / 2;
    const halfW = (GRID_CELL_SECONDS * 1000) / 2;

    const x1 = timeToX(snapped.time - halfW, dims);
    const x2 = timeToX(snapped.time + halfW, dims);
    const y1 = priceToY(snapped.price + halfH, dims);
    const y2 = priceToY(snapped.price - halfH, dims);

    ctx.fillStyle = isValid
      ? "rgba(250, 240, 50, 0.2)"
      : "rgba(248, 113, 113, 0.15)";
    ctx.strokeStyle = isValid
      ? "rgba(250, 240, 50, 0.5)"
      : "rgba(248, 113, 113, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);

    if (isValid) {
      const mult = calculateMultiplier(currentPrice, snapped.price);
      ctx.fillStyle = "rgba(250, 240, 50, 0.9)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `$${DEFAULT_BET} · ${mult.toFixed(1)}x`,
        (x1 + x2) / 2,
        (y1 + y2) / 2,
      );
    }
  }
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  dims: OverlayDims,
  block: Block,
) {
  const halfW = (GRID_CELL_SECONDS * 1000) / 2;

  const x1 = timeToX(block.targetTime - halfW, dims);
  const x2 = timeToX(block.targetTime + halfW, dims);
  const y1 = priceToY(block.priceTop, dims);
  const y2 = priceToY(block.priceBottom, dims);
  const w = x2 - x1;
  const h = y2 - y1;

  if (x2 < dims.left || x1 > dims.right) return;

  let fill: string, border: string, glow: string;
  switch (block.status) {
    case "active":
      fill = "rgba(250, 240, 50, 0.85)";
      border = "rgba(250, 240, 50, 1)";
      glow = "rgba(250, 240, 50, 0.4)";
      break;
    case "locked":
      fill = "rgba(250, 200, 50, 0.9)";
      border = "rgba(255, 180, 0, 1)";
      glow = "rgba(255, 180, 0, 0.5)";
      break;
    case "won":
      fill = "rgba(74, 222, 128, 0.9)";
      border = "rgba(74, 222, 128, 1)";
      glow = "rgba(74, 222, 128, 0.5)";
      break;
    case "lost":
      fill = "rgba(248, 113, 113, 0.6)";
      border = "rgba(248, 113, 113, 0.8)";
      glow = "rgba(248, 113, 113, 0.3)";
      break;
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
}

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PriceEngine | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const priceRangeRef = useRef({ min: 5192, max: 5208 });
  const animRef = useRef<number>(0);

  const [chartData, setChartData] = useState<LivelinePoint[]>([]);
  const [liveValue, setLiveValue] = useState(5200);
  const [balance, setBalance] = useState(1000);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);

  // Initialize price engine
  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;

    engine.subscribe((point) => {
      setLiveValue(point.price);

      // Convert history to Liveline format
      const history = engine.getHistory();
      const llData: LivelinePoint[] = history.map((p) => ({
        time: p.time / 1000, // Liveline uses unix seconds
        value: p.price,
      }));
      setChartData(llData);

      // Track visible price range for overlay coordinate mapping
      const visibleStart = Date.now() - CHART_WINDOW * 1000;
      const visible = history.filter((p) => p.time >= visibleStart);
      if (visible.length > 0) {
        let min = Infinity,
          max = -Infinity;
        for (const p of visible) {
          if (p.price < min) min = p.price;
          if (p.price > max) max = p.price;
        }
        const range = max - min || 1;
        const pad = range * PRICE_PAD_RATIO;
        priceRangeRef.current = { min: min - pad, max: max + pad };
      }
    });

    engine.start();
    return () => engine.stop();
  }, []);

  // Overlay render loop
  useEffect(() => {
    const render = () => {
      const canvas = overlayRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);

      const now = Date.now();
      const price = engineRef.current?.getCurrentPrice() ?? liveValue;
      const { min, max } = priceRangeRef.current;

      // Update game state
      stateRef.current = updateBlocks(stateRef.current, price, now);
      setBalance(stateRef.current.balance);
      setWins(stateRef.current.totalWins);
      setLosses(stateRef.current.totalLosses);

      const dims = computeDims(container, now, min, max);

      drawOverlay(
        ctx,
        dims,
        stateRef.current.blocks,
        hoverRef.current,
        price,
        stateRef.current.balance,
      );

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [liveValue]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = Date.now();
      const { min, max } = priceRangeRef.current;
      const dims = computeDims(container, now, min, max);
      const price = engineRef.current?.getCurrentPrice() ?? liveValue;

      const clickPrice = yToPrice(y, dims);
      const clickTime = xToTime(x, dims);
      const snapped = snapToGrid(clickPrice, clickTime);

      stateRef.current = placeBlock(
        stateRef.current,
        price,
        snapped.price,
        snapped.time,
      );
    },
    [liveValue],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      hoverRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const now = Date.now();
      const { min, max } = priceRangeRef.current;
      const dims = computeDims(container, now, min, max);
      const price = engineRef.current?.getCurrentPrice() ?? liveValue;

      const clickPrice = yToPrice(y, dims);
      const clickTime = xToTime(x, dims);
      const snapped = snapToGrid(clickPrice, clickTime);

      stateRef.current = placeBlock(
        stateRef.current,
        price,
        snapped.price,
        snapped.time,
      );
    },
    [liveValue],
  );

  // Compute right padding for Liveline to leave space for future zone
  const [rightPad, setRightPad] = useState(200);
  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (el) setRightPad(Math.round(el.getBoundingClientRect().width * FUTURE_RATIO));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-pink-400">
            block
          </h1>
          <p className="text-xs text-white/40">S&P 500 SIM</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <div className="text-xs text-white/40">PRICE</div>
            <div className="font-mono font-bold tabular-nums">
              {liveValue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="relative flex-1 min-h-0">
        {/* Liveline background chart */}
        <div className="absolute inset-0">
          <Liveline
            data={chartData}
            value={liveValue}
            window={CHART_WINDOW}
            theme="dark"
            color="#ec4899"
            grid={true}
            badge={false}
            scrub={false}
            showValue={false}
            fill={true}
            momentum={true}
            pulse={true}
            lineWidth={2}
            formatValue={(v: number) => v.toFixed(2)}
            padding={{ top: 8, right: rightPad, bottom: 28, left: 2 }}
          />
        </div>

        {/* Overlay canvas for blocks, grid, interactions */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 z-10 h-full w-full cursor-crosshair"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-pink-500/20 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-yellow-300 shadow-[0_0_6px_rgba(250,240,50,0.6)]" />
          <span className="text-xs text-white/40">${DEFAULT_BET}/block</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-xs text-green-400">{wins}W</span>
          <span className="text-xs text-red-400">{losses}L</span>
          <div className="font-mono font-bold text-lg tabular-nums">
            ${balance.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
