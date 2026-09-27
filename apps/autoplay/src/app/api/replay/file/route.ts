import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ReplayFilePayload } from "@/lib/api-contract";
import { replayFileRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { isOwnerHandle, resolveSource } from "@/lib/lineup";
import { sessionFile } from "@/lib/recordings";
import { errorResponse, readBody } from "@/lib/route";

// A finished session as one file, for anyone who may watch the channel: built
// from its chunks the first time it is asked for, then handed over as is. The
// owner's recorder asks the moment its last chunk is in; a viewer asking
// while the session may still be recording is told to wait.

/** A long session is a few hundred megabytes fetched and put back. */
export const maxDuration = 300;

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = await readBody(
    request,
    replayFileRequestSchema,
    "Expected { sourceId: string, sessionId: string }",
  );
  if ("refused" in body) {
    return body.refused;
  }
  const session = await getSession();
  const source = await resolveSource(body.data.sourceId, session);
  if (source === undefined) {
    return errorResponse(404, "No such channel");
  }
  const owner = session !== null && isOwnerHandle(session.user.username);
  const file = await sessionFile(source.channelKey, body.data.sessionId, owner);
  if ("refused" in file) {
    return file.refused === "on-air"
      ? errorResponse(409, "Still recording — the file comes when the session ends")
      : errorResponse(404, "No such session");
  }
  const payload: ReplayFilePayload = { url: file.url };
  return NextResponse.json(payload);
};
