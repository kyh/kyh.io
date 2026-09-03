import { NextResponse, type NextRequest } from "next/server";

import { acceptsMarkdown } from "@/lib/content-negotiation";

// Agent discovery on the homepage:
// - Link header (RFC 8288) advertises the markdown view as an alternate.
// - Content negotiation: agents sending `Accept: text/markdown` get the
//   markdown version while browsers keep the HTML default.
// - `Vary: Accept` is appended (never set) on both branches so it joins Next's
//   own `rsc, next-router-*` values instead of replacing them. Without it a CDN
//   can hand the cached HTML to an agent asking for markdown, or vice versa.
export const middleware = (req: NextRequest) => {
  if (acceptsMarkdown(req.headers.get("accept"))) {
    const res = NextResponse.rewrite(new URL("/markdown", req.url));
    res.headers.append("Vary", "Accept");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set(
    "Link",
    `</markdown>; rel="alternate"; type="text/markdown"; title="Markdown version for agents"`,
  );
  res.headers.append("Vary", "Accept");
  return res;
};

export const config = {
  matcher: "/",
};
