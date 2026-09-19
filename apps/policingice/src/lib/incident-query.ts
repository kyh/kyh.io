import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db/drizzle-client";

export const getIncidents = async (data: { offset?: number; limit?: number }) => {
  "use cache";
  cacheLife("minutes");
  cacheTag("incidents");
  const limit = data.limit ?? 10;
  const offset = data.offset ?? 0;
  const results = await db.query.incidents.findMany({
    limit: limit + 1,
    offset,
    orderBy: (inc, { desc, sql }) => [
      desc(inc.pinned),
      desc(sql`IFNULL(${inc.incidentDate}, 9999999999)`),
      desc(inc.id),
    ],
    where: { deletedAt: { isNull: true }, reportCount: { lt: 3 }, status: "approved" },
    with: { videos: true },
  });
  const hasMore = results.length > limit;
  return {
    incidents: results.slice(0, limit),
    nextOffset: hasMore ? offset + limit : undefined,
  };
};
