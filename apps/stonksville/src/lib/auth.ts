import { cache } from "react";
import { headers } from "next/headers";
import { db } from "@/db/drizzle-client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, oAuthProxy } from "better-auth/plugins";
import { anonymous } from "better-auth/plugins";

const baseUrl =
  process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_ENV === "preview"
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  baseURL: baseUrl,
  secret: process.env.AUTH_SECRET ?? "",
  plugins: [
    oAuthProxy({
      currentURL: baseUrl,
      productionURL: `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "init.kyh.io"}`,
    }),
    admin(),
    anonymous(),
    nextCookies(),
  ],
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["expo://"],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
