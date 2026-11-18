import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { inviteCode } from "@/db/drizzle-schema";
import { env } from "@/lib/env";

export const INVITE_COOKIE = "autoplay.invite";

/** Long enough to get through X's consent screen and back. */
export const INVITE_COOKIE_MAX_AGE = 3600;
const INVITE_CODE_LENGTH = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const normalizeInviteCode = (raw: string) => raw.trim().toUpperCase();

/** Six letters or digits: what sign-up accepts. Minted codes use the narrower alphabet; custom ones need not. */
export const isWellFormedInviteCode = (code: string) =>
  new RegExp(`^[A-Z0-9]{${INVITE_CODE_LENGTH}}$`, "u").test(code);

export const generateInviteCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  let code = "";

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return code;
};

const available = (now: number) =>
  and(
    isNull(inviteCode.revokedAt),
    or(isNull(inviteCode.expiresAt), gt(inviteCode.expiresAt, now)),
    or(isNull(inviteCode.maxUses), lt(inviteCode.usedCount, inviteCode.maxUses)),
  );

/**
 * Whether a code may be redeemed right now. Read-only; the message is the
 * same for unknown, spent, expired and revoked so a guess learns nothing.
 */
export const validateInviteCode = async (raw: string) => {
  const code = normalizeInviteCode(raw);

  if (!isWellFormedInviteCode(code) || db === undefined) {
    return;
  }

  const rows = await db
    .select({ id: inviteCode.id })
    .from(inviteCode)
    .where(and(eq(inviteCode.code, code), available(Date.now())))
    .limit(1);

  return rows.length === 0 ? undefined : code;
};

/** Take one use of `code`; false when it was spent, expired or revoked meanwhile. */
export const claimInviteCode = async (code: string) => {
  if (db === undefined) {
    return false;
  }

  const claimed = await db
    .update(inviteCode)
    .set({ usedCount: sql`${inviteCode.usedCount} + 1` })
    .where(and(eq(inviteCode.code, code), available(Date.now())))
    .returning({ id: inviteCode.id });

  return claimed.length > 0;
};

const sign = (code: string, secret: string) =>
  createHmac("sha256", secret).update(`invite:${code}`).digest("base64url");

/** The cookie value naming `code`, signed; undefined without a secret to sign with. */
export const inviteCookieValue = (code: string) => {
  const secret = env.BETTER_AUTH_SECRET;

  if (secret === undefined) {
    return;
  }

  return `${code}.${sign(code, secret)}` satisfies string | undefined;
};

/** The code a cookie header names, if its signature holds. */
export const inviteFromCookie = (cookieHeader?: string | null) => {
  const secret = env.BETTER_AUTH_SECRET;

  if (secret === undefined) {
    return;
  }

  const value = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${INVITE_COOKIE}=`))
    ?.slice(INVITE_COOKIE.length + 1);

  if (value === undefined) {
    return;
  }

  const [code, signature] = decodeURIComponent(value).split(".");

  if (code === undefined || signature === undefined || !isWellFormedInviteCode(code)) {
    return;
  }

  const expected = Buffer.from(sign(code, secret));
  const given = Buffer.from(signature);

  return given.length === expected.length && timingSafeEqual(given, expected) ? code : undefined;
};
