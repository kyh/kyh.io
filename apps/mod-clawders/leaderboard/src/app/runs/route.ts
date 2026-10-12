import * as z from "zod/mini";

import { runSchema } from "@/lib/runs";
import { saveRun, standings } from "@/lib/standings";

export const GET = async () => Response.json(await standings());

export const POST = async (request: Request) => {
  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  return Response.json({ rank: await saveRun(parsed.data) }, { status: 201 });
};
