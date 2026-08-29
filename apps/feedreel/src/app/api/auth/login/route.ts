import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { authConfigFor } from "@/lib/auth-config";
import { OAUTH_COOKIE, oauthCookieOptions, sealOauthTransaction } from "@/lib/session";
import { OAUTH_SCOPES, X_AUTHORIZE_URL } from "@/lib/x-api";

export const GET = (request: NextRequest): NextResponse => {
  const config = authConfigFor(request);
  if (config === undefined) {
    const home = new URL("/", request.nextUrl.origin);
    home.searchParams.set("error", "X login is not configured — see .env.example");
    return NextResponse.redirect(home);
  }

  const state = randomBytes(16).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const authorizeUrl = new URL(X_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", config.client.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.client.redirectUri);
  authorizeUrl.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    OAUTH_COOKIE,
    sealOauthTransaction(
      { state, codeVerifier, redirectUri: config.client.redirectUri },
      config.sessionSecret,
    ),
    oauthCookieOptions,
  );
  return response;
};
