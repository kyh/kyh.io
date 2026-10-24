import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

import { ogImage } from "@/lib/og-video";
import { siteConfig } from "@/lib/site-config";

export const { alt } = ogImage;
export const size = { height: ogImage.height, width: ogImage.width };
export const contentType = "image/png";

const BACKGROUND = "#0e0a10";
const LINE = "#34d399";
const BET = "#facc15";

/**
 * The chart's shape, not its numbers: a fixed random walk, so the card needs no
 * market data at build and reads the same every time. No axis, no prices.
 */
const sparkline = (count: number, width: number, height: number) => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const values: number[] = [];
  let value = 0;
  for (let index = 0; index < count; index += 1) {
    value += (random() - 0.47) * 1.6;
    values.push(value);
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values
    .map((point, index) => {
      const x = (index / (count - 1)) * width;
      const y = height - ((point - min) / (max - min || 1)) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
};

// Cached, so the card prerenders: a file read alone keeps it from the build.
const fontData = async () => {
  "use cache";
  cacheLife("max");
  const font = await readFile(path.join(process.cwd(), "src/app/geist-mono-bold.ttf"));
  return font.toString("base64");
};

const CHART = { height: 260, width: 640 };
const bets = [
  { label: "2.0x", x: 700, y: 250 },
  { label: "3.5x", x: 790, y: 190 },
  { label: "1.5x", x: 880, y: 300 },
];

const OpenGraphImage = async () => {
  const data = Buffer.from(await fontData(), "base64");
  return new ImageResponse(
    <div
      style={{
        backgroundColor: BACKGROUND,
        backgroundImage:
          "linear-gradient(rgba(52,211,153,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.08) 1px, transparent 1px)",
        backgroundSize: "90px 60px",
        color: "#fafafa",
        display: "flex",
        fontFamily: "Geist Mono",
        height: size.height,
        position: "relative",
        width: size.width,
      }}
    >
      <svg
        height={CHART.height}
        style={{ left: 40, position: "absolute", top: 90 }}
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        width={CHART.width}
      >
        <path
          d={sparkline(80, CHART.width, CHART.height)}
          fill="none"
          stroke={LINE}
          strokeWidth={4}
        />
      </svg>
      <div
        style={{
          borderLeft: "2px dashed rgba(250,250,250,0.25)",
          height: 420,
          left: 680,
          position: "absolute",
          top: 0,
        }}
      />
      {bets.map((bet) => (
        <div
          key={bet.label}
          style={{
            alignItems: "center",
            backgroundColor: BET,
            color: BACKGROUND,
            display: "flex",
            flexDirection: "column",
            fontSize: 20,
            height: 60,
            justifyContent: "center",
            left: bet.x + 20,
            position: "absolute",
            top: bet.y,
            width: 86,
          }}
        >
          <div style={{ display: "flex" }}>$10</div>
          <div style={{ display: "flex", fontSize: 16 }}>{bet.label}</div>
        </div>
      ))}
      <div
        style={{
          bottom: 56,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          left: 64,
          position: "absolute",
        }}
      >
        <div style={{ color: LINE, display: "flex", fontSize: 72 }}>{siteConfig.name}</div>
        <div style={{ color: "rgba(250,250,250,0.7)", display: "flex", fontSize: 26 }}>
          Tap the grid. Bet where the price goes next.
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ data, name: "Geist Mono", style: "normal", weight: 700 }] },
  );
};

export default OpenGraphImage;
