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

// Statically rendered whole, so an unknown id answers 404: with partial
// prefetching, a route that may stream starts its 200 before notFound() lands.
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

// Per-incident title, description and canonical. The card (opengraph-image.tsx
// beside this page) is text only: an incident's footage, and anyone in it, never
// becomes a preview.
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  const incidentId = parseId(id);
  const incident = incidentId === null ? null : await getIncident(incidentId);
  if (!incident) {
    return { robots: { index: false } };
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
  };
};

const IncidentPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  // A non-numeric id would reach the query as NaN and fail it: answer 404 instead.
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
      <script
        type="application/ld+json"
        // oxlint-disable-next-line react/no-danger -- the only way to emit a JSON-LD body; serializeJsonLd escapes `<`
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(incidentJsonLd(incident)) }}
      />
      <IncidentDetail incident={incident} />
    </>
  );
};

export default IncidentPage;
