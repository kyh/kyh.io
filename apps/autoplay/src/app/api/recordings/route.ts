import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload } from "@/lib/api-contract";
import { recordingRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { isOwnerHandle, resolveSource } from "@/lib/lineup";
import { addChunk } from "@/lib/recordings";

// A chunk the owner's browser has finished uploading, now on the record.
// The file must be in the station's own store: a URL anywhere else would let
// a replay play whatever someone pointed it at.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

const inOwnStore = (url: string): boolean => {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const session = await getSession();
  if (session === null || !isOwnerHandle(session.user.username)) {
    return errorResponse(403, "Only the station's owner records");
  }
  const body = recordingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Not a recording chunk");
  if (!inOwnStore(body.data.url)) return errorResponse(400, "Not in the station's store");
  const source = await resolveSource(body.data.sourceId, session);
  if (source === undefined || source.mode !== "live") return errorResponse(403, "Not your channel");
  const { sourceId: _sourceId, ...chunk } = body.data;
  await addChunk({ channelKey: source.channelKey, ...chunk });
  return NextResponse.json({ ok: true });
};
