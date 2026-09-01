import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import type { ErrorPayload, ProgramsPayload } from "@/lib/api-contract";
import { hideRequestSchema } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { listChannelPrograms, setProgramHidden } from "@/lib/channel";
import { env } from "@/lib/env";

// What has aired on a channel, and whether it still does. Anyone may look at
// the public channel's history; only the account whose feed a channel is may
// take something off the air.

const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

const isOwnerHandle = (username: string): boolean =>
  env.OWNER_X_USERNAME !== undefined &&
  username.toLowerCase() === env.OWNER_X_USERNAME.toLowerCase();

type Channel = {
  key: string;
  editable: boolean;
};

const resolveChannel = async (personal: boolean): Promise<Channel | undefined> => {
  const session = await getSession();
  if (personal) {
    if (session === null) return undefined;
    return { key: `u:${session.user.id}`, editable: true };
  }
  const username = session?.user.username ?? undefined;
  return {
    key: "owner",
    editable: session !== null && username !== undefined && isOwnerHandle(username),
  };
};

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const personal = request.nextUrl.searchParams.get("personal") === "true";
  const channel = await resolveChannel(personal);
  if (channel === undefined) {
    return errorResponse(401, "Sign in with X to see your own channel");
  }
  const payload: ProgramsPayload = {
    programs: await listChannelPrograms(channel.key),
    editable: channel.editable,
  };
  return NextResponse.json(payload);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const body = hideRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return errorResponse(400, "Expected { postId: string, personal: boolean, hidden: boolean }");
  }
  const channel = await resolveChannel(body.data.personal);
  if (channel === undefined || !channel.editable) {
    return errorResponse(403, "Only the channel's own account can change what airs");
  }
  await setProgramHidden(channel.key, body.data.postId, body.data.hidden);
  return NextResponse.json({ ok: true });
};
