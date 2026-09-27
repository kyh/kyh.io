"use cache";

import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db/drizzle-client";

const siteUrl = "https://www.policingice.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  cacheLife("hours");
  cacheTag("incidents");

  const approvedIncidents = await db.query.incidents.findMany({
    columns: { createdAt: true, id: true },
    orderBy: { createdAt: "desc" },
    where: { deletedAt: { isNull: true }, reportCount: { lt: 3 }, status: "approved" },
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      changeFrequency: "daily",
      priority: 1,
      url: siteUrl,
    },
  ];

  const incidentPages: MetadataRoute.Sitemap = approvedIncidents.map((incident) => ({
    changeFrequency: "weekly" as const,
    lastModified: incident.createdAt ? new Date(incident.createdAt) : undefined,
    priority: 0.8,
    url: `${siteUrl}/incident/${incident.id}`,
  }));

  return [...staticPages, ...incidentPages];
}
