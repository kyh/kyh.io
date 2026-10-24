import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db/drizzle-client";

/** An approved, visible incident, or null; shared by the page, its metadata and its card. */
export const getIncident = async (id: number) => {
  "use cache";
  cacheLife("hours");
  cacheTag("incidents", `incident-${id}`);
  const incident = await db.query.incidents.findFirst({
    where: {
      deletedAt: { isNull: true },
      id,
      reportCount: { lt: 3 },
      status: "approved",
    },
    with: { videos: true },
  });
  return incident ?? null;
};

/** A positive integer id, or null: a non-numeric one would reach the query as NaN and fail it. */
export const parseId = (id: string) => {
  const incidentId = Number(id);
  return Number.isSafeInteger(incidentId) && incidentId > 0 ? incidentId : null;
};
