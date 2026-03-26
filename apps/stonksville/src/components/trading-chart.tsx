"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LivelinePoint } from "@/lib/liveline/types";
import { Liveline } from "@/lib/liveline/Liveline";
import { getDpr } from "@/lib/liveline/canvas/dpr";
import { lerp } from "@/lib/liveline/math/lerp";

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
const FUTURE_RATIO_MOBILE = 0.5;
const FUTURE_RATIO_DESKTOP = 0.35;
const MOBILE_BREAKPOINT = 768;

function isMobile(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
}

function getFutureRatio(): number {
  return isMobile() ? FUTURE_RATIO_MOBILE : FUTURE_RATIO_DESKTOP;
}
/** Half a grid cell in ms */
const HALF_CELL_MS = (GRID_CELL_SECONDS * 1000) / 2;
/** Fixed price range (half above + half below current price) */
const PRICE_RANGE_HALF = 200;
/** Half block height in price units */
const HALF_BLOCK_H = BLOCK_PRICE_HEIGHT / 2;

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
  const padRight = width * getFutureRatio();

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

type HoverState = {
  x: number;
  y: number;
  currentPrice: number;
  balance: number;
};

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  dims: OverlayDims,
  blocks: Block[],
  hover: HoverState | null,
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
  const firstGridTime =
    Math.ceil((dims.timeStart - HALF_CELL_MS) / cellMs) * cellMs + HALF_CELL_MS;

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
  const pxPerPrice = (dims.bottom - dims.top) / (dims.priceMax - dims.priceMin);
  const extraPrice = pxPerPrice > 0 ? (dims.height - dims.bottom) / pxPerPrice : 0;
  const gridPriceMin = dims.priceMin - extraPrice;

  const firstGridPrice =
    Math.ceil((gridPriceMin - HALF_BLOCK_H) / BLOCK_PRICE_HEIGHT) *
      BLOCK_PRICE_HEIGHT +
    HALF_BLOCK_H;

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
    const snapped = snapToGrid(
      yToPrice(hover.y, dims),
      xToTime(hover.x, dims),
    );

    const isInFuture = snapped.time > Date.now() + MIN_FUTURE_SECONDS * 1000;
    const isValid = isInFuture && hover.balance >= DEFAULT_BET;

    const x1 = timeToX(snapped.time - HALF_CELL_MS, dims);
    const x2 = timeToX(snapped.time + HALF_CELL_MS, dims);
    const y1 = priceToY(snapped.price + HALF_BLOCK_H, dims);
    const y2 = priceToY(snapped.price - HALF_BLOCK_H, dims);

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
      const mult = calculateMultiplier(hover.currentPrice, snapped.price);
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
  const x1 = timeToX(block.targetTime - HALF_CELL_MS, dims);
  const x2 = timeToX(block.targetTime + HALF_CELL_MS, dims);
  const y1 = priceToY(block.priceLevel + HALF_BLOCK_H, dims);
  const y2 = priceToY(block.priceLevel - HALF_BLOCK_H, dims);
  const w = x2 - x1;
  const h = y2 - y1;

  if (x2 < dims.left || x1 > dims.right) return;

  // Fade out resolved blocks over 1s
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
  const confettiLayerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PriceEngine | null>(null);
  const stateRef = useRef(createInitialState());
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const lastPlacedCellRef = useRef<string | null>(null);
  const rangeCenterRef = useRef(5200);
  const targetCenterRef = useRef(5200);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ width: 0, height: 0 });
  const prevUIRef = useRef({
    balance: INITIAL_BALANCE,
    totalWins: 0,
    totalLosses: 0,
    blockCount: 0,
  });

  const [chartData, setChartData] = useState<LivelinePoint[]>([]);
  const [liveValue, setLiveValue] = useState(5200);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [blockCount, setBlockCount] = useState(0);
  const [rightPad, setRightPad] = useState(200);
  const [priceRange, setPriceRange] = useState({ min: 5000, max: 5400 });

  // ResizeObserver for sizeRef and rightPad
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        sizeRef.current = { width, height };
        setRightPad(Math.round(width * getFutureRatio()) || 200);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize price engine — subscribe updates state + refs
  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;

    engine.subscribe((point) => {
      setLiveValue(point.price);

      targetCenterRef.current =
        Math.round(point.price / BLOCK_PRICE_HEIGHT) * BLOCK_PRICE_HEIGHT;

      // Update game state on each tick (10/sec) instead of every rAF frame (60/sec)
      const history = engine.getHistoryRaw();
      stateRef.current = updateBlocks(
        stateRef.current,
        point.price,
        Date.now(),
        history,
      );

      const llData: LivelinePoint[] = [];
      for (let i = 0; i < history.length; i++) {
        const p = history[i]!;
        llData.push({ time: p.time / 1000, value: p.price });
      }
      setChartData(llData);
    });

    engine.start();
    return () => engine.stop();
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
      const price = engineRef.current?.getCurrentPrice() ?? 5200;

      // Frame-rate-independent lerp for smooth grid panning
      rangeCenterRef.current = lerp(
        rangeCenterRef.current,
        targetCenterRef.current,
        0.04,
        dt,
      );
      const min = rangeCenterRef.current - PRICE_RANGE_HALF;
      const max = rangeCenterRef.current + PRICE_RANGE_HALF;
      setPriceRange((prev) =>
        prev.min === min && prev.max === max ? prev : { min, max },
      );

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

      const dims = computeDims(width, height, now, min, max);

      const hover = hoverRef.current;
      drawOverlay(
        ctx,
        dims,
        next.blocks,
        hover ? { ...hover, currentPrice: price, balance: next.balance } : null,
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
      if (next.blocks === prev) return;

      const prevById = new Map(prev.map((b) => [b.id, b]));
      const confettiLayer = confettiLayerRef.current;
      const { width, height } = sizeRef.current;
      const center = rangeCenterRef.current;
      const dims = computeDims(
        width,
        height,
        Date.now(),
        center - PRICE_RANGE_HALF,
        center + PRICE_RANGE_HALF,
      );

      for (const b of next.blocks) {
        if (b.touched && !prevById.get(b.id)?.touched) {
          const count = 3 + Math.floor(Math.random() * 5);
          textBalloons([
            {
              text: "💸".repeat(count),
              fontSize: 80 + Math.floor(Math.random() * 60),
              color: "#000000",
            },
          ]);
          if (confettiLayer) {
            fireConfetti(
              timeToX(b.targetTime, dims),
              priceToY(b.priceLevel, dims),
              {
                particleCount: 12,
                startVelocity: 8,
                spread: 360,
                decay: 0.94,
                gravity: 0.4,
                size: 0.7,
                emojis: ["💰"],
                parent: confettiLayer,
              },
            );
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
    const center = rangeCenterRef.current;
    return computeDims(width, height, now, center - PRICE_RANGE_HALF, center + PRICE_RANGE_HALF);
  }, []);

  const tryPlaceAt = useCallback(
    (x: number, y: number) => {
      const dims = getClickDims();
      const price = engineRef.current?.getCurrentPrice() ?? 5200;
      const snapped = snapToGrid(yToPrice(y, dims), xToTime(x, dims));
      const cellKey = `${snapped.price}:${snapped.time}`;
      if (cellKey === lastPlacedCellRef.current) return;
      lastPlacedCellRef.current = cellKey;
      const prev = stateRef.current;
      stateRef.current = placeBlock(prev, price, snapped.price, snapped.time);
      if (stateRef.current !== prev) {
        const confettiLayer = confettiLayerRef.current;
        if (confettiLayer) {
          fireConfetti(
            timeToX(snapped.time, dims),
            priceToY(snapped.price, dims),
            { particleCount: 20, size: 0.6, parent: confettiLayer },
          );
        }
      }
    },
    [getClickDims],
  );

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

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      draggingRef.current = false;
      lastPlacedCellRef.current = null;
    },
    [],
  );

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
      totalWins: 0,
      totalLosses: 0,
      blockCount: 0,
    };
    setBalance(INITIAL_BALANCE);
    setWins(0);
    setLosses(0);
    setBlockCount(0);
  }, []);

  const isBusted = balance < DEFAULT_BET && blockCount === 0;

  const { min: rangeMin, max: rangeMax } = priceRange;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Grid + blocks canvas (behind chart line) */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 h-full w-full"
      />

      {/* Chart line */}
      <div className="absolute inset-0 z-10">
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
          minValue={rangeMin}
          maxValue={rangeMax}
          formatValue={(v: number) => v.toFixed(2)}
          padding={{ top: 0, right: rightPad, bottom: 28, left: 2 }}
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
      <div className="pointer-events-none absolute top-3 right-3 z-30 flex items-center gap-3 font-mono text-sm">
        <span className="text-emerald-400/60">{liveValue.toFixed(2)}</span>
        <span className="text-emerald-300/50">{wins}W</span>
        <span className="text-red-400/50">{losses}L</span>
        <span className="font-bold tabular-nums">${balance.toFixed(0)}</span>
      </div>

      {isBusted && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
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
