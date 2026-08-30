import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/drizzle-client";
import { env } from "@/lib/env";

// better-auth on feedreel's Turso database, same stack as policingice. The
// only sign-in method is X (Twitter); the provider's tokens land in the
// `account` table, where src/lib/x-account.ts reads and refreshes them for
// timeline calls. Auth requires the database — without TURSO_DATABASE_URL
// there is nothing to store users in, so `auth` is undefined and the UI
// keeps sign-in gated behind the setup checklist.

const baseUrl =
  env.APP_URL ??
  (process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === "preview"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3005");

type TwitterProviderConfig = {
  clientId: string;
  clientSecret: string;
};

const twitterProvider = (): TwitterProviderConfig | undefined => {
  if (env.X_CLIENT_ID === undefined || env.X_CLIENT_SECRET === undefined) return undefined;
  return { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET };
};

const createAuth = (
  database: NonNullable<typeof db>,
  twitter: TwitterProviderConfig,
  secret: string,
) =>
  betterAuth({
    database: drizzleAdapter(database, { provider: "sqlite" }),
    baseURL: baseUrl,
    secret,
    plugins: [nextCookies()],
    // Both this app and policingice run on localhost; a distinct cookie
    // prefix keeps their sessions from clobbering each other in dev.
    advanced: { cookiePrefix: "feedreel" },
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
      },
    },
    socialProviders: {
      twitter: {
        clientId: twitter.clientId,
        clientSecret: twitter.clientSecret,
        scope: ["users.read", "tweet.read", "offline.access"],
        // X doesn't return an email; synthesize a stable unique one and keep
        // the handle for the owner check + OSD.
        mapProfileToUser: (profile) => ({
          name: profile.data.name,
          username: profile.data.username,
          email: `${profile.data.username.toLowerCase()}@x.feedreel.invalid`,
          image: profile.data.profile_image_url,
        }),
      },
    },
  });

// better-auth falls back to a shared default secret and then throws on every
// request when NODE_ENV is production — which is every Vercel deploy. Gate on
// the secret too so a half-filled .env stays OFF AIR instead of erroring.
const buildAuth = () => {
  if (db === undefined) return undefined;
  const secret = env.BETTER_AUTH_SECRET;
  if (secret === undefined) return undefined;
  const twitter = twitterProvider();
  if (twitter === undefined) return undefined;
  return createAuth(db, twitter, secret);
};

export const auth = buildAuth();

export const getSession = cache(async () => {
  if (auth === undefined) return null;
  return auth.api.getSession({ headers: await headers() });
});
