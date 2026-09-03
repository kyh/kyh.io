import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ChannelsPayload, ErrorPayload } from "@/lib/api-contract";
import {
  addSourceRequestSchema,
  removeSourceRequestSchema,
  reorderSourcesRequestSchema,
} from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { addRssSource, listChannels, removeSource, reorderSources } from "@/lib/lineup";

// The lineup, edited. Grant-backed sources come and go with their grants (see
// /api/session); this is for the feed URL a user types in, for taking a
// channel off the lineup, and for the order they air in. Every answer is the
// lineup as it now stands.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

const lineupResponse = async (
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
): Promise<NextResponse> => {
  const payload: ChannelsPayload = { channels: await listChannels(session) };
  return NextResponse.json(payload);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const session = await getSession();
  if (session === null) return errorResponse(401, "Sign in with X to add channels");
  const body = addSourceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Expected { kind: 'rss', url: string }");
  try {
    await addRssSource(session, body.data.url);
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "Couldn't read that feed");
  }
  return lineupResponse(session);
};

export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
  const session = await getSession();
  if (session === null) return errorResponse(401, "Sign in with X to change channels");
  const body = removeSourceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Expected { sourceId: string }");
  await removeSource(session, body.data.sourceId);
  return lineupResponse(session);
};

export const PATCH = async (request: NextRequest): Promise<NextResponse> => {
  const session = await getSession();
  if (session === null) return errorResponse(401, "Sign in with X to change channels");
  const body = reorderSourcesRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(400, "Expected { order: string[] }");
  await reorderSources(session, body.data.order);
  return lineupResponse(session);
};
