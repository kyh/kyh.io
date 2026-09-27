import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";

import type { ErrorPayload } from "@/lib/api-contract";
import { getSession } from "@/lib/auth";
import { isOwnerHandle } from "@/lib/lineup";

// What every route does before its own work — read the body, learn who asks,
// refuse — in one shape, so a refusal reads the same from every route and the
// client has one thing to parse.

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export const errorResponse = (status: number, error: string): NextResponse => {
  const payload: ErrorPayload = { error };
  return NextResponse.json(payload, { status });
};

/** The body as `schema` reads it, or the 400 to answer with; `expected` says what a body looks like. */
export const readBody = async <T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  expected: string,
): Promise<{ data: T } | { refused: NextResponse }> => {
  const body = schema.safeParse(await request.json().catch(() => null));
  return body.success ? { data: body.data } : { refused: errorResponse(400, expected) };
};

/** The signed-in viewer, or the 401 to answer with; `why` says what signing in is for. */
export const requireSession = async (
  why: string,
): Promise<{ session: Session } | { refused: NextResponse }> => {
  const session = await getSession();
  return session === null ? { refused: errorResponse(401, why) } : { session };
};

/** The station's owner, or the 403 to answer with: the record is theirs alone. */
export const requireOwner = async (): Promise<{ session: Session } | { refused: NextResponse }> => {
  const session = await getSession();
  return session === null || !isOwnerHandle(session.user.username)
    ? { refused: errorResponse(403, "Only the station's owner records") }
    : { session };
};
