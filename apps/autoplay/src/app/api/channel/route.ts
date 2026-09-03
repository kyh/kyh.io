import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload } from "@/lib/api-contract";
import { channelRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { nextChannelClip } from "@/lib/channel";
import type { ChannelViewer } from "@/lib/channel";
import { resolveSource } from "@/lib/lineup";

// Only a channel's first-ever program waits on generation; everything after
// is served from the archive while the next clip generates ahead.
export const maxDuration = 60;

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const receivedAt = Date.now();
  const body = channelRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { sourceId: string, exclude: string[] }");
  }

  const session = await getSession();
  const source = await resolveSource(body.data.sourceId, session);
  if (source === undefined) {
    return errorResponse(
      session === null ? 401 : 404,
      session === null ? "Sign in with X to watch your own channels" : "No such channel",
    );
  }

  // Generation happens only for the viewer whose source this is — everyone
  // else replays the archive, so visitors can't spend money.
  const viewer: ChannelViewer = { channelKey: source.channelKey };
  if (source.access !== undefined) viewer.access = source.access;
  if (source.noAccessReason !== undefined) viewer.noAccessReason = source.noAccessReason;

  const result = await nextChannelClip(viewer, body.data.exclude, receivedAt);
  return NextResponse.json(result);
};
