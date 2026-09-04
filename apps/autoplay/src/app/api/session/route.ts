import { NextResponse } from "next/server";

import type { SessionPayload, UserSummary } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { env, googleConfigured, missingEnvKeys } from "@/lib/env";
import { ensureSources, listChannels } from "@/lib/lineup";

// Who is watching and what they can tune to. Loading a session is also when
// the lineup catches up with the grants the user holds: a Google consent that
// landed a minute ago becomes a channel here, with no further step.

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
    await ensureSources(session);
  }
  const payload: SessionPayload = {
    missingKeys: missingEnvKeys(),
    user,
    channels: await listChannels(session),
    googleReady: googleConfigured,
    liveReady: env.FAL_KEY !== undefined,
  };
  return NextResponse.json(payload);
};
