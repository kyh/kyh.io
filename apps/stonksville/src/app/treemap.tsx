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
};

function CustomContent({
  x,
  y,
  width,
  height,
  index,
  name,
  value,
  total,
}: ContentProps) {
  const pct = ((value / total) * 100).toFixed(0);
  const showLabel = width > 50 && height > 30;
  const showPct = width > 40 && height > 20;
  const color = COLORS[index % COLORS.length];

  const padding = 4;
  const availableWidth = width - padding * 2;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={4}
        stroke="var(--color-background)"
        strokeWidth={2}
      />
      {showLabel ? (
        <foreignObject
          x={x + padding}
          y={y + padding}
          width={availableWidth}
          height={height - padding * 2}
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
                color: "white",
                fontSize: 12,
                fontWeight: 500,
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
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 10,
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

  const data = useMemo(
    () => segments.map((s) => ({ name: s.label, size: s.value })),
    [segments],
  );

  return (
    <div className="h-48 w-full sm:h-64">
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
            />
          }
        />
      </ResponsiveContainer>
    </div>
  );
}
