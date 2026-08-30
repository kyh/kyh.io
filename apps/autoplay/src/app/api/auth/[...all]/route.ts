import { NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

const offline = async (): Promise<Response> =>
  NextResponse.json(
    {
      error: "Sign-in is not configured — set X_CLIENT_ID, X_CLIENT_SECRET and TURSO_DATABASE_URL",
    },
    { status: 503 },
  );

const handlers = auth === undefined ? { GET: offline, POST: offline } : toNextJsHandler(auth);

export const GET = handlers.GET;
export const POST = handlers.POST;
