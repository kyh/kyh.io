import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, FeedPayload } from "@/lib/api-contract";
import { authConfigFor } from "@/lib/auth-config";
import { SESSION_COOKIE, readSession, sealSession, sessionCookieOptions } from "@/lib/session";
import type { Session } from "@/lib/session";
import { XApiError, fetchFeed, refreshGrant } from "@/lib/x-api";

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const config = authConfigFor(request);
  if (config === undefined) {
    return errorResponse(503, "X login is not configured — see .env.example");
  }
  let session = await readSession();
  if (session === undefined) {
    return errorResponse(401, "Not logged in");
  }

  // Access tokens live ~2h; refresh transparently and re-seal the cookie so
  // the session outlives the first token.
  let refreshed = false;
  if (session.expiresAt <= Date.now()) {
    if (session.refreshToken === undefined) {
      return errorResponse(401, "Session expired — log in again");
    }
    try {
      const grant = await refreshGrant(config.client, session.refreshToken);
      const next: Session = {
        ...session,
        accessToken: grant.accessToken,
        expiresAt: grant.expiresAt,
      };
      if (grant.refreshToken !== undefined) next.refreshToken = grant.refreshToken;
      session = next;
      refreshed = true;
    } catch (error) {
      const message = error instanceof XApiError ? error.message : "Token refresh failed";
      return errorResponse(401, `Session expired (${message}) — log in again`);
    }
  }

  try {
    const feed = await fetchFeed(session.accessToken, session.userId);
    const payload: FeedPayload = {
      source: feed.source,
      posts: feed.posts,
    };
    const response = NextResponse.json(payload);
    if (refreshed) {
      response.cookies.set(
        SESSION_COOKIE,
        sealSession(session, config.sessionSecret),
        sessionCookieOptions,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof XApiError) {
      const status = error.status === 429 ? 429 : 502;
      const hint =
        error.status === 429
          ? " (X rate limit — the free tier allows very few reads; wait 15 minutes)"
          : "";
      return errorResponse(status, `${error.message}${hint}`);
    }
    return errorResponse(502, "Failed to load the feed");
  }
};
