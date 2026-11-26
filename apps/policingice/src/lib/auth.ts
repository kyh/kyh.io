import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, formCsrfMiddleware } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { nextCookies } from "better-auth/next-js";
import { anonymous, emailOTP } from "better-auth/plugins";

import { db } from "@/db/drizzle-client";
import { EMAIL_MODE, EMAIL_OFF_WARNING, sendEmail } from "@/lib/send-email";

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

const sendsEmail = EMAIL_MODE.kind !== "off";

if (!sendsEmail) {
  console.warn(`[email] ${EMAIL_OFF_WARNING}`);
}

// WARNING: better-auth checks no origin on a code's sign-in, and answers success when its sender throws
const guardSignInCodes = createAuthMiddleware(async (ctx) => {
  if (ctx.path === "/sign-in/email-otp") {
    await formCsrfMiddleware(ctx);
  }

  if (ctx.path === "/email-otp/send-verification-otp" && !sendsEmail) {
    throw APIError.from("SERVICE_UNAVAILABLE", {
      code: "EMAIL_DISABLED",
      message: "Sign-in by email is unavailable: this site sends no email.",
    });
  }
});

export const auth = betterAuth({
  baseURL: baseUrl,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  hooks: { before: guardSignInCodes },
  plugins: [
    anonymous(),
    emailOTP({
      disableSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "sign-in") {
          return;
        }

        await sendEmail({
          subject: "Your policingice sign-in code",
          text: `Your sign-in code is ${otp}. It expires in 5 minutes. If you didn't ask for it, ignore this email.`,
          to: email,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;

export type Session = Auth["$Infer"]["Session"];

export const getSession = cache(
  async () => await auth.api.getSession({ headers: await headers() }),
);
