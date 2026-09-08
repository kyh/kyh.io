import type { LivelinePalette, ChartLayout } from "../types";
import { niceTimeInterval } from "../math/intervals";
import { lerp } from "../math/lerp";
import { edgeFade } from "./grid";

export interface TimeAxisState {
  labels: Map<number, { alpha: number; text: string }>;
}

const FADE = 0.08;
const FADE_ZONE = 50;
const MAX_LABELS = 30;

interface PlacedLabel {
  x: number;
  alpha: number;
  text: string;
  w: number;
}

/** For day+ intervals, align to local midnight instead of UTC epoch. */
const firstLabelTime = (leftEdge: number, interval: number): number => {
  if (interval >= 86_400) {
    const d = new Date((leftEdge - interval) * 1000);
    d.setHours(0, 0, 0, 0);
    return d.getTime() / 1000;
  }
  return Math.ceil((leftEdge - interval) / interval) * interval;
};

/**
 * When two labels collide, keep the higher-alpha one. This gives a clean
 * one-time crossover (no flickering) because one alpha is always rising
 * while the other is falling.
 */
const resolveOverlaps = (labels: PlacedLabel[]): PlacedLabel[] => {
  const drawn: PlacedLabel[] = [];
  for (const label of labels) {
    const left = label.x - label.w / 2;
    const prev = drawn.at(-1);
    if (prev) {
      const prevRight = prev.x + prev.w / 2;
      if (left < prevRight + 8) {
        if (label.alpha > prev.alpha) {
          drawn[drawn.length - 1] = label;
        }
        continue;
      }
    }
    drawn.push(label);
  }
  return drawn;
};

export const drawTimeAxis = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  windowSecs: number,
  targetWindowSecs: number,
  formatTime: (t: number) => string,
  state: TimeAxisState,
  dt: number,
) => {
  const { h, pad, leftEdge, rightEdge, toX } = layout;
  const chartLeft = pad.left;
  const chartRight = layout.w - pad.right;
  const chartW = chartRight - chartLeft;
  const edgeAlpha = (x: number): number =>
    edgeFade(Math.min(x - chartLeft, chartRight - x), FADE_ZONE);

  ctx.font = palette.labelFont;

  // Interval fully derived from target window — no dependency on the
  // interpolating display. Prevents a one-frame flicker when the transition
  // ends and windowSecs snaps to targetWindowSecs.
  const targetPxPerSec = chartW / targetWindowSecs;
  let interval = niceTimeInterval(targetWindowSecs);
  while (interval * targetPxPerSec < 60 && interval < targetWindowSecs) {
    interval *= 2;
  }

  // Generate labels: current view + 1 interval buffer.
  // Cap label count as a safety valve — during wide→narrow transitions the
  // target interval can be tiny relative to the current display span.
  const firstTime = firstLabelTime(leftEdge, interval);
  const targets = new Set<number>();
  for (let t = firstTime; t <= rightEdge + interval && targets.size < MAX_LABELS; t += interval) {
    targets.add(Math.round(t * 100));
  }

  // Create or update labels. Text is updated in-place — no crossfade needed
  // because format changes coincide with scroll transitions where the eye
  // tracks movement, not text content. By the time labels settle, the text
  // is already correct so nothing visibly changes on stationary labels.
  for (const key of targets) {
    const text = formatTime(key / 100);
    const existing = state.labels.get(key);
    if (existing) {
      existing.text = text;
    } else {
      state.labels.set(key, { alpha: 0, text });
    }
  }

  // Update alphas
  for (const [key, label] of state.labels) {
    const x = toX(key / 100);
    const isTarget = targets.has(key);
    const target = isTarget ? edgeAlpha(x) : 0;
    let next = lerp(label.alpha, target, FADE, dt);
    if (Math.abs(next - target) < 0.02) {
      next = target;
    }
    if (next < 0.01 && target === 0) {
      state.labels.delete(key);
    } else {
      label.alpha = next;
    }
  }

  // Draw
  const baseAlpha = ctx.globalAlpha;
  const lineY = h - pad.bottom;
  const tickLen = 5;

  ctx.strokeStyle = palette.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, lineY);
  ctx.lineTo(chartRight, lineY);
  ctx.stroke();

  ctx.textAlign = "center";

  const labels: PlacedLabel[] = [];
  for (const [key, label] of state.labels) {
    if (label.alpha < 0.02) {
      continue;
    }
    const x = toX(key / 100);
    if (x < chartLeft - 20 || x > chartRight) {
      continue;
    }
    const w = ctx.measureText(label.text).width;
    labels.push({ alpha: label.alpha, text: label.text, w, x });
  }
  labels.sort((a, b) => a.x - b.x);

  for (const label of resolveOverlaps(labels)) {
    ctx.save();
    ctx.globalAlpha = baseAlpha * label.alpha;

    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(label.x, lineY);
    ctx.lineTo(label.x, lineY + tickLen);
    ctx.stroke();

    ctx.fillStyle = palette.timeLabel;
    ctx.fillText(label.text, label.x, lineY + tickLen + 14);

    ctx.restore();
  }
};
