import { revalidateTag } from "next/cache";
import { connection } from "next/server";
import * as z from "zod/mini";

import { posterOf } from "@/lib/poster";
import { runSchema } from "@/lib/runs";
import { BOARD_TAG, canPost, saveRun, standings } from "@/lib/standings";

// Live, never prerendered: the pane's [Leaderboard] prints what is there now.
export const GET = async () => {
  await connection();
  return Response.json(await standings());
};

export const POST = async (request: Request) => {
  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const poster = posterOf(request.headers);
  if (!(await canPost(poster))) {
    return Response.json({ error: "too many runs posted; try again later" }, { status: 429 });
  }
  const rank = await saveRun(parsed.data, poster);
  revalidateTag(BOARD_TAG, { expire: 0 });
  return Response.json({ rank }, { status: 201 });
};
