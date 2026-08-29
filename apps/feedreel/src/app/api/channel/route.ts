import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload } from "@/lib/api-contract";
import { channelRequestSchema } from "@/lib/api-contract";
import { authConfigFor } from "@/lib/auth-config";
import { nextChannelClip } from "@/lib/channel";
import type { ChannelViewer } from "@/lib/channel";
import { env } from "@/lib/env";
import { SESSION_COOKIE, readSession, sealSession, sessionCookieOptions } from "@/lib/session";
import type { Session } from "@/lib/session";
import { refreshGrant } from "@/lib/x-api";

// Generation for the default model takes a few seconds; leave headroom for
// slower models before their job is parked as pending.
export const maxDuration = 60;

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

type ViewerSession = {
  session?: Session;
  refreshed: boolean;
};

/**
 * The viewer's session with a fresh access token. A session that can't be
 * refreshed reads as logged out rather than failing the channel.
 */
const freshViewerSession = async (request: NextRequest): Promise<ViewerSession> => {
  const session = await readSession();
  if (session === undefined) return { refreshed: false };
  if (session.expiresAt > Date.now()) return { session, refreshed: false };

  const config = authConfigFor(request);
  if (config === undefined || session.refreshToken === undefined) return { refreshed: false };
  try {
    const grant = await refreshGrant(config.client, session.refreshToken);
    const next: Session = {
      ...session,
      accessToken: grant.accessToken,
      expiresAt: grant.expiresAt,
    };
    if (grant.refreshToken !== undefined) next.refreshToken = grant.refreshToken;
    return { session: next, refreshed: true };
  } catch {
    return { refreshed: false };
  }
};

const isOwner = (session: Session): boolean =>
  env.OWNER_X_USERNAME !== undefined &&
  session.username.toLowerCase() === env.OWNER_X_USERNAME.toLowerCase();

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = channelRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { exclude: string[], personal: boolean }");
  }

  const { session, refreshed } = await freshViewerSession(request);

  let viewer: ChannelViewer;
  if (body.data.personal) {
    if (session === undefined) {
      return errorResponse(401, "Log in with X to watch your own channel");
    }
    viewer = {
      channelKey: `u:${session.userId}`,
      generator: { accessToken: session.accessToken, userId: session.userId },
    };
  } else {
    // The public channel: only its owner's watching mints new clips —
    // everyone else replays the archive, so visitors can't spend money.
    viewer = { channelKey: "owner" };
    if (session !== undefined && isOwner(session)) {
      viewer.generator = { accessToken: session.accessToken, userId: session.userId };
    }
  }

  const result = await nextChannelClip(viewer, body.data.exclude);
  const response = NextResponse.json(result);
  if (refreshed && session !== undefined) {
    const config = authConfigFor(request);
    if (config !== undefined) {
      response.cookies.set(
        SESSION_COOKIE,
        sealSession(session, config.sessionSecret),
        sessionCookieOptions,
      );
    }
  }
  return response;
};
