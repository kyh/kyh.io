import { z } from "zod";

import { DEFAULT_VIDEO_MODEL } from "@/lib/env";

// fal queue REST API (https://fal.ai/docs — queue endpoints), used directly
// over fetch: submit a generation, poll its status, fetch the result. No SDK
// so every response is parsed into a named type at this boundary.

const QUEUE_BASE = "https://queue.fal.run";

/**
 * The image-to-video sibling of the default model, used to continue one
 * program out of the last frame of the one before it.
 */
export const CONTINUATION_VIDEO_MODEL = "minimax/h3-max/image-to-video";
/** ffmpeg utility that returns a single frame of a video as an image. */
const EXTRACT_FRAME_MODEL = "fal-ai/ffmpeg-api/extract-frame";
/** The model's ceiling. Longer clips mean fewer joins to get right. */
const MAX_CLIP_SECONDS = 15;

export class FalError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FalError";
    this.status = status;
  }
}

const falErrorSchema = z.object({
  detail: z.union([z.string(), z.array(z.object({ msg: z.string() }))]).optional(),
});

const errorFromResponse = async (response: Response): Promise<FalError> => {
  let message = `fal request failed (${response.status})`;
  try {
    const body = falErrorSchema.parse(await response.json());
    if (Array.isArray(body.detail)) {
      const first = body.detail[0];
      if (first !== undefined) message = first.msg;
    } else if (body.detail !== undefined) {
      message = body.detail;
    }
  } catch {
    // Non-JSON error body — keep the status message.
  }
  return new FalError(response.status, message);
};

const submitResponseSchema = z.object({ request_id: z.string() });

const statusResponseSchema = z.object({
  status: z.enum(["IN_QUEUE", "IN_PROGRESS", "COMPLETED"]),
  queue_position: z.number().optional(),
});

// Most fal text-to-video models return { video: { url } }; some return a
// `videos` list. Accept either and surface one URL.
const resultResponseSchema = z.object({
  video: z.object({ url: z.string() }).optional(),
  videos: z.array(z.object({ url: z.string() })).optional(),
});

export type VideoJobStatus = "queued" | "generating" | "done";

export type VideoJob = {
  status: VideoJobStatus;
  requestId: string;
  queuePosition?: number;
  videoUrl?: string;
};

type VideoInput = {
  prompt: string;
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  prompt_expansion_mode?: string;
  /** First frame, for the image-to-video sibling of the default model. */
  image_url?: string;
};

/**
 * The default model is tuned for a 16:9 TV-style clip; an operator-overridden
 * model gets only the prompt since input schemas differ per model.
 *
 * `seedImageUrl` switches the request to the continuation model, whose input
 * takes a first frame and — per its schema — has no aspect_ratio, since the
 * seed image already fixes the framing.
 */
const buildInput = (model: string, prompt: string, seedImageUrl?: string): VideoInput => {
  const input: VideoInput = { prompt };
  if (model !== DEFAULT_VIDEO_MODEL && model !== CONTINUATION_VIDEO_MODEL) return input;

  input.duration = MAX_CLIP_SECONDS;
  input.resolution = "768P";
  input.prompt_expansion_mode = "balanced";
  if (seedImageUrl === undefined) {
    input.aspect_ratio = "16:9";
  } else {
    input.image_url = seedImageUrl;
  }
  return input;
};

export const submitVideoJob = async (
  falKey: string,
  model: string,
  prompt: string,
  seedImageUrl?: string,
): Promise<string> => {
  const response = await fetch(`${QUEUE_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(buildInput(model, prompt, seedImageUrl)),
  });
  if (!response.ok) throw await errorFromResponse(response);
  return submitResponseSchema.parse(await response.json()).request_id;
};

const extractFrameResponseSchema = z.object({
  images: z.array(z.object({ url: z.string() })).min(1),
});

/**
 * The final frame of a clip, as an image URL.
 *
 * This is what makes one program continue into the next: hand it to the
 * continuation model as the first frame and the cut lands on an identical
 * image, so there is nothing to hide with a fade. Returns undefined rather
 * than throwing — losing continuity is a cosmetic downgrade, not a reason to
 * abandon a clip that has already been paid for.
 */
export const extractLastFrame = async (
  falKey: string,
  videoUrl: string,
  deadlineMs: number,
): Promise<string | undefined> => {
  try {
    const requestId = await (async () => {
      const response = await fetch(`${QUEUE_BASE}/${EXTRACT_FRAME_MODEL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Key ${falKey}` },
        body: JSON.stringify({ video_url: videoUrl, frame_type: "last" }),
      });
      if (!response.ok) throw await errorFromResponse(response);
      return submitResponseSchema.parse(await response.json()).request_id;
    })();

    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const statusResponse = await fetchQueueJson(
        falKey,
        EXTRACT_FRAME_MODEL,
        `${requestId}/status`,
      );
      if (!statusResponse.ok) return undefined;
      const status = statusResponseSchema.parse(await statusResponse.json());
      if (status.status !== "COMPLETED") continue;
      const resultResponse = await fetchQueueJson(falKey, EXTRACT_FRAME_MODEL, requestId);
      if (!resultResponse.ok) return undefined;
      const result = extractFrameResponseSchema.parse(await resultResponse.json());
      return result.images[0]?.url;
    }
    return undefined;
  } catch {
    return undefined;
  }
};

// Nested endpoints (owner/app/endpoint) answer status/result requests either
// on the full path or on the owner/app root depending on how the app is
// deployed — try the full path first, then the root.
const queueScopes = (model: string): string[] => {
  const segments = model.split("/");
  const root = segments.slice(0, 2).join("/");
  return root === model ? [model] : [model, root];
};

const fetchQueueJson = async (falKey: string, model: string, suffix: string): Promise<Response> => {
  let lastResponse: Response | undefined;
  for (const scope of queueScopes(model)) {
    const response = await fetch(`${QUEUE_BASE}/${scope}/requests/${suffix}`, {
      headers: { Authorization: `Key ${falKey}` },
    });
    if (response.status !== 404 && response.status !== 405) return response;
    lastResponse = response;
  }
  if (lastResponse === undefined) throw new FalError(500, "fal queue lookup failed");
  return lastResponse;
};

export const getVideoJob = async (
  falKey: string,
  model: string,
  requestId: string,
): Promise<VideoJob> => {
  const statusResponse = await fetchQueueJson(falKey, model, `${requestId}/status`);
  if (!statusResponse.ok) throw await errorFromResponse(statusResponse);
  const status = statusResponseSchema.parse(await statusResponse.json());

  if (status.status !== "COMPLETED") {
    const job: VideoJob = {
      status: status.status === "IN_QUEUE" ? "queued" : "generating",
      requestId,
    };
    if (status.queue_position !== undefined) job.queuePosition = status.queue_position;
    return job;
  }

  const resultResponse = await fetchQueueJson(falKey, model, requestId);
  if (!resultResponse.ok) throw await errorFromResponse(resultResponse);
  const result = resultResponseSchema.parse(await resultResponse.json());
  const videoUrl = result.video?.url ?? result.videos?.[0]?.url;
  if (videoUrl === undefined) {
    throw new FalError(502, "fal result contained no video URL");
  }
  return { status: "done", requestId, videoUrl };
};

const POLL_INTERVAL_MS = 1_000;

/**
 * Submit and poll until done or the deadline passes. The default model
 * finishes in a few seconds so the caller usually gets the finished job in
 * one round trip; slower models return a pending job for client polling.
 */
export const generateVideo = async (
  falKey: string,
  model: string,
  prompt: string,
  deadlineMs: number,
  seedImageUrl?: string,
): Promise<VideoJob> => {
  const requestId = await submitVideoJob(falKey, model, prompt, seedImageUrl);
  const deadline = Date.now() + deadlineMs;
  let job: VideoJob = { status: "queued", requestId };
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    job = await getVideoJob(falKey, model, requestId);
    if (job.status === "done") return job;
  }
  return job;
};
