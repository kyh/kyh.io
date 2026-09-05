import { auth } from "@/lib/auth";

// Google grants are read through better-auth, which refreshes an expired
// access token itself and stores the new one. X is read in x-account.ts,
// whose refresh sends the confidential-client basic auth X requires.

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
