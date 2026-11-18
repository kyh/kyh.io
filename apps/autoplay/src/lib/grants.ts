import { auth } from "@/lib/auth";

export const googleAccessToken = async (accountId: string, userId: string) => {
  if (auth === undefined) {
    return;
  }

  try {
    const tokens = await auth.api.getAccessToken({ body: { accountId, userId } });

    return tokens.accessToken ?? undefined;
  } catch {
    return;
  }
};
