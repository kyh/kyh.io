import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
// The default adapter entry reads `db._.fullSchema`, gone in drizzle 1.0; relations-v2 reads `db._.relations`.
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";

import { db } from "@/db/drizzle-client";

const resolveBaseUrl = () => {
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

const baseUrl = resolveBaseUrl();

export const auth = betterAuth({
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [anonymous(), nextCookies()],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
