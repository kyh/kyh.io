import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { desc, sql } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { incidents } from "@/db/drizzle-schema";

import { IncidentDetail } from "./incident-detail";

const getIncident = async (id: number) => {
  "use cache";
  cacheLife("hours");
  cacheTag("incidents", `incident-${id}`);
  const incident = await db.query.incidents.findFirst({
    where: (inc, { and, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
      and(
        eqOp(inc.id, id),
        eqOp(inc.status, "approved"),
        isNullOp(inc.deletedAt),
        ltOp(inc.reportCount, 3),
      ),
    with: { videos: true },
  });
  return incident ?? null;
};

export const generateStaticParams = async () => {
  const rows = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(
      sql`${incidents.status} = 'approved' AND ${incidents.deletedAt} IS NULL AND ${incidents.reportCount} < 3`,
    )
    .orderBy(desc(incidents.createdAt))
    .limit(100);
  return rows.map((row) => ({ id: String(row.id) }));
};

const IncidentPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const incident = await getIncident(Math.trunc(Number(id)));
  if (!incident) {
    notFound();
  }

  return <IncidentDetail incident={incident} />;
};

export default IncidentPage;
