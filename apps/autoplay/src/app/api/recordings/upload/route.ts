import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { MAX_CHUNK_BYTES } from "@/lib/recordings";
import { errorResponse, requireOwner } from "@/lib/route";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

// Mints the token the owner's browser uploads a recorded chunk with. Only
// the owner, only webm, only a chunk's worth of bytes, only under the
// channel's own prefix: the token is the whole of what the browser may do to
// the store.

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const owner = await requireOwner();
  if ("refused" in owner) return owner.refused;
  // The event is the SDK's own protocol; handleUpload validates it and
  // rejects anything that is not one of its two message types.
  const body: HandleUploadBody = await request.json();
  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`recordings/${OWNER_SOURCE_ID}/`)) {
          throw new Error("Not a recording path");
        }
        return {
          allowedContentTypes: ["video/webm"],
          maximumSizeInBytes: MAX_CHUNK_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "Upload refused");
  }
};
