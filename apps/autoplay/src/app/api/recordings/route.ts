import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { recordingRequestSchema } from "@/lib/api-contract";
import { addChunk } from "@/lib/recordings";
import { errorResponse, readBody, requireOwner } from "@/lib/route";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

// WARNING: only the station's own Blob store; any other URL lets a replay play whatever someone points it at.
const inOwnStore = (url: string) => {
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
};

export const POST = async (request: NextRequest) => {
  const owner = await requireOwner();

  if ("refused" in owner) {
    return owner.refused;
  }

  const body = await readBody(request, recordingRequestSchema, "Not a recording chunk");

  if ("refused" in body) {
    return body.refused;
  }

  if (!inOwnStore(body.data.url)) {
    return errorResponse(400, "Not in the station's store");
  }

  if (body.data.sourceId !== OWNER_SOURCE_ID) {
    return errorResponse(403, "Only CH 01 records");
  }

  const { sourceId: _sourceId, ...chunk } = body.data;
  await addChunk({ channelKey: OWNER_SOURCE_ID, ...chunk });

  return NextResponse.json({ ok: true });
};
