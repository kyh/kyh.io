import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { createElement } from "react";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

// Cached, so the card prerenders: a file read alone keeps it from the build.
// Bytes come back out of the cache as plain arrays, so they go in as base64.
const assets = async () => {
  "use cache";
  cacheLife("max");
  const [font, jar] = await Promise.all([
    // Literal paths: a computed one makes the build trace the whole project.
    readFile(path.join(process.cwd(), "src/assets/inter-semibold.ttf")),
    readFile(path.join(process.cwd(), "public/honeypot.png")),
  ]);
  return { font: font.toString("base64"), jar: jar.toString("base64") };
};

// Satori draws only a plain <img>; next/image (what the lint rule wants) can't render here.
const jarImage = (base64: string) =>
  createElement("img", {
    alt: "",
    height: 630,
    src: `data:image/png;base64,${base64}`,
    style: { left: -330, position: "absolute", top: 0 },
    width: 1135,
  });

const OpengraphImage = async () => {
  const { font, jar } = await assets();
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#fcf3cf",
        color: "#1d1d1f",
        display: "flex",
        fontFamily: "Inter",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {jarImage(jar)}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          left: 640,
          position: "absolute",
          width: 500,
        }}
      >
        <div style={{ color: "#9a5200", fontSize: 30 }}>{siteConfig.name}</div>
        <div style={{ fontSize: 46, letterSpacing: -1.2, lineHeight: 1.1, marginTop: 14 }}>
          {`${siteConfig.tagline}.`}
        </div>
        <div style={{ color: "#6f6450", fontSize: 26, lineHeight: 1.35, marginTop: 20 }}>
          {siteConfig.description}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ data: Buffer.from(font, "base64"), name: "Inter", style: "normal", weight: 600 }],
    },
  );
};

export default OpengraphImage;
