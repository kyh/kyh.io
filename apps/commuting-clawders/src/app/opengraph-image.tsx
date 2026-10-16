import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

import { formatCount } from "@/lib/format";
import { standings } from "@/lib/standings";

export const alt = "Commuting Clawders: Keep Clawd running";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };

const NAVY = "#1a1f3a";

const asset = (file: string) => readFile(path.join(process.cwd(), file));

// Cached, so the card prerenders: a file read alone keeps it from the build.
// Bytes come back out of the cache as plain arrays, so the art goes in as base64.
const assets = async () => {
  "use cache";
  cacheLife("max");
  const [font, art] = await Promise.all([
    asset("src/assets/titan-one.ttf"),
    asset("public/share.jpg"),
  ]);
  return { art: art.toString("base64"), font: font.toString("base64") };
};

// The record holder, refreshed every five minutes: a share card needn't be live.
const recordHolder = async () => {
  "use cache";
  cacheLife({ expire: 86_400, revalidate: 300 });
  const [leader] = await standings();
  return leader;
};

const OpengraphImage = async () => {
  const [{ art, font }, leader] = await Promise.all([assets(), recordHolder()]);
  return new ImageResponse(
    <div style={{ display: "flex", height: "100%", position: "relative", width: "100%" }}>
      <img
        alt=""
        height={630}
        src={`data:image/jpeg;base64,${art}`}
        style={{ objectFit: "cover", position: "absolute" }}
        width={1200}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          paddingTop: 48,
          width: "100%",
        }}
      >
        <div
          style={{
            WebkitTextStroke: `18px ${NAVY}`,
            alignItems: "center",
            color: "white",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Titan One",
            lineHeight: 1,
            transform: "rotate(-2deg)",
          }}
        >
          <span style={{ fontSize: 84 }}>Commuting</span>
          <span style={{ fontSize: 150 }}>Clawders</span>
        </div>
        <div
          style={{
            background: "rgba(24, 34, 74, 0.72)",
            borderRadius: 999,
            color: "white",
            fontFamily: "Titan One",
            fontSize: 34,
            marginTop: 26,
            padding: "10px 30px",
          }}
        >
          Keep Clawd running
        </div>
      </div>
      {leader ? (
        <div
          style={{
            background: "#ffc61f",
            borderRadius: 999,
            bottom: 36,
            boxShadow: "inset 0 -6px 0 #c98a00",
            color: NAVY,
            display: "flex",
            fontFamily: "Titan One",
            fontSize: 30,
            padding: "12px 28px 16px",
            position: "absolute",
            right: 36,
          }}
        >
          {`Record: ${leader.name}, ${formatCount(leader.tokens)} tokens`}
        </div>
      ) : null}
    </div>,
    {
      ...size,
      fonts: [
        { data: Buffer.from(font, "base64"), name: "Titan One", style: "normal", weight: 400 },
      ],
    },
  );
};

export default OpengraphImage;
