import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { account } from "@/db/drizzle-schema";
import { env } from "@/lib/env";
import { refreshXToken } from "@/lib/x-api";

// The bridge between better-auth and the X API: better-auth lands the OAuth
// grant in the `account` table at sign-in; this reads it back for timeline
// calls, refreshing (and persisting) the token when it has expired.

export type XAccount = {
  accessToken: string;
  /** The X user id (the provider account id), used in timeline paths. */
  xUserId: string;
};

const EXPIRY_MARGIN_MS = 60_000;

/**
 * A usable X access token for a better-auth user, or undefined when the user
 * has no X grant or it can no longer be refreshed (sign in again).
 */
export const freshXAccount = async (userId: string): Promise<XAccount | undefined> => {
  if (db === undefined || env.X_CLIENT_ID === undefined || env.X_CLIENT_SECRET === undefined) {
    return undefined;
  }
  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "twitter")))
    .limit(1);
  const row = rows[0];
  if (row === undefined || row.accessToken === null) return undefined;

  const expiresAt = row.accessTokenExpiresAt?.getTime();
  const usable = expiresAt === undefined || expiresAt > Date.now() + EXPIRY_MARGIN_MS;
  if (usable) return { accessToken: row.accessToken, xUserId: row.accountId };
  if (row.refreshToken === null) return undefined;

  try {
    const grant = await refreshXToken(env.X_CLIENT_ID, env.X_CLIENT_SECRET, row.refreshToken);
    await db
      .update(account)
      .set({
        accessToken: grant.accessToken,
        accessTokenExpiresAt: new Date(grant.expiresAt),
        refreshToken: grant.refreshToken ?? row.refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(account.id, row.id));
    return { accessToken: grant.accessToken, xUserId: row.accountId };
  } catch {
    return undefined;
  }
};
