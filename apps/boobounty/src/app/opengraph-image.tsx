import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

const font = (file: string) => readFile(path.join(process.cwd(), "src/assets", file));

// Cached, so the card prerenders: a file read alone keeps it from the build.
// Bytes come back out of the cache as plain arrays, so the fonts go in as base64.
const fonts = async () => {
  "use cache";
  cacheLife("max");
  const [regular, italic] = await Promise.all([
    font("instrument-serif.ttf"),
    font("instrument-serif-italic.ttf"),
  ]);
  return { italic: italic.toString("base64"), regular: regular.toString("base64") };
};

const OpengraphImage = async () => {
  const { italic, regular } = await fonts();
  return new ImageResponse(
    <div
      style={{
        background: "radial-gradient(circle at 50% 0%, #f6cf7c 0%, #f7f2e8 60%)",
        color: "#1f1a14",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Instrument Serif",
        height: "100%",
        justifyContent: "space-between",
        padding: 72,
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", fontSize: 44, gap: 16 }}>
        <svg height={34} viewBox="0 0 38 35" width={38}>
          <path
            d="M19 35 C7 26 0 19 0 10.5 C0 4.6 4.5 0 10 0 C14 0 17.2 2.3 19 5.6 C20.8 2.3 24 0 28 0 C33.5 0 38 4.6 38 10.5 C38 19 31 26 19 35 Z"
            fill="#e0a12f"
          />
        </svg>
        {siteConfig.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 104,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          <span>Your weights are air-gapped.</span>
          <span>
            <span style={{ color: "#a8661c", fontStyle: "italic" }}>Your engineers</span>
            &nbsp;aren’t.
          </span>
        </div>
        <div style={{ color: "#6b6156", fontSize: 36, fontStyle: "italic" }}>
          {siteConfig.tagline}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          data: Buffer.from(regular, "base64"),
          name: "Instrument Serif",
          style: "normal",
          weight: 400,
        },
        {
          data: Buffer.from(italic, "base64"),
          name: "Instrument Serif",
          style: "italic",
          weight: 400,
        },
      ],
    },
  );
};

export default OpengraphImage;
