import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { LivePayload } from "@/lib/api-contract";
import { liveRequestSchema } from "@/lib/api-contract";
import { budgetViewerOf, resolveSource } from "@/lib/lineup";
import { programming } from "@/lib/live";
import { errorResponse, readBody, requireSession } from "@/lib/route";

export const POST = async (request: NextRequest) => {
  const body = await readBody(
    request,
    liveRequestSchema,
    "Expected { sourceId: string, opening: boolean }",
  );

  if ("refused" in body) {
    return body.refused;
  }

  const viewer = await requireSession("Sign in with X to go live");

  if ("refused" in viewer) {
    return viewer.refused;
  }

  const source = await resolveSource(body.data.sourceId, viewer.session);

  if (source === undefined) {
    return errorResponse(404, "No such channel");
  }

  if (source.mode === "replay") {
    return errorResponse(403, "Only the station's owner directs CH 01");
  }

  if (source.mode === "off-air") {
    const payload: LivePayload = { kind: "off-air", reason: source.reason };

    return NextResponse.json(payload);
  }

  return NextResponse.json(
    await programming.nextProgram(
      source.channelKey,
      source.access,
      budgetViewerOf(viewer.session),
      body.data.opening,
    ),
  );
};
