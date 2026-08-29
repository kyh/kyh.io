import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfigFor } from "@/lib/auth-config";
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  sealSession,
  sessionCookieOptions,
  unsealOauthTransaction,
} from "@/lib/session";
import type { Session } from "@/lib/session";
import { XApiError, exchangeCode, fetchViewer } from "@/lib/x-api";

const redirectHome = (request: NextRequest, error?: string): NextResponse => {
  const home = new URL("/", request.nextUrl.origin);
  if (error !== undefined) home.searchParams.set("error", error);
  const response = NextResponse.redirect(home);
  response.cookies.delete(OAUTH_COOKIE);
  return response;
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const config = authConfigFor(request);
  if (config === undefined) {
    return redirectHome(request, "X login is not configured — see .env.example");
  }

  const params = request.nextUrl.searchParams;
  const oauthError = params.get("error");
  if (oauthError !== null) {
    return redirectHome(request, `X denied the login: ${oauthError}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const sealed = request.cookies.get(OAUTH_COOKIE);
  if (code === null || state === null || sealed === undefined) {
    return redirectHome(request, "Login flow was interrupted — try again");
  }

  const transaction = unsealOauthTransaction(sealed.value, config.sessionSecret);
  if (transaction === undefined || transaction.state !== state) {
    return redirectHome(request, "Login state didn't match — try again");
  }

  try {
    const grant = await exchangeCode(
      { ...config.client, redirectUri: transaction.redirectUri },
      code,
      transaction.codeVerifier,
    );
    const viewer = await fetchViewer(grant.accessToken);

    const session: Session = {
      userId: viewer.id,
      name: viewer.name,
      username: viewer.username,
      accessToken: grant.accessToken,
      expiresAt: grant.expiresAt,
    };
    if (viewer.profileImageUrl !== undefined) session.profileImageUrl = viewer.profileImageUrl;
    if (grant.refreshToken !== undefined) session.refreshToken = grant.refreshToken;

    const response = redirectHome(request);
    response.cookies.set(
      SESSION_COOKIE,
      sealSession(session, config.sessionSecret),
      sessionCookieOptions,
    );
    return response;
  } catch (error) {
    const message = error instanceof XApiError ? error.message : "Login failed — try again";
    return redirectHome(request, message);
  }
};
