import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { recordingRequestSchema } from "@/lib/api-contract";
import { addChunk } from "@/lib/recordings";
import { errorResponse, readBody, requireOwner } from "@/lib/route";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

// A chunk the owner's browser has finished uploading, now on the record.
// The file must be in the station's own store: a URL anywhere else would let
// a replay play whatever someone pointed it at.

const inOwnStore = (url: string): boolean => {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const owner = await requireOwner();
  if ("refused" in owner) return owner.refused;
  const body = await readBody(request, recordingRequestSchema, "Not a recording chunk");
  if ("refused" in body) return body.refused;
  if (!inOwnStore(body.data.url)) return errorResponse(400, "Not in the station's store");
  // Only CH 01 records — the owner's other channels never do — so the chunk
  // is the public channel's whatever state its source is in, the test stream
  // included; nothing about the source needs resolving to keep it.
  if (body.data.sourceId !== OWNER_SOURCE_ID) return errorResponse(403, "Only CH 01 records");
  const { sourceId: _sourceId, ...chunk } = body.data;
  await addChunk({ channelKey: OWNER_SOURCE_ID, ...chunk });
  return NextResponse.json({ ok: true });
};
