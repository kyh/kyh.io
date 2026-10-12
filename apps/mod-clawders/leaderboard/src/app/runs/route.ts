import * as z from "zod/mini";

import { posterOf } from "@/lib/poster";
import { runSchema } from "@/lib/runs";
import { canPost, saveRun, standings } from "@/lib/standings";

export const GET = async () => Response.json(await standings());

export const POST = async (request: Request) => {
  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const poster = posterOf(request.headers);
  if (!(await canPost(poster))) {
    return Response.json({ error: "too many runs posted; try again later" }, { status: 429 });
  }
  return Response.json({ rank: await saveRun(parsed.data, poster) }, { status: 201 });
};
