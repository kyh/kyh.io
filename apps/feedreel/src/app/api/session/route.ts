import { NextResponse } from "next/server";

import type { SessionPayload, UserSummary } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { env, missingEnvKeys } from "@/lib/env";

export const GET = async (): Promise<NextResponse> => {
  const session = await getSession();
  let user: UserSummary | null = null;
  if (session !== null) {
    user = {
      name: session.user.name,
      username: session.user.username ?? session.user.name,
    };
    if (session.user.image !== null && session.user.image !== undefined) {
      user.profileImageUrl = session.user.image;
    }
  }
  const ownerHandle = env.OWNER_X_USERNAME ?? null;
  const payload: SessionPayload = {
    missingKeys: missingEnvKeys(),
    user,
    ownerHandle,
    viewerIsOwner:
      user !== null &&
      ownerHandle !== null &&
      user.username.toLowerCase() === ownerHandle.toLowerCase(),
  };
  return NextResponse.json(payload);
};
