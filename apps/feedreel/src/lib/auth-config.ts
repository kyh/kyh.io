import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import type { OauthClient } from "@/lib/x-api";

export type AuthConfig = {
  client: OauthClient;
  sessionSecret: string;
};

/** Undefined until the operator has supplied the X + session env keys. */
export const authConfigFor = (request: NextRequest): AuthConfig | undefined => {
  if (
    env.X_CLIENT_ID === undefined ||
    env.X_CLIENT_SECRET === undefined ||
    env.SESSION_SECRET === undefined
  ) {
    return undefined;
  }
  const origin = env.APP_URL ?? request.nextUrl.origin;
  return {
    client: {
      clientId: env.X_CLIENT_ID,
      clientSecret: env.X_CLIENT_SECRET,
      redirectUri: `${origin}/api/auth/callback`,
    },
    sessionSecret: env.SESSION_SECRET,
  };
};
