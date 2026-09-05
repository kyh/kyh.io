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

import { getSession } from "@/lib/auth";
import { isOwnerHandle } from "@/lib/lineup";
import { programming } from "@/lib/live";
import type { Viewer } from "@/lib/live";

// The browser's way to fal, for the director session: the key stays here, and
// only a signed-in viewer inside the day's budget may open anything — checked
// before negotiation, because a session is billed for a minute the moment it
// exists. The endpoint allowlist stops a viewer running some other model on
// the station's key; the proxy checks it against the app id of every session
// it negotiates, not only the URL.
//
// It is also the meter. The transport opens a session with one call and
// heartbeats it every few seconds, all through here: the answer to the first
// carries fal's id for the session and the heartbeats carry it back, so the
// session's opening and its last sign of life are recorded as they pass — the
// budgets in src/lib/live.ts are counted from nothing else. Once a viewer is
// past their cap by more than the grace, their heartbeats are refused and the
// transport gives the session up.

export const DIRECTOR_MODEL = "minimax/h3-max/director";
const SESSION_URL = "https://wma.fal.run/session";
const HEARTBEAT_URL = "https://wma.fal.run/session/heartbeat";

const sessionAnswerSchema = z.object({ session_id: z.string() });
const heartbeatSchema = z.object({ session_id: z.string() });

const viewerOf = async (): Promise<Viewer | undefined> => {
  const session = await getSession();
  if (session === null) return undefined;
  return { userId: session.user.id, owner: isOwnerHandle(session.user.username) };
};

const targetOf = (getHeader: (name: string) => HeaderValue): string | undefined => {
  const value = getHeader(TARGET_URL_HEADER);
  return Array.isArray(value) ? value[0] : (value ?? undefined);
};

const config = resolveProxyConfig({
  allowUnauthorizedRequests: false,
  isAuthenticated: async (behavior) => {
    const viewer = await viewerOf();
    if (viewer === undefined) return false;
    return targetOf(behavior.getHeader) === HEARTBEAT_URL
      ? programming.mayContinue(viewer)
      : programming.mayOpen(viewer);
  },
  allowedEndpoints: [DIRECTOR_MODEL, `${DIRECTOR_MODEL}/**`],
});

const heartbeatOf = (body: string): string | undefined => {
  try {
    const beat = heartbeatSchema.safeParse(JSON.parse(body));
    return beat.success ? beat.data.session_id : undefined;
  } catch {
    return undefined;
  }
};

/** What passed through, on the record. Never in the way of the answer itself. */
const meter = async (target: string | undefined, body: string, response: Response) => {
  try {
    const viewer = await viewerOf();
    if (viewer === undefined) return;
    if (target === SESSION_URL) {
      const answer = sessionAnswerSchema.safeParse(await response.clone().json());
      if (answer.success) await programming.sessionOpened(answer.data.session_id, viewer);
    } else if (target === HEARTBEAT_URL) {
      const sessionId = heartbeatOf(body);
      if (sessionId !== undefined) await programming.sessionSeen(sessionId, viewer);
    }
  } catch (error) {
    console.error("[proxy] meter:", error);
  }
};

export const POST = async (request: NextRequest): Promise<Response> => {
  const responseHeaders = new Headers();
  const body = await request.text();
  const behavior: ProxyBehavior<Response> = {
    id: "nextjs-app-router",
    method: request.method,
    getRequestBody: async () => body,
    getHeaders: () => fromHeaders(request.headers),
    getHeader: (name) => request.headers.get(name),
    sendHeader: (name, value) => responseHeaders.set(name, value),
    respondWith: (status, data) => NextResponse.json(data, { status, headers: responseHeaders }),
    sendResponse: responsePassthrough,
  };
  const response = await handleRequest(behavior, config);
  if (response.ok) await meter(targetOf(behavior.getHeader), body, response);
  return response;
};
