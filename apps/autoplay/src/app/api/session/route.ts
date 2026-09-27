import { NextResponse } from "next/server";

import type { SessionPayload } from "@/lib/api-contract";
import { auth, getSession } from "@/lib/auth";
import {
  env,
  googleConfigured,
  googleOpenToAll,
  missingEnvKeys,
  recordingConfigured,
} from "@/lib/env";
import { ensureSources, isOwnerHandle, listChannels } from "@/lib/lineup";

// Who is watching and what they can tune to. Loading a session is also when
// the lineup catches up with the grants the user holds: a Google consent that
// landed a minute ago becomes a channel here, with no further step.

const googleFor = (owner: boolean): SessionPayload["google"] => {
  if (!googleConfigured) {
    return "unconfigured";
  }
  return googleOpenToAll || owner ? "ready" : "owner-only";
};

export const GET = async (): Promise<NextResponse> => {
  const session = await getSession();
  if (session !== null) {
    await ensureSources(session);
  }
  const owner = session !== null && isOwnerHandle(session.user.username);
  const payload: SessionPayload = {
    channels: await listChannels(session),
    google: googleFor(owner),
    liveReady: env.FAL_KEY !== undefined,
    // better-auth exists only with the X app, a secret and the database to keep users in.
    loginReady: auth !== undefined,
    missingKeys: missingEnvKeys(),
    recordReady: recordingConfigured,
    user:
      session === null
        ? null
        : {
            name: session.user.name,
            profileImageUrl: session.user.image ?? undefined,
            username: session.user.username ?? session.user.name,
          },
  };
  return NextResponse.json(payload);
};
