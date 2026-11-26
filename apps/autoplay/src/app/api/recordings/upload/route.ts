import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { MAX_CHUNK_BYTES } from "@/lib/recordings";
import { errorResponse, requireOwner } from "@/lib/route";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

export const POST = async (request: NextRequest) => {
  const owner = await requireOwner();

  if ("refused" in owner) {
    return owner.refused;
  }

  const body: HandleUploadBody = await request.json();

  try {
    const result = await handleUpload({
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`recordings/${OWNER_SOURCE_ID}/`)) {
          throw new Error("Not a recording path");
        }

        return await Promise.resolve({
          addRandomSuffix: true,
          allowedContentTypes: ["video/webm"],
          maximumSizeInBytes: MAX_CHUNK_BYTES,
        });
      },
      request,
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "Upload refused");
  }
};
