import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties } from "react";

import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site-config";

export const alt = `Autoplay — ${siteConfig.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const sunkenBorder: CSSProperties = {
  borderTop: "2px solid #808080",
  borderLeft: "2px solid #808080",
  borderBottom: "2px solid #ffffff",
  borderRight: "2px solid #ffffff",
  boxShadow: "inset 1px 1px 0 #0a0a0a, inset -1px -1px 0 #dfdfdf",
};

const OpenGraphImage = async () => {
  const data = await readFile(join(process.cwd(), "src/app/geist-mono-bold.ttf"));
  const owner = env.OWNER_X_USERNAME === undefined ? "public access" : `@${env.OWNER_X_USERNAME}`;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 1200,
        height: 630,
        padding: 6,
        gap: 6,
        overflow: "hidden",
        backgroundColor: "#c0c0c0",
        borderTop: "2px solid #ffffff",
        borderLeft: "2px solid #dfdfdf",
        borderBottom: "2px solid #0a0a0a",
        borderRight: "2px solid #0a0a0a",
        fontFamily: "Geist Mono",
        fontWeight: 700,
        color: "#14001f",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: 1184,
          height: 40,
          flexShrink: 0,
          padding: "0 10px",
          gap: 16,
          backgroundImage: "linear-gradient(90deg, #ff2fb4 0%, #a63cf5 55%, #6a2fd4 100%)",
          borderBottom: "3px solid #14001f",
        }}
      >
        <div
          style={{
            display: "flex",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: 16,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#ffffff",
            textShadow: "1px 1px 0 rgba(0, 0, 0, 0.5)",
          }}
        >
          {`AUTOPLAY — CH 01 · X · ${owner}`}
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {["M2 8h6", "M1 1h8v8H1zM1 3h8", "M2 2l6 6M8 2L2 8"].map((path) => (
            <div
              key={path}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 22,
                backgroundColor: "#c0c0c0",
                borderTop: "2px solid #ffffff",
                borderLeft: "2px solid #ffffff",
                borderBottom: "2px solid #0a0a0a",
                borderRight: "2px solid #0a0a0a",
                boxShadow: "inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <path d={path} stroke="#14001f" strokeWidth="1.5" />
              </svg>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          ...sunkenBorder,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 1184,
          height: 522,
          flexShrink: 0,
          gap: 24,
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px)",
        }}
      >
        <div
          style={{
            fontSize: 154,
            lineHeight: 1,
            color: "#ff3ec8",
            textShadow: "0 0 24px rgba(0, 224, 255, 0.65)",
          }}
        >
          autoplay
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: 1060,
            fontSize: 28,
            lineHeight: 1.4,
            textAlign: "center",
            color: "#ffffff",
          }}
        >
          {siteConfig.description}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: 1184,
          height: 40,
          flexShrink: 0,
          paddingTop: 5,
          paddingBottom: 2,
          gap: 4,
          backgroundColor: "#c0c0c0",
          borderTop: "1px solid #ffffff",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        <div
          style={{
            ...sunkenBorder,
            display: "flex",
            alignItems: "center",
            width: 1032,
            height: 32,
            padding: "0 10px",
          }}
        >
          Every post is the next scene. The characters remember.
        </div>
        <div
          style={{
            ...sunkenBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 148,
            height: 32,
            color: "#ff3ec8",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          ● LIVE
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Geist Mono", data, weight: 700, style: "normal" }],
    },
  );
};

export default OpenGraphImage;
