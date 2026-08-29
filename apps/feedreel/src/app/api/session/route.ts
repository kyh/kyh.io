import { NextResponse } from "next/server";

import type { SessionPayload, UserSummary } from "@/lib/api-contract";
import { missingEnvKeys } from "@/lib/env";
import { readSession } from "@/lib/session";

export const GET = async (): Promise<NextResponse> => {
  const session = await readSession();
  let user: UserSummary | null = null;
  if (session !== undefined) {
    user = { name: session.name, username: session.username };
    if (session.profileImageUrl !== undefined) user.profileImageUrl = session.profileImageUrl;
  }
  const payload: SessionPayload = { missingKeys: missingEnvKeys(), user };
  return NextResponse.json(payload);
};
