import { z } from "zod";

import { DEFAULT_VIDEO_MODEL } from "@/lib/env";

// fal queue REST API (https://fal.ai/docs — queue endpoints), used directly
// over fetch: submit a generation, poll its status, fetch the result. No SDK
// so every response is parsed into a named type at this boundary.

const QUEUE_BASE = "https://queue.fal.run";

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
};

/**
 * The default model is tuned for a 9:16 reel clip; an operator-overridden
 * model gets only the prompt since input schemas differ per model.
 */
const buildInput = (model: string, prompt: string): VideoInput => {
  const input: VideoInput = { prompt };
  if (model === DEFAULT_VIDEO_MODEL) {
    input.duration = 5;
    input.resolution = "768P";
    input.aspect_ratio = "9:16";
    input.prompt_expansion_mode = "balanced";
  }
  return input;
};

export const submitVideoJob = async (
  falKey: string,
  model: string,
  prompt: string,
): Promise<string> => {
  const response = await fetch(`${QUEUE_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify(buildInput(model, prompt)),
  });
  if (!response.ok) throw await errorFromResponse(response);
  return submitResponseSchema.parse(await response.json()).request_id;
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
): Promise<VideoJob> => {
  const requestId = await submitVideoJob(falKey, model, prompt);
  const deadline = Date.now() + deadlineMs;
  let job: VideoJob = { status: "queued", requestId };
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    job = await getVideoJob(falKey, model, requestId);
    if (job.status === "done") return job;
  }
  return job;
};
