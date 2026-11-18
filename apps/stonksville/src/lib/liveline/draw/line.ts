import type { LivelinePalette, ChartLayout, LivelinePoint } from "../types";
import { drawSpline } from "../math/spline";
import { parseColorRgb } from "../theme";
import {
  loadingY,
  loadingBreath,
  LOADING_AMPLITUDE_RATIO,
  LOADING_SCROLL_SPEED,
} from "./loading-shape";

const RGBA_RE = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?<alpha>[\d.]+)/u;

const parseRgba = (color: string) => {
  const [r, g, b] = parseColorRgb(color);
  const alpha = RGBA_RE.exec(color)?.groups?.alpha;

  return [r, g, b, alpha === undefined ? 1 : Number(alpha)] satisfies [
    number,
    number,
    number,
    number,
  ];
};

const blendColor = (c1: string, c2: string, t: number) => {
  if (t <= 0) {
    return c1;
  }

  if (t >= 1) {
    return c2;
  }

  const [r1, g1, b1, a1] = parseRgba(c1);
  const [r2, g2, b2, a2] = parseRgba(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  const a = a1 + (a2 - a1) * t;

  if (a >= 0.995) {
    return `rgb(${r},${g},${b})`;
  }

  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

const renderCurve = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  pts: [number, number][],
  showFill: boolean,
  lineAlpha = 1,
  fillAlpha = 1,
  strokeColor?: string,
) => {
  const { h, pad } = layout;
  const baseAlpha = ctx.globalAlpha;
  const last = pts.at(-1);

  if (last === undefined) {
    return;
  }

  if (showFill && fillAlpha > 0.01) {
    ctx.globalAlpha = baseAlpha * fillAlpha;
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, palette.fillTop);
    grad.addColorStop(1, palette.fillBottom);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], h - pad.bottom);
    ctx.lineTo(pts[0][0], pts[0][1]);
    drawSpline(ctx, pts);
    ctx.lineTo(last[0], h - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.globalAlpha = baseAlpha * lineAlpha;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  drawSpline(ctx, pts);
  ctx.strokeStyle = strokeColor ?? palette.line;
  ctx.lineWidth = palette.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.globalAlpha = baseAlpha;
};

export const drawLine = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  visible: LivelinePoint[],
  smoothValue: number,
  now: number,
  showFill: boolean,
  scrubX: number | null,
  scrubAmount = 0,
  chartReveal = 1,
  now_ms = 0,
  colorBlend = 1,
  skipDashLine = false,
  fillScale = 1,
) => {
  const { h, pad, toX, toY, chartW, chartH } = layout;
  const incomingAlpha = ctx.globalAlpha;

  const yMin = pad.top;
  const yMax = h - pad.bottom;
  const clampY = (y: number) => Math.max(yMin, Math.min(yMax, y));

  const centerY = pad.top + chartH / 2;
  const amplitude = chartH * LOADING_AMPLITUDE_RATIO;
  const scroll = now_ms * LOADING_SCROLL_SPEED;

  const morphY =
    chartReveal < 1
      ? (rawY: number, x: number) => {
          const t = Math.max(0, Math.min(1, (x - pad.left) / chartW));
          const centerDist = Math.abs(t - 0.5) * 2;
          const localReveal = Math.max(0, Math.min(1, (chartReveal - centerDist * 0.4) / 0.6));
          const baseY = loadingY(t, centerY, amplitude, scroll);

          return baseY + (rawY - baseY) * localReveal;
        }
      : (rawY: number, _x: number) => rawY;

  const pts: [number, number][] = visible.map((p, i) => {
    const x = toX(p.time);

    const y =
      i === visible.length - 1
        ? morphY(clampY(toY(smoothValue)), x)
        : morphY(clampY(toY(p.value)), x);

    return [x, y];
  });

  const liveTipX = toX(now);
  const fullRightX = pad.left + chartW;
  const tipX = chartReveal < 1 ? liveTipX + (fullRightX - liveTipX) * (1 - chartReveal) : liveTipX;
  pts.push([tipX, morphY(clampY(toY(smoothValue)), tipX)]);

  if (pts.length < 2) {
    return;
  }

  let lineAlpha = 1;
  let fillAlpha = fillScale;

  if (chartReveal < 1) {
    const breath = loadingBreath(now_ms);
    lineAlpha = breath + (1 - breath) * chartReveal;
    fillAlpha = chartReveal * fillScale;
  }

  const colorT = Math.min(1, chartReveal * 3) * colorBlend;

  const strokeColor =
    chartReveal < 1 || colorBlend < 1
      ? blendColor(palette.gridLabel, palette.line, colorT)
      : undefined;

  const isScrubbing = scrubX !== null;

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left - 1, pad.top, chartW + 2, chartH);
  ctx.clip();

  if (scrubX === null) {
    renderCurve(ctx, layout, palette, pts, showFill, lineAlpha, fillAlpha, strokeColor);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, scrubX, h);
    ctx.clip();
    renderCurve(ctx, layout, palette, pts, showFill, lineAlpha, fillAlpha, strokeColor);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(scrubX, 0, layout.w - scrubX, h);
    ctx.clip();
    ctx.globalAlpha = incomingAlpha * (1 - scrubAmount * 0.6);
    renderCurve(ctx, layout, palette, pts, showFill, lineAlpha, fillAlpha, strokeColor);
    ctx.restore();
  }

  ctx.restore();

  if (!skipDashLine) {
    const realCurrentY = Math.max(pad.top, Math.min(h - pad.bottom, toY(smoothValue)));

    const currentY =
      chartReveal < 1 ? centerY + (realCurrentY - centerY) * chartReveal : realCurrentY;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = palette.dashLine;
    ctx.lineWidth = 1;
    const dashBase = isScrubbing ? 1 - scrubAmount * 0.2 : 1;
    ctx.globalAlpha = incomingAlpha * (chartReveal < 1 ? dashBase * chartReveal : dashBase);
    ctx.beginPath();
    ctx.moveTo(pad.left, currentY);
    ctx.lineTo(layout.w - pad.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = incomingAlpha;

  const last = pts.at(-1);

  if (last) {
    last[1] = Math.max(10, Math.min(h - 10, last[1]));
  }

  return pts;
};
