import { NextResponse, type NextRequest } from "next/server";

// Agent discovery on the homepage:
// - Link header (RFC 8288) advertises the markdown view as an alternate.
// - Content negotiation: agents sending `Accept: text/markdown` get the
//   markdown version while browsers keep the HTML default.
export const middleware = (req: NextRequest) => {
  const accept = req.headers.get("accept") ?? "";

  if (accept.includes("text/markdown")) {
    return NextResponse.rewrite(new URL("/markdown", req.url));
  }

  const res = NextResponse.next();
  res.headers.set(
    "Link",
    `</markdown>; rel="alternate"; type="text/markdown"; title="Markdown version for agents"`,
  );
  return res;
};

export const config = {
  matcher: "/",
};
