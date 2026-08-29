import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";

// Sealed-cookie sessions: the X tokens live in an AES-256-GCM encrypted
// httpOnly cookie instead of a database. Tampering breaks the auth tag,
// which reads as "logged out" — never as a partially trusted session.

export const SESSION_COOKIE = "feedreel_session";
export const OAUTH_COOKIE = "feedreel_oauth";

export const sessionSchema = z.object({
  userId: z.string(),
  name: z.string(),
  username: z.string(),
  profileImageUrl: z.string().optional(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  /** Unix ms after which accessToken must be refreshed before use. */
  expiresAt: z.number(),
});

export type Session = z.infer<typeof sessionSchema>;

/** In-flight OAuth transaction, sealed for the duration of the redirect dance. */
export const oauthTransactionSchema = z.object({
  state: z.string(),
  codeVerifier: z.string(),
  redirectUri: z.string(),
});

export type OauthTransaction = z.infer<typeof oauthTransactionSchema>;

const keyFor = (secret: string): Buffer => createHash("sha256").update(secret).digest();

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export const seal = (payload: string, secret: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
};

const unseal = (sealed: string, secret: string): string | undefined => {
  try {
    const raw = Buffer.from(sealed, "base64url");
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
};

export const sealSession = (session: Session, secret: string): string =>
  seal(JSON.stringify(session), secret);

export const unsealSession = (sealed: string, secret: string): Session | undefined => {
  const payload = unseal(sealed, secret);
  if (payload === undefined) return undefined;
  const parsed = sessionSchema.safeParse(JSON.parse(payload));
  return parsed.success ? parsed.data : undefined;
};

export const sealOauthTransaction = (transaction: OauthTransaction, secret: string): string =>
  seal(JSON.stringify(transaction), secret);

export const unsealOauthTransaction = (
  sealed: string,
  secret: string,
): OauthTransaction | undefined => {
  const payload = unseal(sealed, secret);
  if (payload === undefined) return undefined;
  const parsed = oauthTransactionSchema.safeParse(JSON.parse(payload));
  return parsed.success ? parsed.data : undefined;
};

/** Session from the request cookie, or undefined when logged out/unconfigured. */
export const readSession = async (): Promise<Session | undefined> => {
  if (env.SESSION_SECRET === undefined) return undefined;
  const jar = await cookies();
  const sealed = jar.get(SESSION_COOKIE);
  if (sealed === undefined) return undefined;
  return unsealSession(sealed.value, env.SESSION_SECRET);
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export const oauthCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
} as const;
