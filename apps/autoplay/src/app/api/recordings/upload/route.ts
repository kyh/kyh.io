import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { MAX_CHUNK_BYTES } from "@/lib/recordings";
import { errorResponse, requireOwner } from "@/lib/route";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";

const blobEventSchema = z.discriminatedUnion("type", [
  z.object({
    payload: z.object({
      clientPayload: z.string().nullable(),
      multipart: z.boolean(),
      pathname: z.string(),
    }),
    type: z.literal("blob.generate-client-token"),
  }),
  z.object({
    payload: z.object({
      blob: z.object({ pathname: z.string(), url: z.string() }),
      tokenPayload: z.string().nullable().optional(),
    }),
    type: z.literal("blob.upload-completed"),
  }),
]);

const uploadBodySchema = z.custom<HandleUploadBody>(
  (value) => blobEventSchema.safeParse(value).success,
);

export const POST = async (request: NextRequest) => {
  const owner = await requireOwner();

  if ("refused" in owner) {
    return owner.refused;
  }

  const parsed = uploadBodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return errorResponse(400, "Not an upload event");
  }

  const body = parsed.data;

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
