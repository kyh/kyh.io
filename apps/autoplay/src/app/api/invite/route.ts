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

export const POST = async (request: NextRequest) => {
  const body = await readBody(request, inviteRequestSchema, "Expected { code: string }");

  if ("refused" in body) {
    return body.refused;
  }

  const code = await validateInviteCode(body.data.code);
  const value = code === null ? undefined : inviteCookieValue(code);

  if (value === undefined) {
    return errorResponse(403, "That invite code isn't valid");
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(INVITE_COOKIE, value, {
    httpOnly: true,
    maxAge: INVITE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
};
