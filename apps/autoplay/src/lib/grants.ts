import { auth } from "@/lib/auth";

// Google grants are read through better-auth, which refreshes an expired
// access token itself and stores the new one. X keeps its own path in
// x-account.ts: its refresh needs the confidential-client basic auth that
// predates this, and it is proven.

export const googleAccessToken = async (
  accountId: string,
  userId: string,
): Promise<string | undefined> => {
  if (auth === undefined) return undefined;
  try {
    const tokens = await auth.api.getAccessToken({ body: { accountId, userId } });
    return tokens.accessToken ?? undefined;
  } catch {
    return undefined;
  }
};
