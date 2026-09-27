import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties } from "react";

import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const alt = `Autoplay — ${siteConfig.description}`;
export const size = { height: 630, width: 1200 };
export const contentType = "image/png";

const sunkenBorder: CSSProperties = {
  borderBottom: "2px solid #ffffff",
  borderLeft: "2px solid #808080",
  borderRight: "2px solid #ffffff",
  borderTop: "2px solid #808080",
  boxShadow: "inset 1px 1px 0 #0a0a0a, inset -1px -1px 0 #dfdfdf",
};

const OpenGraphImage = async () => {
  const data = await readFile(path.join(process.cwd(), "src/app/geist-mono-bold.ttf"));
  const owner = env.OWNER_X_USERNAME === undefined ? "public access" : `@${env.OWNER_X_USERNAME}`;

  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#c0c0c0",
        borderBottom: "2px solid #0a0a0a",
        borderLeft: "2px solid #dfdfdf",
        borderRight: "2px solid #0a0a0a",
        borderTop: "2px solid #ffffff",
        color: "#14001f",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist Mono",
        fontWeight: 700,
        gap: 6,
        height: 630,
        overflow: "hidden",
        padding: 6,
        width: 1200,
      }}
    >
      <div
        style={{
          alignItems: "center",
          backgroundImage: "linear-gradient(90deg, #ff2fb4 0%, #a63cf5 55%, #6a2fd4 100%)",
          borderBottom: "3px solid #14001f",
          display: "flex",
          flexShrink: 0,
          gap: 16,
          height: 40,
          justifyContent: "space-between",
          padding: "0 10px",
          width: 1184,
        }}
      >
        <div
          style={{
            color: "#ffffff",
            display: "flex",
            fontSize: 16,
            letterSpacing: "0.2em",
            overflow: "hidden",
            textShadow: "1px 1px 0 rgba(0, 0, 0, 0.5)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {`AUTOPLAY — CH 01 · X · ${owner}`}
        </div>
        <div style={{ display: "flex", flexShrink: 0, gap: 3 }}>
          {["M2 8h6", "M1 1h8v8H1zM1 3h8", "M2 2l6 6M8 2L2 8"].map((glyph) => (
            <div
              key={glyph}
              style={{
                alignItems: "center",
                backgroundColor: "#c0c0c0",
                borderBottom: "2px solid #0a0a0a",
                borderLeft: "2px solid #ffffff",
                borderRight: "2px solid #0a0a0a",
                borderTop: "2px solid #ffffff",
                boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080",
                display: "flex",
                height: 22,
                justifyContent: "center",
                width: 24,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <path d={glyph} stroke="#14001f" strokeWidth="1.5" />
              </svg>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          ...sunkenBorder,
          alignItems: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          gap: 24,
          height: 522,
          justifyContent: "center",
          width: 1184,
        }}
      >
        <div
          style={{
            color: "#ff3ec8",
            fontSize: 154,
            lineHeight: 1,
            textShadow: "0 0 24px rgba(0, 224, 255, 0.65)",
          }}
        >
          autoplay
        </div>
        <div
          style={{
            color: "#ffffff",
            display: "flex",
            fontSize: 28,
            justifyContent: "center",
            lineHeight: 1.4,
            textAlign: "center",
            width: 1060,
          }}
        >
          {siteConfig.description}
        </div>
      </div>
      <div
        style={{
          backgroundColor: "#c0c0c0",
          borderTop: "1px solid #ffffff",
          display: "flex",
          flexShrink: 0,
          fontSize: 16,
          gap: 4,
          height: 40,
          lineHeight: 1,
          paddingBottom: 2,
          paddingTop: 5,
          width: 1184,
        }}
      >
        <div
          style={{
            ...sunkenBorder,
            alignItems: "center",
            display: "flex",
            height: 32,
            padding: "0 10px",
            width: 1032,
          }}
        >
          Every post is the next scene. The characters remember.
        </div>
        <div
          style={{
            ...sunkenBorder,
            alignItems: "center",
            color: "#ff3ec8",
            display: "flex",
            height: 32,
            justifyContent: "center",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            width: 148,
          }}
        >
          ● LIVE
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ data, name: "Geist Mono", style: "normal", weight: 700 }],
    },
  );
};

export default OpenGraphImage;
