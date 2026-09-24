import { fetchSpxCsv, hasBlobStore, storeCsv } from "@/lib/spx-source";

/**
 * Daily refresh (see `vercel.json`): re-pull the history from Yahoo and
 * overwrite the stored CSV. If Yahoo fails, the previous copy stays in place.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export const GET = async (request: Request): Promise<Response> => {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasBlobStore()) {
    return Response.json({ error: "no Blob store connected" }, { status: 503 });
  }
  try {
    const { csv, rows } = await fetchSpxCsv();
    await storeCsv(csv);
    return Response.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
};
