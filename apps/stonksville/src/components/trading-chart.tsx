"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LivelinePoint } from "liveline";
import { Liveline } from "liveline";

import { textBalloons } from "balloons-js";

import { fireConfetti } from "@/lib/confetti";
import { PriceEngine } from "@/lib/price-engine";
import {
  BLOCK_PRICE_HEIGHT,
  DEFAULT_BET,
  GRID_CELL_SECONDS,
  INITIAL_BALANCE,
  MIN_FUTURE_SECONDS,
  type Block,
  calculateMultiplier,
  createInitialState,
  placeBlock,
  updateBlocks,
} from "@/lib/game-state";

/** Visible time window for Liveline (seconds) */
const CHART_WINDOW = 60;
/** Future zone as fraction of total width */
const FUTURE_RATIO = 0.35;
/** Price padding above/below data range */
const PRICE_PAD_RATIO = 0.15;

type OverlayDims = {
  width: number;
  height: number;
  left: number;
  nowX: number;
  right: number;
  top: number;
  bottom: number;
  timeStart: number;
  timeEnd: number;
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
  width: number,
  height: number,
  now: number,
  priceMin: number,
  priceMax: number,
): OverlayDims {
  const padTop = 0;
  const padBottom = 28;
  const padLeft = 2;
  const padRight = width * FUTURE_RATIO;

  const chartWidth = width - padLeft - padRight;
  const timePerPx = CHART_WINDOW / chartWidth;
  const futureSeconds = padRight * timePerPx;

  return {
    width,
    height,
    left: padLeft,
    nowX: padLeft + chartWidth,
    right: width - 2,
    top: padTop,
    bottom: height - padBottom,
    timeStart: now - CHART_WINDOW * 1000,
    timeEnd: now + futureSeconds * 1000,
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
  const halfCellMs = cellMs / 2;
  const firstGridTime =
    Math.ceil((dims.timeStart - halfCellMs) / cellMs) * cellMs + halfCellMs;

  ctx.strokeStyle = "rgba(52, 211, 153, 0.2)";
  ctx.lineWidth = 1;
  for (let t = firstGridTime; t <= dims.timeEnd; t += cellMs) {
    const x = timeToX(t, dims);
    if (x < dims.nowX - 2 || x > dims.right) continue;
    ctx.beginPath();
    ctx.moveTo(x, dims.top);
    ctx.lineTo(x, dims.height);
    ctx.stroke();
  }

  // Horizontal grid — offset by half so lines sit at block edges
  // Extend beyond priceMin/priceMax so lines cover the full canvas height
  const halfPH = BLOCK_PRICE_HEIGHT / 2;
  const pxPerPrice = (dims.bottom - dims.top) / (dims.priceMax - dims.priceMin);
  const extraPrice = pxPerPrice > 0 ? (dims.height - dims.bottom) / pxPerPrice : 0;
  const gridPriceMin = dims.priceMin - extraPrice;

  const firstGridPrice =
    Math.ceil((gridPriceMin - halfPH) / BLOCK_PRICE_HEIGHT) *
      BLOCK_PRICE_HEIGHT +
    halfPH;

  ctx.strokeStyle = "rgba(52, 211, 153, 0.2)";
  for (let p = firstGridPrice; p <= dims.priceMax; p += BLOCK_PRICE_HEIGHT) {
    const y = priceToY(p, dims);
    if (y < dims.top || y > dims.height) continue;
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
    const hPrice = yToPrice(hover.y, dims);
    const hTime = xToTime(hover.x, dims);
    const snapped = snapToGrid(hPrice, hTime);

    const isInFuture = snapped.time > Date.now() + MIN_FUTURE_SECONDS * 1000;
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

  // Fade out resolved blocks over 1.5s
  let alpha = 1;
  if (block.resolvedAt !== null) {
    const elapsed = Date.now() - block.resolvedAt;
    alpha = Math.max(0, 1 - elapsed / 1000);
    if (alpha <= 0) return;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  let fill: string, border: string, glow: string;
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
}

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PriceEngine | null>(null);
  const stateRef = useRef(createInitialState());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const lastPlacedCellRef = useRef<string | null>(null);
  const priceRangeRef = useRef({ min: 5185, max: 5215 });
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const liveValueRef = useRef(5200);
  const prevUIRef = useRef({ balance: 1000, wins: 0, losses: 0, blockCount: 0 });

  const [chartData, setChartData] = useState<LivelinePoint[]>([]);
  const [liveValue, setLiveValue] = useState(5200);
  const [balance, setBalance] = useState(1000);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [rightPad, setRightPad] = useState(200);

  // Single ResizeObserver for both sizeRef and rightPad
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        sizeRef.current = { width, height };
        setRightPad(Math.round(width * FUTURE_RATIO) || 200);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize price engine
  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;

    engine.subscribe((point) => {
      liveValueRef.current = point.price;
      setLiveValue(point.price);

      const history = engine.getHistoryRaw();
      const llData: LivelinePoint[] = [];
      for (let i = 0; i < history.length; i++) {
        const p = history[i]!;
        llData.push({ time: p.time / 1000, value: p.price });
      }
      setChartData(llData);

      const visibleStart = Date.now() - CHART_WINDOW * 1000;
      let min = Infinity,
        max = -Infinity;
      for (let i = history.length - 1; i >= 0; i--) {
        const p = history[i]!;
        if (p.time < visibleStart) break;
        if (p.price < min) min = p.price;
        if (p.price > max) max = p.price;
      }
      if (min !== Infinity) {
        const range = max - min || 1;
        const pad = range * PRICE_PAD_RATIO;
        priceRangeRef.current = { min: min - pad, max: max + pad };
      }
    });

    engine.start();
    return () => engine.stop();
  }, []);

  // Overlay render loop — reads from refs only, no state deps
  useEffect(() => {
    const render = () => {
      const canvas = overlayRef.current;
      const { width, height } = sizeRef.current;

      if (!canvas || width === 0) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const now = Date.now();
      const price = engineRef.current?.getCurrentPrice() ?? liveValueRef.current;
      const { min, max } = priceRangeRef.current;

      const prev = stateRef.current;
      stateRef.current = updateBlocks(prev, price, now);
      const next = stateRef.current;

      // Only push to React state when values changed
      const ui = prevUIRef.current;
      if (next.balance !== ui.balance) {
        ui.balance = next.balance;
        setBalance(next.balance);
      }
      if (next.totalWins !== ui.wins) {
        ui.wins = next.totalWins;
        setWins(next.totalWins);
      }
      if (next.totalLosses !== ui.losses) {
        ui.losses = next.totalLosses;
        setLosses(next.totalLosses);
      }
      if (next.blocks.length !== ui.blockCount) {
        ui.blockCount = next.blocks.length;
        setBlockCount(next.blocks.length);
      }

      const dims = computeDims(width, height, now, min, max);

      // Fire balloons + emoji confetti when a block gets touched
      const container = containerRef.current;
      for (let i = 0; i < next.blocks.length; i++) {
        const b = next.blocks[i]!;
        if (b.touched && !prev.blocks[i]?.touched) {
          const count = 3 + Math.floor(Math.random() * 5);
          textBalloons([
            {
              text: "💸".repeat(count),
              fontSize: 80 + Math.floor(Math.random() * 60),
              color: "#000000",
            },
          ]);
          if (container) {
            const rect = container.getBoundingClientRect();
            const bx = rect.left + timeToX(b.targetTime, dims);
            const by = rect.top + priceToY(b.priceLevel, dims);
            fireConfetti(bx, by, {
              particleCount: 12,
              startVelocity: 8,
              spread: 360,
              decay: 0.94,
              gravity: 0.4,
              size: 0.7,
              emojis: ["💰"],
            });
          }
        }
      }

      drawOverlay(
        ctx,
        dims,
        next.blocks,
        hoverRef.current,
        price,
        next.balance,
      );

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const getClickDims = useCallback(() => {
    const { width, height } = sizeRef.current;
    const now = Date.now();
    const { min, max } = priceRangeRef.current;
    return computeDims(width, height, now, min, max);
  }, []);

  const tryPlaceAt = useCallback(
    (x: number, y: number) => {
      const dims = getClickDims();
      const price = engineRef.current?.getCurrentPrice() ?? liveValueRef.current;
      const snapped = snapToGrid(yToPrice(y, dims), xToTime(x, dims));
      const cellKey = `${snapped.price}:${snapped.time}`;
      if (cellKey === lastPlacedCellRef.current) return;
      lastPlacedCellRef.current = cellKey;
      const prev = stateRef.current;
      stateRef.current = placeBlock(prev, price, snapped.price, snapped.time);
      // Fire confetti if a block was actually placed
      if (stateRef.current !== prev) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const screenX = rect.left + timeToX(snapped.time, dims);
          const screenY = rect.top + priceToY(snapped.price, dims);
          fireConfetti(screenX, screenY, { particleCount: 20, size: 0.6 });
        }
      }
    },
    [getClickDims],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      draggingRef.current = true;
      lastPlacedCellRef.current = null;
      const rect = container.getBoundingClientRect();
      tryPlaceAt(e.clientX - rect.left, e.clientY - rect.top);
    },
    [tryPlaceAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      hoverRef.current = { x, y };
      if (draggingRef.current) {
        tryPlaceAt(x, y);
      }
    },
    [tryPlaceAt],
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    lastPlacedCellRef.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverRef.current = null;
    draggingRef.current = false;
    lastPlacedCellRef.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const touch = e.touches[0];
      if (!touch) return;
      draggingRef.current = true;
      lastPlacedCellRef.current = null;
      const rect = container.getBoundingClientRect();
      tryPlaceAt(touch.clientX - rect.left, touch.clientY - rect.top);
    },
    [tryPlaceAt],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const touch = e.touches[0];
      if (!touch) return;
      const rect = container.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      hoverRef.current = { x, y };
      if (draggingRef.current) {
        tryPlaceAt(x, y);
      }
    },
    [tryPlaceAt],
  );

  const handleTouchEnd = useCallback(() => {
    hoverRef.current = null;
    draggingRef.current = false;
    lastPlacedCellRef.current = null;
  }, []);

  const handleReset = useCallback(() => {
    stateRef.current = createInitialState();
    prevUIRef.current = { balance: INITIAL_BALANCE, wins: 0, losses: 0, blockCount: 0 };
    setBalance(INITIAL_BALANCE);
    setWins(0);
    setLosses(0);
    setBlockCount(0);
  }, []);

  const isBusted = balance < DEFAULT_BET && blockCount === 0;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <div className="absolute inset-0">
        <Liveline
          data={chartData}
          value={liveValue}
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
          formatValue={(v: number) => v.toFixed(2)}
          padding={{ top: 0, right: rightPad, bottom: 28, left: 2 }}
        />
      </div>

      <canvas
        ref={overlayRef}
        className="absolute inset-0 z-10 h-full w-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* HUD */}
      <div className="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-3 font-mono text-sm">
        <span className="text-emerald-400/60">{liveValue.toFixed(2)}</span>
        <span className="text-emerald-300/50">{wins}W</span>
        <span className="text-red-400/50">{losses}L</span>
        <span className="font-bold tabular-nums">${balance.toFixed(0)}</span>
      </div>

      {isBusted && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <p className="mb-3 text-lg font-bold text-red-400">Busted!</p>
            <button
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
}
