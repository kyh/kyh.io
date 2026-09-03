import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, ProgramsPayload } from "@/lib/api-contract";
import { hideRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { listChannelPrograms, setProgramHidden } from "@/lib/channel";
import { resolveSource } from "@/lib/lineup";

// What has aired on a channel, and whether it still does. Anyone may look at
// the public channel's history; only the account whose source a channel is may
// take something off the air.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const sourceId = request.nextUrl.searchParams.get("sourceId");
  if (sourceId === null) return errorResponse(400, "Expected ?sourceId=");
  const source = await resolveSource(sourceId, await getSession());
  if (source === undefined) return errorResponse(404, "No such channel");
  const payload: ProgramsPayload = {
    programs: await listChannelPrograms(source.channelKey),
    editable: source.editable,
  };
  return NextResponse.json(payload);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = hideRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { sourceId: string, itemId: string, hidden: boolean }");
  }
  const source = await resolveSource(body.data.sourceId, await getSession());
  if (source === undefined || !source.editable) {
    return errorResponse(403, "Only the channel's own account can change what airs");
  }
  await setProgramHidden(source.channelKey, body.data.itemId, body.data.hidden);
  return NextResponse.json({ ok: true });
};
