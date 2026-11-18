import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { user as userTable } from "@/db/drizzle-schema";
import { env } from "@/lib/env";
import { claimInviteCode, inviteFromCookie, validateInviteCode } from "@/lib/invite";

const vercelBaseUrl = () => {
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

const twitterProvider = () => {
  if (env.X_CLIENT_ID === undefined || env.X_CLIENT_SECRET === undefined) {
    return;
  }

  return { clientId: env.X_CLIENT_ID, clientSecret: env.X_CLIENT_SECRET };
};

interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  accessType: "offline";
  prompt: "select_account consent";
}

const googleProvider = () => {
  if (env.GOOGLE_CLIENT_ID === undefined || env.GOOGLE_CLIENT_SECRET === undefined) {
    return;
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

const cookieHeader = (ctx: { headers?: Headers; request?: Request } | null | undefined) =>
  ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie");

const createAuth = (
  database: NonNullable<typeof db>,
  twitter: TwitterProviderConfig,
  secret: string,
) =>
  betterAuth({
    account: {
      accountLinking: { allowDifferentEmails: true, enabled: true },
    },
    advanced: { cookiePrefix: "autoplay" },
    baseURL: baseUrl,
    database: drizzleAdapter(database, { provider: "sqlite" }),
    databaseHooks: {
      user: {
        create: {
          after: async (user, ctx) => {
            const code = inviteFromCookie(cookieHeader(ctx));

            if (code === undefined) {
              return;
            }

            if (!(await claimInviteCode(code))) {
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
      cookieCache: { enabled: true, maxAge: 60 },
    },
    socialProviders: {
      twitter: {
        clientId: twitter.clientId,
        clientSecret: twitter.clientSecret,
        disableDefaultScope: true,
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
        invitedByCode: { input: false, required: false, type: "string" },
        username: { required: false, type: "string" },
      },
    },
  });

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
