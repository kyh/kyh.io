import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/config";
import { CARD_SIZE, cardRouteFor, cardRoutes, cardSlug } from "@/lib/og-card";

// One share card per canonical route (src/lib/og-card.ts), prerendered at build.
// The look follows public/og.jpg: Geist on a slate night that fades to black.

const FONT_DIR = "src/app/cards/[page]";

// Cached, so the cards prerender: a file read alone keeps a route from the build.
// Bytes come back out of the cache as plain arrays, so the fonts go in as base64.
const fonts = async () => {
  "use cache";
  cacheLife("max");
  const [regular, medium] = await Promise.all(
    ["Geist-Regular.ttf", "Geist-Medium.ttf"].map((file) =>
      readFile(path.join(process.cwd(), FONT_DIR, file)),
    ),
  );
  return { medium: medium?.toString("base64") ?? "", regular: regular?.toString("base64") ?? "" };
};

export const generateStaticParams = () =>
  cardRoutes.map((route) => ({ page: cardSlug(route.path) }));

export const GET = async (_request: Request, { params }: { params: Promise<{ page: string }> }) => {
  const { page } = await params;
  const route = cardRouteFor(page);
  if (!route) {
    return new Response("Not found", { status: 404 });
  }
  const { regular, medium } = await fonts();

  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#000000",
        backgroundImage:
          "radial-gradient(ellipse 120% 70% at 30% 0%, #1e293b 0%, #0f172a 45%, #020617 75%, #000000 100%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Geist",
        height: CARD_SIZE.height,
        justifyContent: "space-between",
        padding: "72px 112px",
        width: CARD_SIZE.width,
      }}
    >
      <div style={{ color: "#94a3b8", display: "flex", fontSize: 28, letterSpacing: "0.02em" }}>
        {siteConfig.siteName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 500, letterSpacing: "-0.02em" }}>
          {route.title}
        </div>
        <div
          style={{
            color: "#cbd5e1",
            display: "flex",
            fontSize: 34,
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          {route.description.replaceAll("`", "")}
        </div>
      </div>
      <div style={{ color: "#64748b", display: "flex", fontSize: 24 }}>{siteConfig.name}</div>
    </div>,
    {
      ...CARD_SIZE,
      fonts: [
        { data: Buffer.from(regular, "base64"), name: "Geist", style: "normal", weight: 400 },
        { data: Buffer.from(medium, "base64"), name: "Geist", style: "normal", weight: 500 },
      ],
    },
  );
};
