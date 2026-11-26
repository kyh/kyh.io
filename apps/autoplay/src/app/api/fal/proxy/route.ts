import {
  TARGET_URL_HEADER,
  fromHeaders,
  handleRequest,
  resolveProxyConfig,
  responsePassthrough,
} from "@fal-ai/server-proxy";
import type { HeaderValue, ProxyBehavior } from "@fal-ai/server-proxy";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { DIRECTOR_MODEL } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { budgetViewerOf } from "@/lib/lineup";
import { programming } from "@/lib/live";

const SESSION_URL = "https://wma.fal.run/session";
const HEARTBEAT_URL = "https://wma.fal.run/session/heartbeat";

const sessionAnswerSchema = z.object({ session_id: z.string() });
const heartbeatSchema = z.object({ session_id: z.string() });

const viewerOf = async () => {
  const session = await getSession();

  return session === null ? undefined : budgetViewerOf(session);
};

const targetOf = (getHeader: (name: string) => HeaderValue) => {
  const value = getHeader(TARGET_URL_HEADER);

  return Array.isArray(value) ? value[0] : (value ?? undefined);
};

const config = resolveProxyConfig({
  allowUnauthorizedRequests: false,
  allowedEndpoints: [DIRECTOR_MODEL, `${DIRECTOR_MODEL}/**`],
  isAuthenticated: async (behavior) => {
    const viewer = await viewerOf();

    if (viewer === undefined) {
      return false;
    }

    return targetOf(behavior.getHeader) === HEARTBEAT_URL
      ? await programming.mayContinue(viewer)
      : await programming.mayOpen(viewer);
  },
});

const heartbeatOf = (body: string) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }

  const beat = heartbeatSchema.safeParse(parsed);

  return beat.success ? beat.data.session_id : null;
};

const meter = async (target: string | undefined, body: string, response: Response) => {
  try {
    const viewer = await viewerOf();

    if (viewer === undefined) {
      return;
    }

    if (target === SESSION_URL) {
      const answer = sessionAnswerSchema.safeParse(await response.clone().json());

      if (answer.success) {
        await programming.sessionOpened(answer.data.session_id, viewer);
      }
    } else if (target === HEARTBEAT_URL) {
      const sessionId = heartbeatOf(body);

      if (sessionId !== null) {
        await programming.sessionSeen(sessionId, viewer);
      }
    }
  } catch (error) {
    console.error("[proxy] meter:", error);
  }
};

export const POST = async (request: NextRequest) => {
  const responseHeaders = new Headers();
  const body = await request.text();

  const behavior: ProxyBehavior<Response> = {
    getHeader: (name) => request.headers.get(name),
    getHeaders: () => fromHeaders(request.headers),
    getRequestBody: async () => await Promise.resolve(body),
    id: "nextjs-app-router",
    method: request.method,
    respondWith: (status, data) => NextResponse.json(data, { headers: responseHeaders, status }),
    sendHeader: (name, value) => {
      responseHeaders.set(name, value);
    },
    sendResponse: responsePassthrough,
  };

  const response = await handleRequest(behavior, config);

  if (response.ok) {
    await meter(targetOf(behavior.getHeader), body, response);
  }

  return response;
};
