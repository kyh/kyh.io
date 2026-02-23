"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

const RechartsTreemap = dynamic(
  () => import("recharts").then((mod) => mod.Treemap),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);

type Segment = {
  label: string;
  value: number;
};

type TreemapProps = {
  segments: Segment[];
};

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted)",
];

type ContentProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  name: string;
  value: number;
  total: number;
  realValue: number;
};

function CustomContent({
  x,
  y,
  width,
  height,
  index,
  name,
  total,
  realValue,
}: ContentProps) {
  const pct = ((realValue / total) * 100).toFixed(0);
  const color = COLORS[index % COLORS.length];

  const padding = 6;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;

  const minDim = Math.min(availableWidth, availableHeight);
  const labelSize = Math.max(9, Math.min(16, Math.floor(minDim / 5)));
  const pctSize = Math.max(8, labelSize - 2);

  const showLabel = availableWidth > 30 && availableHeight > 20;
  const showPct = availableWidth > 30 && availableHeight > 30;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={6}
        stroke="var(--color-background)"
        strokeWidth={3}
      />
      {showLabel ? (
        <foreignObject
          x={x + padding}
          y={y + padding}
          width={availableWidth}
          height={availableHeight}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                color: "rgba(0,0,0,0.7)",
                fontSize: labelSize,
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.2,
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {name}
            </span>
            {showPct ? (
              <span
                style={{
                  color: "rgba(0,0,0,0.45)",
                  fontSize: pctSize,
                  marginTop: 2,
                }}
              >
                {pct}%
              </span>
            ) : null}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
}

export function Treemap({ segments }: TreemapProps) {
  const total = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments],
  );

  // Enforce a minimum visual size so tiny segments are still readable.
  // The real percentage is computed from `total` in CustomContent.
  const MIN_DISPLAY_PCT = 5;
  const minSize = (total * MIN_DISPLAY_PCT) / 100;

  const data = useMemo(
    () =>
      segments.map((s) => ({
        name: s.label,
        size: Math.max(s.value, minSize),
        realValue: s.value,
      })),
    [segments, minSize],
  );

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsTreemap
          data={data}
          dataKey="size"
          stroke="none"
          isAnimationActive={false}
          content={
            <CustomContent
              x={0}
              y={0}
              width={0}
              height={0}
              index={0}
              name=""
              value={0}
              total={total}
              realValue={0}
            />
          }
        />
      </ResponsiveContainer>
    </div>
  );
}
