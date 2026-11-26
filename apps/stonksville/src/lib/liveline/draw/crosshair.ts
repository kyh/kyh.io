import type { LivelinePalette, ChartLayout } from "../types";

export interface MultiSeriesHoverEntry {
  color: string;
  label: string;
  value: number;
}

interface Segment {
  text: string;
  color: string;
  isDot?: boolean;
}

const SEPARATOR = "  ·  ";
const DOT_SEGMENT_WIDTH = 12;

const buildSegments = (
  palette: LivelinePalette,
  timeText: string,
  entries: MultiSeriesHoverEntry[],
  formatValue: (v: number) => string,
) => {
  const segments: Segment[] = [{ color: palette.gridLabel, text: timeText }];

  for (const e of entries) {
    segments.push(
      { color: palette.gridLabel, text: SEPARATOR },
      { color: e.color, isDot: true, text: " " },
    );

    if (e.label) {
      segments.push({ color: palette.gridLabel, text: `${e.label} ` });
    }

    segments.push({ color: palette.tooltipText, text: formatValue(e.value) });
  }

  return segments;
};

export const drawCrosshair = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  hoverX: number,
  hoverValue: number,
  hoverTime: number,
  formatValue: (v: number) => string,
  formatTime: (t: number) => string,
  scrubOpacity: number,
  tooltipY?: number,
  liveDotX?: number,
  tooltipOutline?: boolean,
) => {
  if (scrubOpacity < 0.01) {
    return;
  }

  const { h, pad, toY } = layout;
  const y = toY(hoverValue);

  ctx.save();
  ctx.globalAlpha = scrubOpacity * 0.5;
  ctx.strokeStyle = palette.crosshairLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hoverX, pad.top);
  ctx.lineTo(hoverX, h - pad.bottom);
  ctx.stroke();
  ctx.restore();

  const dotRadius = 4 * Math.min(scrubOpacity * 3, 1);

  if (dotRadius > 0.5) {
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(hoverX, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = palette.line;
    ctx.fill();
  }

  if (scrubOpacity < 0.1 || layout.w < 300) {
    return;
  }

  const valueText = formatValue(hoverValue);
  const timeText = formatTime(hoverTime);
  const separator = "  ·  ";

  ctx.save();
  ctx.globalAlpha = scrubOpacity;
  ctx.font = '400 13px "SF Mono", Menlo, monospace';

  const valueW = ctx.measureText(valueText).width;
  const sepW = ctx.measureText(separator).width;
  const timeW = ctx.measureText(timeText).width;
  const totalW = valueW + sepW + timeW;

  let tx = hoverX - totalW / 2;
  const minX = pad.left + 4;
  const dotRightEdge = liveDotX === undefined ? layout.w - pad.right : liveDotX + 7;
  const maxX = dotRightEdge - totalW;

  if (tx < minX) {
    tx = minX;
  }

  if (tx > maxX) {
    tx = maxX;
  }

  const ty = pad.top + (tooltipY ?? 14) + 10;

  ctx.textAlign = "left";

  if (tooltipOutline === true) {
    ctx.strokeStyle = palette.tooltipBg;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeText(valueText, tx, ty);
    ctx.strokeText(separator + timeText, tx + valueW, ty);
  }

  ctx.fillStyle = palette.tooltipText;
  ctx.fillText(valueText, tx, ty);

  ctx.fillStyle = palette.gridLabel;
  ctx.fillText(separator + timeText, tx + valueW, ty);

  ctx.restore();
};

/** Multi-series crosshair: vertical line + inline text at top, matching single-series style. */
export const drawMultiCrosshair = (
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  hoverX: number,
  hoverTime: number,
  entries: MultiSeriesHoverEntry[],
  formatValue: (v: number) => string,
  formatTime: (t: number) => string,
  scrubOpacity: number,
  tooltipY?: number,
  tooltipOutline?: boolean,
  liveDotX?: number,
) => {
  if (scrubOpacity < 0.01 || entries.length === 0) {
    return;
  }

  const { h, pad, toY } = layout;

  ctx.save();
  ctx.globalAlpha = scrubOpacity * 0.5;
  ctx.strokeStyle = palette.crosshairLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hoverX, pad.top);
  ctx.lineTo(hoverX, h - pad.bottom);
  ctx.stroke();
  ctx.restore();

  const dotRadius = 4 * Math.min(scrubOpacity * 3, 1);

  if (dotRadius > 0.5) {
    ctx.globalAlpha = 1;

    for (const entry of entries) {
      const y = toY(entry.value);
      ctx.beginPath();
      ctx.arc(hoverX, y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = entry.color;
      ctx.fill();
    }
  }

  if (scrubOpacity < 0.1 || layout.w < 300) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = scrubOpacity;
  ctx.font = '400 13px "SF Mono", Menlo, monospace';
  ctx.textAlign = "left";

  const segments = buildSegments(palette, formatTime(hoverTime), entries, formatValue);

  const segWidths = segments.map((seg) =>
    seg.isDot === true ? DOT_SEGMENT_WIDTH : ctx.measureText(seg.text).width,
  );

  let totalW = 0;

  for (const w of segWidths) {
    totalW += w;
  }

  let tx = hoverX - totalW / 2;
  const minX = pad.left + 4;
  const dotRightEdge = liveDotX === undefined ? layout.w - pad.right : liveDotX + 7;
  const maxX = dotRightEdge - totalW;

  if (tx < minX) {
    tx = minX;
  }

  if (tx > maxX) {
    tx = maxX;
  }

  const ty = pad.top + (tooltipY ?? 14) + 10;

  if (tooltipOutline !== false) {
    ctx.strokeStyle = palette.tooltipBg;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    let ox = tx;

    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i];

      if (seg.isDot !== true) {
        ctx.strokeText(seg.text, ox, ty);
      }

      ox += segWidths[i];
    }
  }

  let ox = tx;

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];

    if (seg.isDot === true) {
      ctx.beginPath();
      ctx.arc(ox + 4, ty - 4, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = seg.color;
      ctx.fill();
    } else {
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, ox, ty);
    }

    ox += segWidths[i];
  }

  ctx.restore();
};
