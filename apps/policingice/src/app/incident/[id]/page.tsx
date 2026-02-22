import { notFound } from "next/navigation";

import { db } from "@/db/index";

import { IncidentDetail } from "./incident-detail";

async function getIncident(id: number) {
  const incident = await db.query.incidents.findFirst({
    with: { videos: true },
    where: (incidents, { and, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
      and(
        eqOp(incidents.id, id),
        eqOp(incidents.status, "approved"),
        isNullOp(incidents.deletedAt),
        ltOp(incidents.reportCount, 3),
      ),
  });
  return incident ?? null;
}

const IncidentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const incident = await getIncident(parseInt(id, 10));
  if (!incident) notFound();

  return <IncidentDetail incident={incident} />;
};

export default IncidentPage;
