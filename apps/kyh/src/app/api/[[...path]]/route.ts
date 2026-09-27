import type { NextRequest } from "next/server";

import { OPENAPI_PATH } from "@/lib/openapi";
import { buildNotFoundProblem } from "@/lib/problem";

// Nothing lives under /api. Without this, the root catch-all answers with a
// markdown 404, which API clients (and scanners probing for one) can't parse.
const handle = (req: NextRequest) =>
  Response.json(buildNotFoundProblem(req.nextUrl.pathname), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/problem+json",
      Link: `<${OPENAPI_PATH}>; rel="service-desc"; type="application/json"`,
    },
    status: 404,
  });

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
