import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// The invite. Sign-in is X, so the gate is not on the sign-in but on the
// account: a new user is created only if the browser carries this cookie,
// which it gets by giving the code. The cookie is a signature over the code,
// not the code itself, so it cannot be minted without the secret and stops
// being valid the moment the code changes.

export const INVITE_COOKIE = "autoplay.invite";
/** Long enough to get through X's consent screen and back. */
export const INVITE_COOKIE_MAX_AGE = 3600;

const sign = (code: string, secret: string): string =>
  createHmac("sha256", secret).update(`invite:${code}`).digest("base64url");

/** The cookie value for the right code, or undefined for a wrong one. */
export const inviteToken = (code: string): string | undefined => {
  const expected = env.INVITE_CODE;
  const secret = env.BETTER_AUTH_SECRET;
  if (expected === undefined || secret === undefined) return undefined;
  const given = Buffer.from(code.trim().toLowerCase());
  const wanted = Buffer.from(expected.toLowerCase());
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return undefined;
  return sign(expected.toLowerCase(), secret);
};

/** Whether a cookie header carries a valid invite; true when no code is required. */
export const invited = (cookieHeader: string | null | undefined): boolean => {
  const expected = env.INVITE_CODE;
  const secret = env.BETTER_AUTH_SECRET;
  if (expected === undefined || secret === undefined) return true;
  const value = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${INVITE_COOKIE}=`))
    ?.slice(INVITE_COOKIE.length + 1);
  if (value === undefined) return false;
  const wanted = sign(expected.toLowerCase(), secret);
  const given = Buffer.from(decodeURIComponent(value));
  return given.length === Buffer.from(wanted).length && timingSafeEqual(given, Buffer.from(wanted));
};
