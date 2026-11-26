import { auth } from "@/lib/auth";

export const googleAccessToken = async (accountId: string, userId: string) => {
  const tokens =
    auth === undefined
      ? null
      : await auth.api.getAccessToken({ body: { accountId, userId } }).catch(() => null);

  return tokens?.accessToken;
};
