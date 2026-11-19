import type { NextRequest } from "next/server";

import { absoluteUrl } from "@/lib/config";
import { prefersHtml } from "@/lib/content-negotiation";
import { buildNotFoundMarkdown } from "@/lib/markdown";
import { buildNotFoundHtml } from "@/lib/not-found-html";
import { todaysVideo } from "@/lib/todays-video";

const handle = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const html = prefersHtml(req.headers.get("accept"));

  const headers = new Headers({
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Type": html ? "text/html; charset=utf-8" : "text/markdown; charset=utf-8",
    Link: `<${absoluteUrl("/llms.txt")}>; rel="help"; type="text/plain", <${absoluteUrl("/sitemap.xml")}>; rel="index"; type="application/xml"`,
    Vary: "Accept",
    "X-Robots-Tag": "noindex, follow",
  });

  const body = html
    ? buildNotFoundHtml(pathname, await todaysVideo())
    : buildNotFoundMarkdown(pathname);

  return new Response(body, { headers, status: 404 });
};

export const GET = handle;
export const HEAD = handle;
