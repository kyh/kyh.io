import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { createElement } from "react";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

const INK = "#1d1d1f";
const PAPER = "#fcf3cf";
const RED = "#c41e1a";

// Cached, so the card prerenders: a file read alone keeps it from the build.
// Bytes come back out of the cache as plain arrays, so they go in as base64.
const assets = async () => {
  "use cache";
  cacheLife("max");
  // Literal paths: a computed one makes the build trace the whole project.
  const [anton, blackletter, fraunces, jar, mono] = await Promise.all([
    readFile(path.join(process.cwd(), "src/assets/anton.ttf")),
    readFile(path.join(process.cwd(), "src/assets/unifraktur-maguntia.ttf")),
    readFile(path.join(process.cwd(), "src/assets/fraunces-semibold.ttf")),
    readFile(path.join(process.cwd(), "src/assets/og-jar.jpg")),
    readFile(path.join(process.cwd(), "src/assets/plex-mono-medium.ttf")),
  ]);
  return {
    anton: anton.toString("base64"),
    blackletter: blackletter.toString("base64"),
    fraunces: fraunces.toString("base64"),
    jar: jar.toString("base64"),
    mono: mono.toString("base64"),
  };
};

// Satori draws only a plain <img>; next/image (what the lint rule wants) can't render here.
const jarImage = (base64: string) =>
  createElement("img", {
    alt: "",
    height: 368,
    src: `data:image/jpeg;base64,${base64}`,
    style: { objectFit: "cover" },
    width: 440,
  });

const label = { fontFamily: "Plex Mono", fontSize: 15, letterSpacing: 1.5 };

const OpengraphImage = async () => {
  const { anton, blackletter, fraunces, jar, mono } = await assets();
  return new ImageResponse(
    <div
      style={{
        background: PAPER,
        color: INK,
        display: "flex",
        flexDirection: "column",
        fontFamily: "Fraunces",
        height: "100%",
        padding: "30px 48px 0",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
        <div style={label}>VOL. I · NO. 69</div>
        <div style={{ background: INK, display: "flex", flex: 1, height: 1 }} />
        <div style={{ fontFamily: "Blackletter", fontSize: 64, lineHeight: 1 }}>
          {siteConfig.name}
        </div>
        <div style={{ background: INK, display: "flex", flex: 1, height: 1 }} />
        <div style={label}>PRICE: ONE SECRET</div>
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          marginTop: 14,
          position: "relative",
        }}
      >
        <div style={{ background: INK, display: "flex", height: 5, width: "100%" }} />
        <div
          style={{
            ...label,
            background: PAPER,
            border: `1.5px solid ${INK}`,
            padding: "4px 12px",
            position: "absolute",
          }}
        >
          PAID ADVERTISEMENT
        </div>
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 34 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                background: RED,
                color: PAPER,
                fontFamily: "Anton",
                fontSize: 24,
                padding: "2px 12px",
                transform: "rotate(-2deg)",
              }}
            >
              EXCLUSIVE
            </div>
          </div>
          <div style={{ fontFamily: "Anton", fontSize: 98, lineHeight: 0.92, marginTop: 16 }}>
            {`${siteConfig.tagline.toUpperCase()}.`}
          </div>
          <div style={{ fontSize: 23, lineHeight: 1.2, marginTop: 20 }}>
            {siteConfig.description}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ border: `2px solid ${INK}`, display: "flex" }}>{jarImage(jar)}</div>
          <div style={{ ...label, fontSize: 13, marginTop: 10 }}>
            PICTURED: THE HONEYPOT, MOMENTS BEFORE IT WORKED.
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { data: Buffer.from(anton, "base64"), name: "Anton", style: "normal", weight: 400 },
        {
          data: Buffer.from(blackletter, "base64"),
          name: "Blackletter",
          style: "normal",
          weight: 400,
        },
        { data: Buffer.from(fraunces, "base64"), name: "Fraunces", style: "normal", weight: 600 },
        { data: Buffer.from(mono, "base64"), name: "Plex Mono", style: "normal", weight: 500 },
      ],
    },
  );
};

export default OpengraphImage;
