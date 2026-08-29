import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, GeneratePayload } from "@/lib/api-contract";
import { generateRequestSchema } from "@/lib/api-contract";
import { env, videoModel } from "@/lib/env";
import { FalError, generateVideo, getVideoJob } from "@/lib/fal";
import type { VideoJob } from "@/lib/fal";
import { readSession } from "@/lib/session";

// The default model needs a few seconds; leave headroom for slower models
// before falling back to client-side polling via GET.
export const maxDuration = 60;

const SERVER_POLL_BUDGET_MS = 45_000;

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

const toPayload = (job: VideoJob): GeneratePayload => {
  const payload: GeneratePayload = { status: job.status, requestId: job.requestId };
  if (job.queuePosition !== undefined) payload.queuePosition = job.queuePosition;
  if (job.videoUrl !== undefined) payload.videoUrl = job.videoUrl;
  return payload;
};

const guardedFalKey = async (): Promise<string | NextResponse> => {
  // Generation spends real money — never serve it to logged-out visitors.
  const session = await readSession();
  if (session === undefined) return errorResponse(401, "Not logged in");
  if (env.FAL_KEY === undefined) {
    return errorResponse(503, "Video generation is not configured — set FAL_KEY");
  }
  return env.FAL_KEY;
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const falKey = await guardedFalKey();
  if (falKey instanceof NextResponse) return falKey;

  const body = generateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { prompt: string } with 1-2000 characters");
  }

  try {
    const job = await generateVideo(falKey, videoModel, body.data.prompt, SERVER_POLL_BUDGET_MS);
    return NextResponse.json(toPayload(job));
  } catch (error) {
    const message = error instanceof FalError ? error.message : "Video generation failed";
    return errorResponse(502, message);
  }
};

const REQUEST_ID_PATTERN = /^[\w-]{1,128}$/;

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const falKey = await guardedFalKey();
  if (falKey instanceof NextResponse) return falKey;

  const requestId = request.nextUrl.searchParams.get("requestId");
  if (requestId === null || !REQUEST_ID_PATTERN.test(requestId)) {
    return errorResponse(400, "Expected a requestId query parameter");
  }

  try {
    const job = await getVideoJob(falKey, videoModel, requestId);
    return NextResponse.json(toPayload(job));
  } catch (error) {
    const message = error instanceof FalError ? error.message : "Video status check failed";
    return errorResponse(502, message);
  }
};
