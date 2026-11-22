import type { LivelinePalette, ChartLayout } from "../types";
import { lerp } from "../math/lerp";

const pickInterval = (valRange: number, pxPerUnit: number, minGap: number, prev: number) => {
  if (prev > 0) {
    const px = prev * pxPerUnit;

    if (px >= minGap * 0.5 && px <= minGap * 4) {
      return prev;
    }
  }

  const divisorSets = [
    [2, 2.5, 2],
    [2, 2, 2.5],
    [2.5, 2, 2],
  ];

  let best = Infinity;

  for (const divs of divisorSets) {
    let span = 10 ** Math.ceil(Math.log10(valRange));
    let i = 0;

    while ((span / divs[i % 3]) * pxPerUnit >= minGap) {
      span /= divs[i % 3];
      i += 1;
    }

    if (span < best) {
      best = span;
    }
  }

  return best === Infinity ? valRange / 5 : best;
};

const divisible = (val: number, interval: number) => {
  const ratio = val / interval;

  return Math.abs(ratio - Math.round(ratio)) < 0.01;
};

const fineLabelTarget = (finePx: number) => {
  if (finePx < 40) {
    return 0;
  }

  if (finePx >= 60) {
    return 1;
  }

  return (finePx - 40) / 20;
};

/** 1 inside the chart, fading to 0 across `fadeZone` px from the nearest edge. */
export const edgeFade = (fromEdge: number, fadeZone: number) => {
  if (fromEdge >= fadeZone) {
    return 1;
  }

  if (fromEdge <= 0) {
    return 0;
  }

  return fromEdge / fadeZone;
};

/** Persistent state — interval hysteresis + per-label alpha smoothing. */
export interface GridState {
  interval: number;
  /** key → alpha */
  labels: Map<number, number>;
}

const FADE_IN = 0.18;
const FADE_OUT = 0.12;

const settleLabelAlphas = (state: GridState, targets: Map<number, number>, dt: number) => {
  for (const [key, alpha] of state.labels) {
    const target = targets.get(key) ?? 0;
    const speed = target >= alpha ? FADE_IN : FADE_OUT;
    let next = lerp(alpha, target, speed, dt);

    if (Math.abs(next - target) < 0.02) {
      next = target;
    }

    if (next < 0.01 && target === 0) {
      state.labels.delete(key);
    } else {
      state.labels.set(key, next);
    }
  }

  for (const [key, target] of targets) {
    if (!state.labels.has(key)) {
      state.labels.set(key, target * FADE_IN);
    }
  }
};

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  formatValue: (v: number) => string,
  state: GridState,
  dt: number,
) => {
  const { w, h, pad, valRange, minVal, maxVal, toY } = layout;
  const chartH = h - pad.top - pad.bottom;

  if (chartH <= 0 || valRange <= 0) {
    return;
  }

  const pxPerUnit = chartH / valRange;

  const coarse = pickInterval(valRange, pxPerUnit, 36, state.interval);
  state.interval = coarse;

  const fine = coarse / 2;
  const finePx = fine * pxPerUnit;

  const fineTarget = fineLabelTarget(finePx);
  const fadeZone = 32;

  const edgeAlpha = (y: number) => edgeFade(Math.min(y - pad.top, h - pad.bottom - y), fadeZone);

  const targets = new Map<number, number>();
  const first = Math.ceil(minVal / fine) * fine;

  for (let val = first; val <= maxVal; val += fine) {
    const y = toY(val);

    if (y < pad.top - 2 || y > h - pad.bottom + 2) {
      continue;
    }

    const isCoarse = divisible(val, coarse);
    const target = (isCoarse ? 1 : fineTarget) * edgeAlpha(y);
    const key = Math.round(val * 1000);
    targets.set(key, target);
  }

  settleLabelAlphas(state, targets, dt);

  const baseAlpha = ctx.globalAlpha;
  ctx.setLineDash([1, 3]);
  ctx.lineWidth = 1;
  ctx.font = palette.labelFont;
  ctx.textAlign = "left";

  for (const [key, alpha] of state.labels) {
    if (alpha < 0.02) {
      continue;
    }

    const val = key / 1000;
    const y = toY(val);

    if (y < pad.top - 10 || y > h - pad.bottom + 10) {
      continue;
    }

    ctx.save();
    ctx.globalAlpha = baseAlpha * alpha;

    ctx.strokeStyle = palette.gridLine;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = palette.gridLabel;
    ctx.fillText(formatValue(val), w - pad.right + 8, y + 4);

    ctx.restore();
  }

  ctx.setLineDash([]);
};
