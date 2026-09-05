import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/drizzle-client";
import { env } from "@/lib/env";
import { invited } from "@/lib/invite";

// better-auth on autoplay's Turso database, same stack as policingice. The
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

/**
 * Google is never a way to sign in — only a grant linked to an X-signed-in
 * user, requested with the Gmail or YouTube scope when that source is
 * connected. Offline access with a forced consent screen is what makes Google
 * hand back a refresh token, without which the source dies within the hour.
 */
type GoogleProviderConfig = {
  clientId: string;
  clientSecret: string;
  accessType: "offline";
  prompt: "select_account consent";
};

const googleProvider = (): { google: GoogleProviderConfig } | undefined => {
  if (env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined) {
    return undefined;
  }
  return {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
    },
  };
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
    advanced: { cookiePrefix: "autoplay" },
    account: {
      // X accounts carry a synthesized email (see mapProfileToUser) that can
      // never match the Google one, so linking must not compare them.
      accountLinking: { enabled: true, allowDifferentEmails: true },
    },
    databaseHooks: {
      user: {
        create: {
          // The invite gate. Sign-in itself is open — an existing viewer just
          // signs in — but a user row is created only for a browser that gave
          // the invite code (src/lib/invite.ts). The OAuth callback carries
          // the browser's cookies, so the check lands here.
          before: async (user, ctx) => {
            const cookie = ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie");
            if (!invited(cookie)) {
              throw new APIError("FORBIDDEN", { message: "invite_required" });
            }
            return { data: user };
          },
        },
      },
    },
    user: {
      additionalFields: {
        // Must stay writable: better-auth drops any additional field marked
        // `input: false` from the provider profile mapping, so setting it here
        // would silently null the handle mapProfileToUser resolves — and the
        // owner check, which compares it to OWNER_X_USERNAME, would never pass.
        // Nothing else writes it; the only sign-in is X.
        username: { type: "string", required: false },
      },
    },
    socialProviders: {
      twitter: {
        clientId: twitter.clientId,
        clientSecret: twitter.clientSecret,
        // better-auth appends `scope` to its own defaults, which include
        // users.email — a scope X only grants to apps approved for email
        // access, and one this app has no use for (see mapProfileToUser).
        disableDefaultScope: true,
        scope: ["users.read", "tweet.read", "offline.access"],
        // X doesn't return an email; synthesize a stable unique one and keep
        // the handle for the owner check + OSD.
        mapProfileToUser: (profile) => ({
          name: profile.data.name,
          username: profile.data.username,
          email: `${profile.data.username.toLowerCase()}@x.autoplay.invalid`,
          image: profile.data.profile_image_url,
        }),
      },
      ...googleProvider(),
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
