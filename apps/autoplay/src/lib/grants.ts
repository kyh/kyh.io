import { auth } from "@/lib/auth";

export const googleAccessToken = async (accountId: string, userId: string) => {
  if (auth === undefined) {
    return;
  }

  const tokens = await auth.api.getAccessToken({ body: { accountId, userId } }).catch(() => null);

  return tokens?.accessToken ?? undefined;
};
