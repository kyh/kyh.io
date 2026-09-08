import type { LivelinePalette, ChartLayout, OrderbookData } from "../types";

type Rgb = [number, number, number];

const GREEN: Rgb = [34, 197, 94];
const RED: Rgb = [239, 68, 68];

interface StreamLabel {
  y: number;
  text: string;
  green: boolean;
  life: number;
  maxLife: number;
  /** 0-1, bigger orders = brighter */
  intensity: number;
}

export interface OrderbookState {
  labels: StreamLabel[];
  spawnTimer: number;
  smoothSpeed: number;
  prevBidTotal: number;
  prevAskTotal: number;
  /** smoothed 0-1, how much the book is changing */
  churnRate: number;
}

const MAX_LABELS = 50;
// seconds
const LABEL_LIFETIME = 6;
// ms
const SPAWN_INTERVAL = 40;
// px
const MIN_LABEL_GAP = 22;
// px/s calm
const BASE_SPEED = 60;
// px/s during big activity
const MAX_SPEED = 160;

export const createOrderbookState = (): OrderbookState => ({
  churnRate: 0,
  labels: [],
  prevAskTotal: 0,
  prevBidTotal: 0,
  smoothSpeed: BASE_SPEED,
  spawnTimer: 0,
});

const mixColor = (from: Rgb, to: Rgb, t: number): string => {
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
};

const formatSize = (size: number): string => {
  if (size >= 10) {
    return `$${Math.round(size)}`;
  }
  if (size >= 1) {
    return `$${size.toFixed(1)}`;
  }
  return `$${size.toFixed(2)}`;
};

interface BookTotals {
  maxSize: number;
  bidTotal: number;
  askTotal: number;
}

const sumBook = (orderbook: OrderbookData): BookTotals => {
  let maxSize = 0;
  let bidTotal = 0;
  let askTotal = 0;
  for (const [, size] of orderbook.bids) {
    bidTotal += size;
    maxSize = Math.max(maxSize, size);
  }
  for (const [, size] of orderbook.asks) {
    askTotal += size;
    maxSize = Math.max(maxSize, size);
  }
  return { askTotal, bidTotal, maxSize };
};

/**
 * Churn: how much total size changed since last frame, normalized by the
 * previous total so it's scale-independent. Fast attack, slower decay.
 */
const updateChurn = (state: OrderbookState, { bidTotal, askTotal }: BookTotals): void => {
  const prevTotal = state.prevBidTotal + state.prevAskTotal;
  let churnSignal = 0;
  if (prevTotal > 0) {
    const delta = Math.abs(bidTotal - state.prevBidTotal) + Math.abs(askTotal - state.prevAskTotal);
    churnSignal = Math.min(delta / prevTotal, 1);
  }
  state.prevBidTotal = bidTotal;
  state.prevAskTotal = askTotal;
  const churnLerp = churnSignal > state.churnRate ? 0.3 : 0.05;
  state.churnRate += (churnSignal - state.churnRate) * churnLerp;
};

interface Level {
  size: number;
  green: boolean;
}

const pickWeightedLevel = (orderbook: OrderbookData): Level | undefined => {
  const allLevels: Level[] = [];
  for (const [, size] of orderbook.bids) {
    allLevels.push({ green: true, size });
  }
  for (const [, size] of orderbook.asks) {
    allLevels.push({ green: false, size });
  }
  let totalWeight = 0;
  for (const l of allLevels) {
    totalWeight += l.size;
  }
  let r = Math.random() * totalWeight;
  for (const l of allLevels) {
    r -= l.size;
    if (r <= 0) {
      return l;
    }
  }
  return allLevels[0];
};

const spawnLabels = (
  state: OrderbookState,
  orderbook: OrderbookData,
  dt: number,
  bottomY: number,
  maxSize: number,
): void => {
  state.spawnTimer += dt;
  while (state.spawnTimer >= SPAWN_INTERVAL && state.labels.length < MAX_LABELS) {
    state.spawnTimer -= SPAWN_INTERVAL;

    const tooClose = state.labels.some((l) => Math.abs(l.y - bottomY) < MIN_LABEL_GAP);
    if (tooClose) {
      break;
    }

    const picked = pickWeightedLevel(orderbook);
    if (!picked) {
      break;
    }

    const sizeRatio = picked.size / maxSize;
    state.labels.push({
      green: picked.green,
      intensity: 0.5 + sizeRatio * 0.5,
      life: LABEL_LIFETIME,
      maxLife: LABEL_LIFETIME,
      text: `+ ${formatSize(picked.size)}`,
      y: bottomY,
    });
  }
};

/** Labels decelerate as they rise — fast at bottom, slow at top. Drops dead/offscreen ones in place. */
const advanceLabels = (
  state: OrderbookState,
  speed: number,
  dtSec: number,
  topY: number,
  bottomY: number,
): void => {
  const range = bottomY - topY;
  let writeIdx = 0;
  for (const l of state.labels) {
    l.life -= dtSec;
    if (l.life <= 0) {
      continue;
    }
    const yProgress = range > 0 ? (l.y - topY) / range : 1;
    l.y -= speed * (0.7 + 0.3 * yProgress) * dtSec;
    if (l.y < topY - 14) {
      continue;
    }
    state.labels[writeIdx] = l;
    writeIdx += 1;
  }
  state.labels.length = writeIdx;
};

/**
 * Kalshi-style orderbook: left-aligned column spanning full chart height.
 * Speed driven by two signals:
 *   1. swingMagnitude — price momentum (proxy for activity)
 *   2. orderbook churn — how much the bid/ask data itself is changing
 * Whichever signal is stronger wins. Works with both demo and production data.
 */
export const drawOrderbook = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  orderbook: OrderbookData,
  dt: number,
  state: OrderbookState,
  swingMagnitude: number,
): void => {
  const { pad, h, chartH } = layout;
  const dtSec = dt / 1000;

  if (orderbook.bids.length === 0 && orderbook.asks.length === 0) {
    return;
  }

  const totals = sumBook(orderbook);
  if (totals.maxSize === 0) {
    return;
  }

  updateChurn(state, totals);

  const activity = Math.max(Math.min(swingMagnitude * 5, 1), state.churnRate);
  const targetSpeed = BASE_SPEED + activity * (MAX_SPEED - BASE_SPEED);
  const speedLerp = 1 - 0.95 ** (dt / 16.67);
  state.smoothSpeed += (targetSpeed - state.smoothSpeed) * speedLerp;
  const speed = state.smoothSpeed;

  const labelX = pad.left + 8;
  const bottomY = h - pad.bottom - 6;
  const topY = pad.top;
  const bg = palette.bgRgb;

  spawnLabels(state, orderbook, dt, bottomY, totals.maxSize);
  advanceLabels(state, speed, dtSec, topY, bottomY);

  const baseAlpha = ctx.globalAlpha;
  ctx.save();
  ctx.font = '600 13px "SF Mono", Menlo, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = baseAlpha;

  const outlineColor = `rgb(${bg[0]},${bg[1]},${bg[2]})`;

  for (const l of state.labels) {
    const lifeRatio = l.life / l.maxLife;

    // Fade in quickly, fade out near top of chart
    const fadeIn = Math.min((1 - lifeRatio) * 10, 1);
    const yRatio = (l.y - topY) / chartH;
    const fadeOut = yRatio < 0.45 ? yRatio / 0.45 : 1;

    const colorStrength = l.intensity * fadeIn * fadeOut;
    const baseColor = l.green ? GREEN : RED;
    const fillColor = mixColor(baseColor, bg, 1 - colorStrength);

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.strokeText(l.text, labelX, l.y);

    ctx.fillStyle = fillColor;
    ctx.fillText(l.text, labelX, l.y);
  }

  ctx.restore();
};
