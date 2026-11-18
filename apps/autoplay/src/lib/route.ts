import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";

import type { ErrorPayload } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { isOwnerHandle } from "@/lib/lineup";

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const errorResponse = (status: number, error: string) => {
  const payload: ErrorPayload = { error };

  return NextResponse.json(payload, { status });
};

/** The body as `schema` reads it, or the 400 to answer with; `expected` says what a body looks like. */
export const readBody = async <T>(request: NextRequest, schema: z.ZodType<T>, expected: string) => {
  const body = schema.safeParse(await request.json().catch(() => null));

  return (body.success ? { data: body.data } : { refused: errorResponse(400, expected) }) satisfies
    | { data: T }
    | { refused: NextResponse };
};

/** The signed-in viewer, or the 401 to answer with; `why` says what signing in is for. */
export const requireSession = async (why: string) => {
  const session = await getSession();

  return (session === null ? { refused: errorResponse(401, why) } : { session }) satisfies
    | { session: Session }
    | { refused: NextResponse };
};

/** The station's owner, or the 403 to answer with: the record is theirs alone. */
export const requireOwner = async () => {
  const session = await getSession();

  return (
    session === null || !isOwnerHandle(session.user.username)
      ? { refused: errorResponse(403, "Only the station's owner records") }
      : { session }
  ) satisfies { session: Session } | { refused: NextResponse };
};
