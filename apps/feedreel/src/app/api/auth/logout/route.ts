import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfigFor } from "@/lib/auth-config";
import { SESSION_COOKIE, readSession } from "@/lib/session";
import { revokeToken } from "@/lib/x-api";

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const config = authConfigFor(request);
  const session = await readSession();
  if (config !== undefined && session !== undefined) {
    await revokeToken(config.client, session.accessToken);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
};
