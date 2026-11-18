import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { acceptsMarkdown } from "@/lib/content-negotiation";
import { discoveryLinks } from "@/lib/openapi";

export const middleware = (req: NextRequest) => {
  if (acceptsMarkdown(req.headers.get("accept"))) {
    const res = NextResponse.rewrite(new URL("/markdown", req.url));
    // WARNING: append Vary, never set it: setting drops Next's own keys and a CDN serves HTML and Markdown to the wrong client.
    res.headers.append("Vary", "Accept");

    return res;
  }

  const res = NextResponse.next();
  res.headers.set(
    "Link",
    [
      `</markdown>; rel="alternate"; type="text/markdown"; title="Markdown version for agents"`,
      ...discoveryLinks,
    ].join(", "),
  );
  res.headers.append("Vary", "Accept");

  return res;
};

export const config = {
  matcher: "/",
};
