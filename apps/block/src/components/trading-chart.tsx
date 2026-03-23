"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PricePoint } from "@/lib/price-engine";
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

/** Visible time window in seconds */
const VISIBLE_SECONDS = 90;
/** How far into the future the chart extends (seconds) */
const FUTURE_SECONDS = 45;
/** Grid cell width in seconds */
const GRID_CELL_SECONDS = 5;
/** Price range to show above/below current price */
const PRICE_RANGE = 8;
/** Grid cell height in price units */
const GRID_CELL_PRICE = BLOCK_PRICE_HEIGHT;

type ChartDimensions = {
  width: number;
  height: number;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
};

function getChartDimensions(canvas: HTMLCanvasElement): ChartDimensions {
  const width = canvas.width;
  const height = canvas.height;
  const chartLeft = 0;
  const chartRight = width - 60; // room for price axis
  const chartTop = 10;
  const chartBottom = height - 30; // room for time axis
  return { width, height, chartLeft, chartRight, chartTop, chartBottom };
}

function timeToX(
  time: number,
  now: number,
  dims: ChartDimensions,
): number {
  const totalMs = (VISIBLE_SECONDS + FUTURE_SECONDS) * 1000;
  const startTime = now - VISIBLE_SECONDS * 1000;
  const fraction = (time - startTime) / totalMs;
  return dims.chartLeft + fraction * (dims.chartRight - dims.chartLeft);
}

function priceToY(
  price: number,
  centerPrice: number,
  dims: ChartDimensions,
): number {
  const top = centerPrice + PRICE_RANGE;
  const bottom = centerPrice - PRICE_RANGE;
  const fraction = (price - top) / (bottom - top);
  return dims.chartTop + fraction * (dims.chartBottom - dims.chartTop);
}

function xToTime(
  x: number,
  now: number,
  dims: ChartDimensions,
): number {
  const totalMs = (VISIBLE_SECONDS + FUTURE_SECONDS) * 1000;
  const startTime = now - VISIBLE_SECONDS * 1000;
  const fraction = (x - dims.chartLeft) / (dims.chartRight - dims.chartLeft);
  return startTime + fraction * totalMs;
}

function yToPrice(
  y: number,
  centerPrice: number,
  dims: ChartDimensions,
): number {
  const top = centerPrice + PRICE_RANGE;
  const bottom = centerPrice - PRICE_RANGE;
  const fraction = (y - dims.chartTop) / (dims.chartBottom - dims.chartTop);
  return top + fraction * (bottom - top);
}

/** Snap to nearest grid cell center */
function snapToGrid(
  price: number,
  time: number,
  centerPrice: number,
  now: number,
): { price: number; time: number } {
  // Snap price to grid
  const gridBottom = centerPrice - PRICE_RANGE;
  const priceOffset = price - gridBottom;
  const snappedPriceOffset =
    Math.round(priceOffset / GRID_CELL_PRICE) * GRID_CELL_PRICE;
  const snappedPrice = gridBottom + snappedPriceOffset;

  // Snap time to grid
  const cellMs = GRID_CELL_SECONDS * 1000;
  const snappedTime = Math.round(time / cellMs) * cellMs;

  return { price: snappedPrice, time: snappedTime };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  centerPrice: number,
  now: number,
) {
  const { chartLeft, chartRight, chartTop, chartBottom } = dims;

  // Vertical grid lines (time)
  ctx.strokeStyle = "rgba(236, 72, 153, 0.12)";
  ctx.lineWidth = 1;
  const cellMs = GRID_CELL_SECONDS * 1000;
  const startTime = now - VISIBLE_SECONDS * 1000;
  const endTime = now + FUTURE_SECONDS * 1000;
  const firstGridTime = Math.ceil(startTime / cellMs) * cellMs;

  for (let t = firstGridTime; t <= endTime; t += cellMs) {
    const x = timeToX(t, now, dims);
    if (x < chartLeft || x > chartRight) continue;
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, chartBottom);
    ctx.stroke();
  }

  // Horizontal grid lines (price)
  const gridBottom = centerPrice - PRICE_RANGE;
  const gridTop = centerPrice + PRICE_RANGE;
  for (
    let p = Math.ceil(gridBottom / GRID_CELL_PRICE) * GRID_CELL_PRICE;
    p <= gridTop;
    p += GRID_CELL_PRICE
  ) {
    const y = priceToY(p, centerPrice, dims);
    if (y < chartTop || y > chartBottom) continue;
    ctx.beginPath();
    ctx.moveTo(chartLeft, y);
    ctx.lineTo(chartRight, y);
    ctx.stroke();
  }

  // "Now" line
  const nowX = timeToX(now, now, dims);
  ctx.strokeStyle = "rgba(236, 72, 153, 0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(nowX, chartTop);
  ctx.lineTo(nowX, chartBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Future zone shading
  ctx.fillStyle = "rgba(236, 72, 153, 0.03)";
  ctx.fillRect(nowX, chartTop, chartRight - nowX, chartBottom - chartTop);
}

function drawPriceLine(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  history: PricePoint[],
  centerPrice: number,
  now: number,
) {
  if (history.length < 2) return;

  const startTime = now - VISIBLE_SECONDS * 1000;

  // Draw the line
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();

  let started = false;
  for (const point of history) {
    if (point.time < startTime) continue;
    const x = timeToX(point.time, now, dims);
    const y = priceToY(point.price, centerPrice, dims);

    if (x < dims.chartLeft || x > dims.chartRight) continue;

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Glow effect
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  started = false;
  for (const point of history) {
    if (point.time < startTime) continue;
    const x = timeToX(point.time, now, dims);
    const y = priceToY(point.price, centerPrice, dims);
    if (x < dims.chartLeft || x > dims.chartRight) continue;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  block: Block,
  centerPrice: number,
  now: number,
) {
  const cellMs = GRID_CELL_SECONDS * 1000;
  const halfCell = cellMs / 2;

  const x1 = timeToX(block.targetTime - halfCell, now, dims);
  const x2 = timeToX(block.targetTime + halfCell, now, dims);
  const y1 = priceToY(block.priceTop, centerPrice, dims);
  const y2 = priceToY(block.priceBottom, centerPrice, dims);

  const w = x2 - x1;
  const h = y2 - y1;

  if (x2 < dims.chartLeft || x1 > dims.chartRight) return;

  // Block colors based on status
  let fillColor: string;
  let borderColor: string;
  let glowColor: string;

  switch (block.status) {
    case "active":
      fillColor = "rgba(250, 240, 50, 0.85)";
      borderColor = "rgba(250, 240, 50, 1)";
      glowColor = "rgba(250, 240, 50, 0.4)";
      break;
    case "locked":
      fillColor = "rgba(250, 200, 50, 0.9)";
      borderColor = "rgba(255, 180, 0, 1)";
      glowColor = "rgba(255, 180, 0, 0.4)";
      break;
    case "won":
      fillColor = "rgba(74, 222, 128, 0.9)";
      borderColor = "rgba(74, 222, 128, 1)";
      glowColor = "rgba(74, 222, 128, 0.5)";
      break;
    case "lost":
      fillColor = "rgba(248, 113, 113, 0.6)";
      borderColor = "rgba(248, 113, 113, 0.8)";
      glowColor = "rgba(248, 113, 113, 0.3)";
      break;
  }

  // Glow
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;

  // Fill
  ctx.fillStyle = fillColor;
  ctx.fillRect(x1, y1, w, h);

  // Border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x1, y1, w, h);

  // Text
  ctx.fillStyle = block.status === "lost" ? "#fff" : "#000";
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = x1 + w / 2;
  const cy = y1 + h / 2;

  ctx.fillText(`$${block.amount}`, cx, cy - 8);

  ctx.font = "11px monospace";
  ctx.fillText(`${block.multiplier.toFixed(1)}x`, cx, cy + 8);

  ctx.shadowBlur = 0;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  centerPrice: number,
  now: number,
) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "10px monospace";

  // Price axis (right side)
  ctx.textAlign = "left";
  const gridBottom = centerPrice - PRICE_RANGE;
  const gridTop = centerPrice + PRICE_RANGE;
  for (
    let p = Math.ceil(gridBottom / GRID_CELL_PRICE) * GRID_CELL_PRICE;
    p <= gridTop;
    p += GRID_CELL_PRICE * 2
  ) {
    const y = priceToY(p, centerPrice, dims);
    if (y < dims.chartTop || y > dims.chartBottom) continue;
    ctx.fillText(p.toFixed(1), dims.chartRight + 4, y + 3);
  }

  // Time axis (bottom)
  ctx.textAlign = "center";
  const cellMs = GRID_CELL_SECONDS * 1000;
  const startTime = now - VISIBLE_SECONDS * 1000;
  const endTime = now + FUTURE_SECONDS * 1000;
  const firstGridTime = Math.ceil(startTime / cellMs) * cellMs;

  for (let t = firstGridTime; t <= endTime; t += cellMs * 3) {
    const x = timeToX(t, now, dims);
    if (x < dims.chartLeft || x > dims.chartRight) continue;
    const date = new Date(t);
    const label = `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, "0")}`;
    ctx.fillText(label, x, dims.chartBottom + 15);
  }

  // Current price label
  const currentPrice = centerPrice;
  const priceY = priceToY(currentPrice, centerPrice, dims);
  const priceX = dims.chartRight;

  ctx.fillStyle = "#ec4899";
  ctx.fillRect(priceX, priceY - 10, 58, 20);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(centerPrice.toFixed(2), priceX + 29, priceY + 4);
}

function drawHoverPreview(
  ctx: CanvasRenderingContext2D,
  dims: ChartDimensions,
  hoverPrice: number,
  hoverTime: number,
  currentPrice: number,
  centerPrice: number,
  now: number,
  balance: number,
) {
  const cellMs = GRID_CELL_SECONDS * 1000;
  const halfCell = cellMs / 2;
  const halfHeight = BLOCK_PRICE_HEIGHT / 2;

  const x1 = timeToX(hoverTime - halfCell, now, dims);
  const x2 = timeToX(hoverTime + halfCell, now, dims);
  const y1 = priceToY(hoverPrice + halfHeight, centerPrice, dims);
  const y2 = priceToY(hoverPrice - halfHeight, centerPrice, dims);

  const w = x2 - x1;
  const h = y2 - y1;

  // Check if placement is valid
  const isInFuture = hoverTime > now + 15000;
  const hasBalance = balance >= DEFAULT_BET;
  const isValid = isInFuture && hasBalance;

  // Preview block
  ctx.fillStyle = isValid
    ? "rgba(250, 240, 50, 0.3)"
    : "rgba(248, 113, 113, 0.2)";
  ctx.strokeStyle = isValid
    ? "rgba(250, 240, 50, 0.6)"
    : "rgba(248, 113, 113, 0.4)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.fillRect(x1, y1, w, h);
  ctx.strokeRect(x1, y1, w, h);
  ctx.setLineDash([]);

  // Multiplier preview
  if (isValid) {
    const mult = calculateMultiplier(currentPrice, hoverPrice);
    ctx.fillStyle = "rgba(250, 240, 50, 0.9)";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `$${DEFAULT_BET} · ${mult.toFixed(1)}x`,
      x1 + w / 2,
      y1 + h / 2,
    );
  }
}

export function TradingChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PriceEngine | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const historyRef = useRef<PricePoint[]>([]);
  const currentPriceRef = useRef(5200);
  const centerPriceRef = useRef(5200);
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number>(0);
  const [balance, setBalance] = useState(1000);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(5200);
  const [blockCount, setBlockCount] = useState(0);

  // Initialize engine
  useEffect(() => {
    const engine = new PriceEngine();
    engineRef.current = engine;

    engine.subscribe((point) => {
      currentPriceRef.current = point.price;
      historyRef.current = engine.getHistory();

      // Smoothly track center price
      const diff = point.price - centerPriceRef.current;
      centerPriceRef.current += diff * 0.05;
    });

    engine.start();
    historyRef.current = engine.getHistory();
    centerPriceRef.current = engine.getCurrentPrice();

    return () => engine.stop();
  }, []);

  // Render loop
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Handle DPR
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Use CSS dimensions for calculations
      const dims: ChartDimensions = {
        width: rect.width,
        height: rect.height,
        chartLeft: 0,
        chartRight: rect.width - 60,
        chartTop: 10,
        chartBottom: rect.height - 30,
      };

      const now = Date.now();
      const center = centerPriceRef.current;
      const price = currentPriceRef.current;

      // Update game state
      stateRef.current = updateBlocks(stateRef.current, price, now);
      setBalance(stateRef.current.balance);
      setWins(stateRef.current.totalWins);
      setLosses(stateRef.current.totalLosses);
      setCurrentPrice(price);
      setBlockCount(stateRef.current.blocks.length);

      // Clear
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw
      drawGrid(ctx, dims, center, now);
      drawPriceLine(ctx, dims, historyRef.current, center, now);

      // Draw blocks
      for (const block of stateRef.current.blocks) {
        drawBlock(ctx, dims, block, center, now);
      }

      // Draw hover preview
      if (hoverRef.current) {
        const hoverPrice = yToPrice(
          hoverRef.current.y,
          center,
          dims,
        );
        const hoverTime = xToTime(hoverRef.current.x, now, dims);
        const snapped = snapToGrid(hoverPrice, hoverTime, center, now);
        drawHoverPreview(
          ctx,
          dims,
          snapped.price,
          snapped.time,
          price,
          center,
          now,
          stateRef.current.balance,
        );
      }

      drawAxes(ctx, dims, center, now);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const now = Date.now();
      const center = centerPriceRef.current;
      const price = currentPriceRef.current;

      const dims: ChartDimensions = {
        width: rect.width,
        height: rect.height,
        chartLeft: 0,
        chartRight: rect.width - 60,
        chartTop: 10,
        chartBottom: rect.height - 30,
      };

      const clickPrice = yToPrice(y, center, dims);
      const clickTime = xToTime(x, now, dims);
      const snapped = snapToGrid(clickPrice, clickTime, center, now);

      stateRef.current = placeBlock(
        stateRef.current,
        price,
        snapped.price,
        snapped.time,
      );
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const now = Date.now();
      const center = centerPriceRef.current;
      const price = currentPriceRef.current;

      const dims: ChartDimensions = {
        width: rect.width,
        height: rect.height,
        chartLeft: 0,
        chartRight: rect.width - 60,
        chartTop: 10,
        chartBottom: rect.height - 30,
      };

      const clickPrice = yToPrice(y, center, dims);
      const clickTime = xToTime(x, now, dims);
      const snapped = snapToGrid(clickPrice, clickTime, center, now);

      stateRef.current = placeBlock(
        stateRef.current,
        price,
        snapped.price,
        snapped.time,
      );
    },
    [],
  );

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
            <div className="text-white/40 text-xs">PRICE</div>
            <div className="font-mono font-bold tabular-nums">
              {currentPrice.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
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
          <span className="text-xs text-white/40">
            ${DEFAULT_BET}/block
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-xs text-green-400">
              {wins}W
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-red-400">
              {losses}L
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-lg tabular-nums">
              ${balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
