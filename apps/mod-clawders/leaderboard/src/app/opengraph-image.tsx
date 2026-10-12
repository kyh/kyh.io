import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { formatCount } from "@/lib/format";
import { standings } from "@/lib/standings";

export const alt = "Clawders: Keep Clawd running";
export const contentType = "image/png";
export const size = { height: 630, width: 1200 };
export const revalidate = 300;

const NAVY = "#1a1f3a";

const asset = (file: string) => readFile(path.join(process.cwd(), file));

const OpengraphImage = async () => {
  const [font, art, [leader]] = await Promise.all([
    asset("src/assets/titan-one.ttf"),
    asset("public/share.jpg"),
    standings(),
  ]);
  return new ImageResponse(
    <div style={{ display: "flex", height: "100%", position: "relative", width: "100%" }}>
      <img
        alt=""
        height={630}
        src={`data:image/jpeg;base64,${art.toString("base64")}`}
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
            color: "white",
            fontFamily: "Titan One",
            fontSize: 150,
            lineHeight: 1,
            transform: "rotate(-2deg)",
          }}
        >
          Clawders
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
    { ...size, fonts: [{ data: font, name: "Titan One", style: "normal", weight: 400 }] },
  );
};

export default OpengraphImage;
