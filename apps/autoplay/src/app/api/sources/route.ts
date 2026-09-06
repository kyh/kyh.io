import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ChannelsPayload } from "@/lib/api-contract";
import {
  addSourceRequestSchema,
  removeSourceRequestSchema,
  reorderSourcesRequestSchema,
} from "@/lib/api-contract";
import { addRssSource, listChannels, removeSource, reorderSources } from "@/lib/lineup";
import { errorResponse, readBody, requireSession } from "@/lib/route";
import type { Session } from "@/lib/route";

// The lineup, edited. Grant-backed sources come and go with their grants (see
// /api/session); this is for the feed URL a user types in, for taking a
// channel off the lineup, and for the order they air in. Every answer is the
// lineup as it now stands.

const lineupResponse = async (session: Session): Promise<NextResponse> => {
  const payload: ChannelsPayload = { channels: await listChannels(session) };
  return NextResponse.json(payload);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const viewer = await requireSession("Sign in with X to add channels");
  if ("refused" in viewer) return viewer.refused;
  const body = await readBody(
    request,
    addSourceRequestSchema,
    "Expected { kind: 'rss', url: string }",
  );
  if ("refused" in body) return body.refused;
  try {
    await addRssSource(viewer.session, body.data.url);
  } catch (error) {
    return errorResponse(400, error instanceof Error ? error.message : "Couldn't read that feed");
  }
  return lineupResponse(viewer.session);
};

export const DELETE = async (request: NextRequest): Promise<NextResponse> => {
  const viewer = await requireSession("Sign in with X to change channels");
  if ("refused" in viewer) return viewer.refused;
  const body = await readBody(request, removeSourceRequestSchema, "Expected { sourceId: string }");
  if ("refused" in body) return body.refused;
  await removeSource(viewer.session, body.data.sourceId);
  return lineupResponse(viewer.session);
};

export const PATCH = async (request: NextRequest): Promise<NextResponse> => {
  const viewer = await requireSession("Sign in with X to change channels");
  if ("refused" in viewer) return viewer.refused;
  const body = await readBody(request, reorderSourcesRequestSchema, "Expected { order: string[] }");
  if ("refused" in body) return body.refused;
  await reorderSources(viewer.session, body.data.order);
  return lineupResponse(viewer.session);
};
