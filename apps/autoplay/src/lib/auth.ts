import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { user as userTable } from "@/db/drizzle-schema";
import { env } from "@/lib/env";
import { claimInviteCode, inviteFromCookie, validateInviteCode } from "@/lib/invite";

// better-auth on autoplay's Turso database, same stack as policingice. The
// only sign-in method is X (Twitter); the provider's tokens land in the
// `account` table, where src/lib/x-account.ts reads and refreshes them for
// timeline calls. Auth requires the database — without TURSO_DATABASE_URL
// there is nothing to store users in, so `auth` is undefined and the UI
// keeps sign-in gated behind the setup checklist.

const vercelBaseUrl = (): string => {
  if (env.VERCEL_ENV === "production") {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV === "preview") {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3005";
};

const baseUrl = env.APP_URL ?? vercelBaseUrl();

interface TwitterProviderConfig {
  clientId: string;
  clientSecret: string;
}

const twitterProvider = (): TwitterProviderConfig | undefined => {
  if (env.X_CLIENT_ID === undefined || env.X_CLIENT_SECRET === undefined) {
    return undefined;
  }
  return { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET };
};

/**
 * Google is never a way to sign in — only a grant linked to an X-signed-in
 * user, requested with the Gmail or YouTube scope when that source is
 * connected. Offline access with a forced consent screen is what makes Google
 * hand back a refresh token, without which the source dies within the hour.
 */
interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  accessType: "offline";
  prompt: "select_account consent";
}

const googleProvider = (): { google: GoogleProviderConfig } | undefined => {
  if (env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined) {
    return undefined;
  }
  return {
    google: {
      accessType: "offline",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account consent",
    },
  };
};

/** The browser's cookies as the hook sees them: on the request, or on the context alone. */
const cookieHeader = (ctx: { headers?: Headers; request?: Request } | null | undefined) =>
  ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie");

const createAuth = (
  database: NonNullable<typeof db>,
  twitter: TwitterProviderConfig,
  secret: string,
) =>
  betterAuth({
    account: {
      // X accounts carry a synthesized email (see mapProfileToUser) that can
      // never match the Google one, so linking must not compare them.
      accountLinking: { allowDifferentEmails: true, enabled: true },
    },
    // Both this app and policingice run on localhost; a distinct cookie
    // prefix keeps their sessions from clobbering each other in dev.
    advanced: { cookiePrefix: "autoplay" },
    baseURL: baseUrl,
    database: drizzleAdapter(database, { provider: "sqlite" }),
    databaseHooks: {
      user: {
        create: {
          // The invite gate. Sign-in itself is open — an existing viewer just
          // signs in — but a user row is created only for a browser whose
          // invite cookie names a code with a use left (src/lib/invite.ts).
          // The OAuth callback carries the browser's cookies, so the check
          // lands here. Validate before, claim after: a sign-up that fails
          // between the two must not burn a code.
          after: async (user, ctx) => {
            const code = inviteFromCookie(cookieHeader(ctx));
            if (code === undefined) {
              return;
            }
            if (!(await claimInviteCode(code))) {
              // Lost the race for the last use: no account after all.
              await database.delete(userTable).where(eq(userTable.id, user.id));
              throw new APIError("CONFLICT", { message: "invite_spent" });
            }
            await database
              .update(userTable)
              .set({ invitedByCode: code })
              .where(eq(userTable.id, user.id));
          },
          before: async (user, ctx) => {
            const code = inviteFromCookie(cookieHeader(ctx));
            if (code === undefined || (await validateInviteCode(code)) === undefined) {
              throw new APIError("FORBIDDEN", { message: "invite_required" });
            }
            return { data: user };
          },
        },
      },
    },
    plugins: [nextCookies()],
    secret,
    session: {
      // Every heartbeat, program and chunk asks who is asking. A minute of
      // signed cookie spares the database that read; nothing here needs a
      // revocation to land faster.
      cookieCache: { enabled: true, maxAge: 60 },
    },
    socialProviders: {
      twitter: {
        clientId: twitter.clientId,
        clientSecret: twitter.clientSecret,
        // better-auth appends `scope` to its own defaults, which include
        // users.email — a scope X only grants to apps approved for email
        // access, and one this app has no use for (see mapProfileToUser).
        disableDefaultScope: true,
        // X doesn't return an email; synthesize a stable unique one and keep
        // the handle for the owner check + OSD.
        mapProfileToUser: (profile) => ({
          email: `${profile.data.username.toLowerCase()}@x.autoplay.invalid`,
          image: profile.data.profile_image_url,
          name: profile.data.name,
          username: profile.data.username,
        }),
        scope: ["users.read", "tweet.read", "offline.access"],
      },
      ...googleProvider(),
    },
    user: {
      additionalFields: {
        // Written by the sign-up hook once the invite is claimed; never by input.
        invitedByCode: { input: false, required: false, type: "string" },
        // Must stay writable: better-auth drops any additional field marked
        // `input: false` from the provider profile mapping, so setting it here
        // would silently null the handle mapProfileToUser resolves — and the
        // owner check, which compares it to OWNER_X_USERNAME, would never pass.
        // Nothing else writes it; the only sign-in is X.
        username: { required: false, type: "string" },
      },
    },
  });

// better-auth falls back to a shared default secret and then throws on every
// request when NODE_ENV is production — which is every Vercel deploy. Gate on
// the secret too so a half-filled .env stays OFF AIR instead of erroring.
const buildAuth = () => {
  if (db === undefined) {
    return;
  }
  const secret = env.BETTER_AUTH_SECRET;
  if (secret === undefined) {
    return;
  }
  const twitter = twitterProvider();
  if (twitter === undefined) {
    return;
  }
  return createAuth(db, twitter, secret);
};

export const auth = buildAuth();

export const getSession = cache(async () => {
  if (auth === undefined) {
    return null;
  }
  return auth.api.getSession({ headers: await headers() });
});
