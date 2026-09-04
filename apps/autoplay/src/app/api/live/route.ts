import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, LivePayload } from "@/lib/api-contract";
import { liveRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { isOwnerHandle, resolveSource } from "@/lib/lineup";
import { programming } from "@/lib/live";

// The next program for a session. Only the viewer whose source a channel is
// may direct it — the session is what costs money — and each program handed
// out is spent on the spot and counted against the day's budgets.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = liveRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Expected { sourceId: string }");
  const session = await getSession();
  if (session === null) return errorResponse(401, "Sign in with X to go live");
  const source = await resolveSource(body.data.sourceId, session);
  if (source === undefined) return errorResponse(404, "No such channel");
  if (source.mode === "replay") return errorResponse(403, "Only the station's owner directs CH 01");
  if (source.mode === "off-air") {
    const payload: LivePayload = { kind: "off-air", reason: source.reason };
    return NextResponse.json(payload);
  }
  const viewer = { userId: session.user.id, owner: isOwnerHandle(session.user.username) };
  return NextResponse.json(await programming.nextProgram(source.channelKey, source.access, viewer));
};
