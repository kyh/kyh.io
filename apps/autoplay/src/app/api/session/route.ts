import { NextResponse } from "next/server";

import type { SessionPayload } from "@/lib/api-contract";
import { auth, getSession } from "@/lib/auth";
import { env, googleConfigured, missingEnvKeys, recordingConfigured } from "@/lib/env";
import { ensureSources, listChannels } from "@/lib/lineup";

// Who is watching and what they can tune to. Loading a session is also when
// the lineup catches up with the grants the user holds: a Google consent that
// landed a minute ago becomes a channel here, with no further step.

export const GET = async (): Promise<NextResponse> => {
  const session = await getSession();
  if (session !== null) await ensureSources(session);
  const payload: SessionPayload = {
    missingKeys: missingEnvKeys(),
    user:
      session === null
        ? null
        : {
            name: session.user.name,
            username: session.user.username ?? session.user.name,
            profileImageUrl: session.user.image ?? undefined,
          },
    channels: await listChannels(session),
    // better-auth exists only with the X app, a secret and the database to keep users in.
    loginReady: auth !== undefined,
    googleReady: googleConfigured,
    liveReady: env.FAL_KEY !== undefined,
    recordReady: recordingConfigured,
  };
  return NextResponse.json(payload);
};
