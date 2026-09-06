import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { inviteRequestSchema } from "@/lib/api-contract";
import {
  INVITE_COOKIE,
  INVITE_COOKIE_MAX_AGE,
  inviteCookieValue,
  validateInviteCode,
} from "@/lib/invite";
import { errorResponse, readBody } from "@/lib/route";

// Turns an invite code into the cookie that lets an account be created. The
// use is not taken here — only once the sign-up that follows succeeds.

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await readBody(request, inviteRequestSchema, "Expected { code: string }");
  if ("refused" in body) return body.refused;
  const code = await validateInviteCode(body.data.code);
  const value = code === undefined ? undefined : inviteCookieValue(code);
  if (value === undefined) return errorResponse(403, "That invite code isn't valid");
  const response = NextResponse.json({ ok: true });
  response.cookies.set(INVITE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: INVITE_COOKIE_MAX_AGE,
  });
  return response;
};
