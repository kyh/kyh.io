import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, sql } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { incidents } from "@/db/drizzle-schema";

import {
  incidentDescription,
  incidentJsonLd,
  incidentPath,
  incidentTitle,
  serializeJsonLd,
} from "@/lib/incident-seo";
import { siteName } from "@/lib/site";

import { getIncident, parseId } from "./get-incident";
import { IncidentDetail } from "./incident-detail";

export const ensureStatic = "navigation";

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

export const generateMetadata = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const incidentId = parseId(id);
  const incident = incidentId === null ? null : await getIncident(incidentId);

  if (!incident) {
    return { robots: { index: false } } satisfies Metadata;
  }

  const title = incidentTitle(incident);
  const description = incidentDescription(incident);
  const path = incidentPath(incident.id);

  return {
    alternates: { canonical: path },
    description,
    openGraph: {
      description,
      publishedTime: incident.createdAt?.toISOString(),
      siteName,
      title,
      type: "article",
      url: path,
    },
    title,
    twitter: { card: "summary_large_image", description, title },
  } satisfies Metadata;
};

const IncidentPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const incidentId = parseId(id);

  if (incidentId === null) {
    notFound();
  }

  const incident = await getIncident(incidentId);

  if (!incident) {
    notFound();
  }

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(incidentJsonLd(incident))}</script>
      <IncidentDetail incident={incident} />
    </>
  );
};

export default IncidentPage;
