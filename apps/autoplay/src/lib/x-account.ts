import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { account } from "@/db/drizzle-schema";
import { env } from "@/lib/env";
import { refreshXToken } from "@/lib/x-api";

interface XAccount {
  accessToken: string;
  /** The X user id (the provider account id), used in timeline paths. */
  xUserId: string;
}

const EXPIRY_MARGIN_MS = 60_000;

/**
 * A usable X access token for a better-auth user, or undefined when the user
 * has no X grant or it can no longer be refreshed (sign in again).
 */
export const freshXAccount = async (userId: string) => {
  if (db === undefined || env.X_CLIENT_ID === undefined || env.X_CLIENT_SECRET === undefined) {
    return;
  }

  const rows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "twitter")))
    .limit(1);

  const [row] = rows;

  if (row === undefined || row.accessToken === null) {
    return;
  }

  const expiresAt = row.accessTokenExpiresAt?.getTime();
  const usable = expiresAt === undefined || expiresAt > Date.now() + EXPIRY_MARGIN_MS;

  if (usable) {
    return { accessToken: row.accessToken, xUserId: row.accountId };
  }

  if (row.refreshToken === null) {
    return;
  }

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
    return;
  }
};
