import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, ReplayPayload } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { resolveSource } from "@/lib/lineup";
import { listSessions } from "@/lib/recordings";

// What a channel has recorded, newest session first, for anyone who may watch it.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const sourceId = request.nextUrl.searchParams.get("sourceId");
  if (sourceId === null) return errorResponse(400, "Expected ?sourceId=");
  const source = await resolveSource(sourceId, await getSession());
  if (source === undefined) return errorResponse(404, "No such channel");
  const payload: ReplayPayload = { sessions: await listSessions(source.channelKey) };
  return NextResponse.json(payload);
};
