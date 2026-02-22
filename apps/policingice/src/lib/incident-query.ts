import { cacheLife, cacheTag } from "next/cache";
import { desc, sql } from "drizzle-orm";

import { db } from "@/db/index";
import { incidents } from "@/db/schema";

export async function getIncidents(data: {
  offset?: number;
  limit?: number;
}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("incidents");
  const limit = data.limit ?? 10;
  const offset = data.offset ?? 0;
  const results = await db.query.incidents.findMany({
    with: { videos: true },
    where: (
      incidents,
      { and: andOp, eq: eqOp, isNull: isNullOp, lt: ltOp },
    ) =>
      andOp(
        eqOp(incidents.status, "approved"),
        isNullOp(incidents.deletedAt),
        ltOp(incidents.reportCount, 3),
      ),
    orderBy: [
      desc(incidents.pinned),
      desc(sql`IFNULL(${incidents.incidentDate}, 9999999999)`),
      desc(incidents.id),
    ],
    limit: limit + 1,
    offset,
  });
  const hasMore = results.length > limit;
  return {
    incidents: results.slice(0, limit),
    nextOffset: hasMore ? offset + limit : undefined,
  };
}
