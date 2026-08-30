import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload } from "@/lib/api-contract";
import { channelRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { nextChannelClip } from "@/lib/channel";
import type { ChannelViewer } from "@/lib/channel";
import { env } from "@/lib/env";
import { freshXAccount } from "@/lib/x-account";

// Generation for the default model takes a few seconds; leave headroom for
// slower models before their job is parked as pending.
export const maxDuration = 60;

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

const isOwnerHandle = (username: string): boolean =>
  env.OWNER_X_USERNAME !== undefined &&
  username.toLowerCase() === env.OWNER_X_USERNAME.toLowerCase();

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = channelRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { exclude: string[], personal: boolean }");
  }

  const session = await getSession();

  let viewer: ChannelViewer;
  if (body.data.personal) {
    if (session === null) {
      return errorResponse(401, "Sign in with X to watch your own channel");
    }
    const xAccount = await freshXAccount(session.user.id);
    if (xAccount === undefined) {
      return errorResponse(401, "X connection expired — sign in again");
    }
    viewer = {
      channelKey: `u:${session.user.id}`,
      generator: { accessToken: xAccount.accessToken, userId: xAccount.xUserId },
    };
  } else {
    // The public channel: only its owner's watching mints new clips —
    // everyone else replays the archive, so visitors can't spend money.
    viewer = { channelKey: "owner" };
    const username = session?.user.username ?? undefined;
    if (session !== null && username !== undefined && isOwnerHandle(username)) {
      const xAccount = await freshXAccount(session.user.id);
      if (xAccount !== undefined) {
        viewer.generator = { accessToken: xAccount.accessToken, userId: xAccount.xUserId };
      }
    }
  }

  const result = await nextChannelClip(viewer, body.data.exclude);
  return NextResponse.json(result);
};
