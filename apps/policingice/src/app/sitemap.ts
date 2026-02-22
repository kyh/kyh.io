"use cache";

import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { desc } from "drizzle-orm";

import { db } from "@/db/index";

const siteUrl = "https://policingice.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  cacheLife("hours");
  cacheTag("incidents");

  const approvedIncidents = await db.query.incidents.findMany({
    where: (incidents, { and, eq: eqOp, isNull: isNullOp, lt: ltOp }) =>
      and(
        eqOp(incidents.status, "approved"),
        isNullOp(incidents.deletedAt),
        ltOp(incidents.reportCount, 3),
      ),
    orderBy: (incidents) => [desc(incidents.createdAt)],
    columns: { id: true, createdAt: true },
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  const incidentPages: MetadataRoute.Sitemap = approvedIncidents.map(
    (incident) => ({
      url: `${siteUrl}/incident/${incident.id}`,
      lastModified: incident.createdAt
        ? new Date(incident.createdAt)
        : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }),
  );

  return [...staticPages, ...incidentPages];
}
