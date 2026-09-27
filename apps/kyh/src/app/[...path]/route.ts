import type { NextRequest } from "next/server";

import { absoluteUrl } from "@/lib/config";
import { prefersHtml } from "@/lib/content-negotiation";
import { buildNotFoundMarkdown } from "@/lib/markdown";
import { buildNotFoundHtml } from "@/lib/not-found-html";

/**
 * Catch-all 404. Static routes and files in `public/` are matched first, so this
 * only ever sees paths that genuinely do not exist.
 *
 * Next's default `not-found` renders the app shell, which means a lost agent pays
 * for the whole homepage bundle to be told nothing is there. This returns a real
 * 404 with a short body instead: HTML for browsers, markdown for everything else.
 */
const handle = (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const html = prefersHtml(req.headers.get("accept"));

  const headers = new Headers({
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Type": html ? "text/html; charset=utf-8" : "text/markdown; charset=utf-8",
    Link: `<${absoluteUrl("/llms.txt")}>; rel="help"; type="text/plain", <${absoluteUrl("/sitemap.xml")}>; rel="index"; type="application/xml"`,
    Vary: "Accept",
    "X-Robots-Tag": "noindex, follow",
  });

  const body = html ? buildNotFoundHtml(pathname) : buildNotFoundMarkdown(pathname);

  return new Response(body, { headers, status: 404 });
};

export const GET = handle;
export const HEAD = handle;
