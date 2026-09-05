import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload } from "@/lib/api-contract";
import { inviteRequestSchema } from "@/lib/api-contract";
import {
  INVITE_COOKIE,
  INVITE_COOKIE_MAX_AGE,
  inviteCookieValue,
  validateInviteCode,
} from "@/lib/invite";

// Turns an invite code into the cookie that lets an account be created. The
// use is not taken here — only once the sign-up that follows succeeds.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = inviteRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Expected { code: string }");
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
